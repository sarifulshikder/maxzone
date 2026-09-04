package service

import (
	"context"
	"errors"
	"fmt"
	"net"
	"time"

	"maxzone/internal/billing"
	"maxzone/internal/domain"
	"maxzone/internal/radius"
	"maxzone/internal/repository"
)

type BillingService interface {
	ListInvoices(ctx context.Context, status, search string, page, pageSize int) ([]domain.Invoice, int64, error)
	GetInvoice(ctx context.Context, id string) (*domain.Invoice, error)
	GenerateMonthlyInvoices(ctx context.Context, month string) (*domain.GenerateInvoicesResponse, error)
	CreateBkashPayment(ctx context.Context, invoiceID string) (*domain.BkashCreatePaymentResponse, error)
	ExecuteBkashPayment(ctx context.Context, paymentID, otp, pin string) (*domain.Payment, error)
	InitializeNagadPayment(ctx context.Context, invoiceID string) (*domain.NagadInitializePaymentResponse, error)
	VerifyNagadPayment(ctx context.Context, paymentRefID, otp, pin string) (*domain.Payment, error)
	RecordManualPayment(ctx context.Context, req domain.ManualPaymentRequest, receivedBy *string) (*domain.Payment, error)
	RequestPromiseToPay(ctx context.Context, customerID string) (*domain.PromiseToPay, error)
	GetCustomerPortalOverview(ctx context.Context, customerID string) (*domain.CustomerPortalOverviewDTO, error)
	ArtificiallyExpireCustomer(ctx context.Context, customerID string, status string) error
	ListPayments(ctx context.Context, page, pageSize int) ([]domain.Payment, int64, error)
}

type billingService struct {
	billingRepo  repository.BillingRepository
	customerRepo repository.CustomerRepository
	packageRepo  repository.PackageRepository
	routerRepo   repository.RouterRepository
	bkashDriver  billing.BkashDriver
	nagadDriver  billing.NagadDriver
}

func NewBillingService(
	billingRepo repository.BillingRepository,
	customerRepo repository.CustomerRepository,
	packageRepo repository.PackageRepository,
	routerRepo repository.RouterRepository,
) BillingService {
	return &billingService{
		billingRepo:  billingRepo,
		customerRepo: customerRepo,
		packageRepo:  packageRepo,
		routerRepo:   routerRepo,
		bkashDriver:  billing.NewSimulatedBkashDriver(),
		nagadDriver:  billing.NewSimulatedNagadDriver(),
	}
}

func (s *billingService) ListInvoices(ctx context.Context, status, search string, page, pageSize int) ([]domain.Invoice, int64, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize
	return s.billingRepo.ListInvoices(ctx, status, search, pageSize, offset)
}

func (s *billingService) GetInvoice(ctx context.Context, id string) (*domain.Invoice, error) {
	inv, err := s.billingRepo.FindInvoiceByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if inv == nil {
		return nil, errors.New("invoice not found")
	}
	return inv, nil
}

func (s *billingService) GenerateMonthlyInvoices(ctx context.Context, monthStr string) (*domain.GenerateInvoicesResponse, error) {
	refTime := time.Now()
	if monthStr != "" {
		if t, err := time.Parse("2006-01", monthStr); err == nil {
			refTime = t
		}
	}

	periodStart, periodEnd, dueDate := billing.GetBillingCycleDates(refTime)
	yearMonth := refTime.Format("200601")

	// 1. Fetch all customers
	customers, _, err := s.customerRepo.List(ctx, "", "", 10000, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch customers: %w", err)
	}

	var generated []domain.Invoice
	var totalAmount float64

	for _, c := range customers {
		detail, err := s.customerRepo.FindByID(ctx, c.ID)
		if err != nil || detail == nil || detail.ServiceAccount.ID == "" {
			continue
		}

		// Calculate price (Check if pro-rata applies for newly onboarded customers)
		pkgPrice := detail.Package.Price
		if pkgPrice <= 0 {
			pkgPrice = c.Price
		}

		// Check if customer created within this billing period
		finalAmount := pkgPrice
		if detail.Customer.CreatedAt.After(periodStart) && detail.Customer.CreatedAt.Before(periodEnd) {
			finalAmount = billing.CalculateProRata(pkgPrice, detail.Customer.CreatedAt)
		}

		seq, err := s.billingRepo.GetNextInvoiceSequence(ctx, yearMonth)
		if err != nil {
			seq = len(generated) + 1
		}
		invNumber := billing.FormatInvoiceNumber(refTime, seq)

		secAccID := detail.ServiceAccount.ID
		inv := &domain.Invoice{
			InvoiceNumber:      invNumber,
			CustomerID:         detail.Customer.ID,
			ServiceAccountID:   &secAccID,
			PackageID:          detail.Package.ID,
			Amount:             finalAmount,
			Discount:           0,
			TotalPayable:       finalAmount,
			Status:             "UNPAID",
			BillingPeriodStart: periodStart,
			BillingPeriodEnd:   periodEnd,
			DueDate:            dueDate,
		}

		if err := s.billingRepo.CreateInvoice(ctx, inv); err != nil {
			return nil, fmt.Errorf("failed to save invoice %s: %w", invNumber, err)
		}

		generated = append(generated, *inv)
		totalAmount += finalAmount
	}

	return &domain.GenerateInvoicesResponse{
		GeneratedCount: len(generated),
		TotalAmount:    totalAmount,
		Invoices:       generated,
	}, nil
}

func (s *billingService) CreateBkashPayment(ctx context.Context, invoiceID string) (*domain.BkashCreatePaymentResponse, error) {
	inv, err := s.billingRepo.FindInvoiceByID(ctx, invoiceID)
	if err != nil || inv == nil {
		return nil, errors.New("invoice not found")
	}
	if inv.Status == "PAID" {
		return nil, errors.New("invoice is already paid")
	}

	sess, err := s.bkashDriver.CreatePayment(invoiceID, inv.TotalPayable, inv.InvoiceNumber)
	if err != nil {
		return nil, err
	}

	return &domain.BkashCreatePaymentResponse{
		PaymentID:   sess.PaymentID,
		InvoiceID:   sess.InvoiceID,
		Amount:      sess.Amount,
		BkashURL:    sess.BkashURL,
		CallbackURL: sess.CallbackURL,
		IsSimulated: sess.IsSimulated,
	}, nil
}

func (s *billingService) ExecuteBkashPayment(ctx context.Context, paymentID, otp, pin string) (*domain.Payment, error) {
	res, err := s.bkashDriver.ExecutePayment(paymentID, otp, pin)
	if err != nil {
		return nil, err
	}

	// Look up invoice by payment ID session
	// For simulator, fetch the first unpaid invoice or match session
	invoices, _, err := s.billingRepo.ListInvoices(ctx, "UNPAID", "", 1, 0)
	if err != nil || len(invoices) == 0 {
		return nil, errors.New("no unpaid invoice found to apply payment")
	}
	invoice := &invoices[0]

	payment := &domain.Payment{
		InvoiceID:            invoice.ID,
		CustomerID:           invoice.CustomerID,
		Amount:               res.Amount,
		PaymentMethod:        "BKASH",
		GatewayTransactionID: &res.TransactionID,
		Status:               "COMPLETED",
	}

	extensionDays := 30
	if invoice.Package != nil && invoice.Package.ValidityDays > 0 {
		extensionDays = invoice.Package.ValidityDays
	}

	if err := s.billingRepo.RecordPaymentAndActivate(ctx, payment, invoice, extensionDays); err != nil {
		return nil, fmt.Errorf("failed to process payment: %w", err)
	}

	// Trigger CoA disconnect to refresh user session on MikroTik
	s.dispatchCoAIfPossible(ctx, invoice.CustomerID)

	return payment, nil
}

func (s *billingService) InitializeNagadPayment(ctx context.Context, invoiceID string) (*domain.NagadInitializePaymentResponse, error) {
	inv, err := s.billingRepo.FindInvoiceByID(ctx, invoiceID)
	if err != nil || inv == nil {
		return nil, errors.New("invoice not found")
	}
	if inv.Status == "PAID" {
		return nil, errors.New("invoice is already paid")
	}

	sess, err := s.nagadDriver.InitializePayment(invoiceID, inv.TotalPayable, inv.InvoiceNumber)
	if err != nil {
		return nil, err
	}

	return &domain.NagadInitializePaymentResponse{
		PaymentRefID: sess.PaymentRefID,
		InvoiceID:    sess.InvoiceID,
		Amount:       sess.Amount,
		CallbackURL:  sess.CallbackURL,
		IsSimulated:  sess.IsSimulated,
	}, nil
}

func (s *billingService) VerifyNagadPayment(ctx context.Context, paymentRefID, otp, pin string) (*domain.Payment, error) {
	res, err := s.nagadDriver.VerifyPayment(paymentRefID, otp, pin)
	if err != nil {
		return nil, err
	}

	invoices, _, err := s.billingRepo.ListInvoices(ctx, "UNPAID", "", 1, 0)
	if err != nil || len(invoices) == 0 {
		return nil, errors.New("no unpaid invoice found to apply payment")
	}
	invoice := &invoices[0]

	payment := &domain.Payment{
		InvoiceID:            invoice.ID,
		CustomerID:           invoice.CustomerID,
		Amount:               res.Amount,
		PaymentMethod:        "NAGAD",
		GatewayTransactionID: &res.TransactionID,
		Status:               "COMPLETED",
	}

	extensionDays := 30
	if invoice.Package != nil && invoice.Package.ValidityDays > 0 {
		extensionDays = invoice.Package.ValidityDays
	}

	if err := s.billingRepo.RecordPaymentAndActivate(ctx, payment, invoice, extensionDays); err != nil {
		return nil, fmt.Errorf("failed to process payment: %w", err)
	}

	s.dispatchCoAIfPossible(ctx, invoice.CustomerID)

	return payment, nil
}

func (s *billingService) RecordManualPayment(ctx context.Context, req domain.ManualPaymentRequest, receivedBy *string) (*domain.Payment, error) {
	inv, err := s.billingRepo.FindInvoiceByID(ctx, req.InvoiceID)
	if err != nil || inv == nil {
		return nil, errors.New("invoice not found")
	}
	if inv.Status == "PAID" {
		return nil, errors.New("invoice is already paid")
	}

	trxID := req.TransactionID
	if trxID == "" {
		trxID = fmt.Sprintf("MANUAL-%d", time.Now().Unix())
	}

	payment := &domain.Payment{
		InvoiceID:            inv.ID,
		CustomerID:           inv.CustomerID,
		Amount:               req.Amount,
		PaymentMethod:        req.PaymentMethod,
		GatewayTransactionID: &trxID,
		Status:               "COMPLETED",
		ReceivedBy:           receivedBy,
	}

	extensionDays := 30
	if inv.Package != nil && inv.Package.ValidityDays > 0 {
		extensionDays = inv.Package.ValidityDays
	}

	if err := s.billingRepo.RecordPaymentAndActivate(ctx, payment, inv, extensionDays); err != nil {
		return nil, err
	}

	s.dispatchCoAIfPossible(ctx, inv.CustomerID)

	return payment, nil
}

func (s *billingService) RequestPromiseToPay(ctx context.Context, customerID string) (*domain.PromiseToPay, error) {
	// 1. Check existing active promise to pay
	existing, err := s.billingRepo.FindActivePromiseToPay(ctx, customerID)
	if err == nil && existing != nil {
		return existing, nil
	}

	// 2. Fetch customer details
	detail, err := s.customerRepo.FindByID(ctx, customerID)
	if err != nil || detail == nil {
		return nil, errors.New("customer profile not found")
	}

	now := time.Now()
	expiresAt := now.Add(48 * time.Hour)

	promise := &domain.PromiseToPay{
		CustomerID:       customerID,
		ServiceAccountID: detail.ServiceAccount.ID,
		ExtensionHours:   48,
		GrantedAt:        now,
		ExpiresAt:        expiresAt,
		Status:           "ACTIVE",
	}

	if err := s.billingRepo.CreatePromiseToPay(ctx, promise); err != nil {
		return nil, fmt.Errorf("failed to grant promise to pay: %w", err)
	}

	// Dispatch CoA to unblock active connection
	s.dispatchCoAIfPossible(ctx, customerID)

	return promise, nil
}

func (s *billingService) GetCustomerPortalOverview(ctx context.Context, customerID string) (*domain.CustomerPortalOverviewDTO, error) {
	return s.billingRepo.GetCustomerOverview(ctx, customerID)
}

func (s *billingService) ArtificiallyExpireCustomer(ctx context.Context, customerID string, status string) error {
	if status == "" {
		status = "EXPIRED"
	}
	expiredDate := time.Now().AddDate(0, 0, -1) // yesterday
	return s.billingRepo.UpdateCustomerStatus(ctx, customerID, status, &expiredDate)
}

func (s *billingService) ListPayments(ctx context.Context, page, pageSize int) ([]domain.Payment, int64, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize
	return s.billingRepo.ListPayments(ctx, pageSize, offset)
}

func (s *billingService) dispatchCoAIfPossible(ctx context.Context, customerID string) {
	detail, err := s.customerRepo.FindByID(ctx, customerID)
	if err != nil || detail == nil {
		return
	}
	router := detail.Router
	account := detail.ServiceAccount
	if router.ID != "" && account.Username != "" {
		var framedIP net.IP
		if account.StaticIP != nil && *account.StaticIP != "" {
			framedIP = net.ParseIP(*account.StaticIP)
		}
		_ = radius.SendDisconnectRequest(
			router.IPAddress,
			router.CoAPort,
			router.RadiusSecret,
			account.Username,
			framedIP,
			router.IsSimulated,
		)
	}
}
