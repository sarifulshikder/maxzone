package service

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"maxzone/internal/domain"
	"maxzone/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

type CustomerService interface {
	ListCustomers(ctx context.Context, search, status string, page, pageSize int) ([]domain.CustomerListItemDTO, int64, error)
	GetCustomer360(ctx context.Context, id string) (*domain.Customer360DetailDTO, error)
	CreateCustomer(ctx context.Context, req domain.CreateCustomerRequest) (*domain.Customer360DetailDTO, error)
	UpdateCustomer(ctx context.Context, id string, req domain.UpdateCustomerRequest) (*domain.Customer360DetailDTO, error)
	DeleteCustomer(ctx context.Context, id string) error
	GetRadiusAttributes(ctx context.Context, username string) ([]domain.RadCheck, []domain.RadReply, error)
}

type customerService struct {
	customerRepo repository.CustomerRepository
	packageRepo  repository.PackageRepository
	routerRepo   repository.RouterRepository
}

func NewCustomerService(
	customerRepo repository.CustomerRepository,
	packageRepo repository.PackageRepository,
	routerRepo repository.RouterRepository,
) CustomerService {
	return &customerService{
		customerRepo: customerRepo,
		packageRepo:  packageRepo,
		routerRepo:   routerRepo,
	}
}

func (s *customerService) ListCustomers(ctx context.Context, search, status string, page, pageSize int) ([]domain.CustomerListItemDTO, int64, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize
	return s.customerRepo.List(ctx, search, status, pageSize, offset)
}

func (s *customerService) GetCustomer360(ctx context.Context, id string) (*domain.Customer360DetailDTO, error) {
	detail, err := s.customerRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if detail == nil {
		return nil, errors.New("customer not found")
	}
	return detail, nil
}

func (s *customerService) CreateCustomer(ctx context.Context, req domain.CreateCustomerRequest) (*domain.Customer360DetailDTO, error) {
	// 1. Verify Router
	router, err := s.routerRepo.FindByID(ctx, req.NASID)
	if err != nil || router == nil {
		return nil, fmt.Errorf("invalid router / NAS ID: router not found")
	}

	// 2. Verify Package
	pkg, err := s.packageRepo.FindByID(ctx, req.PackageID)
	if err != nil || pkg == nil {
		return nil, fmt.Errorf("invalid package ID: package not found")
	}

	// 3. Prepare User account for authentication
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash user password: %w", err)
	}

	email := req.Email
	if email == "" {
		email = fmt.Sprintf("%s@maxzone.local", req.Username)
	}

	var lastName *string
	if req.LastName != "" {
		lastName = &req.LastName
	}

	user := &domain.User{
		RoleID:       "44444444-4444-4444-4444-444444444444", // CUSTOMER role
		Username:     req.Username,
		Email:        &email,
		PasswordHash: string(hashedPassword),
		FirstName:    req.FirstName,
		LastName:     lastName,
		Phone:        req.Phone,
		IsActive:     true,
	}

	// 4. Generate Customer Profile
	custCode := fmt.Sprintf("CUST-%s-%04d", time.Now().Format("200601"), rand.Intn(9000)+1000)
	billingType := req.BillingType
	if billingType == "" {
		billingType = "PREPAID"
	}
	billingCycle := req.BillingCycle
	if billingCycle == "" {
		billingCycle = "CALENDAR_MONTH"
	}

	customer := &domain.Customer{
		ResellerID:   req.ResellerID,
		CustomerCode: custCode,
		BillingType:  billingType,
		BillingCycle: billingCycle,
		NIDPassport:  req.NIDPassport,
		AddressLine1: req.AddressLine1,
		AddressLine2: req.AddressLine2,
		ZoneArea:     req.ZoneArea,
	}

	// 5. Prepare Service Account (PPPoE / Hotspot credentials)
	validity := pkg.ValidityDays
	if validity <= 0 {
		validity = 30
	}
	expiresAt := time.Now().AddDate(0, 0, validity)

	account := &domain.ServiceAccount{
		NASID:       req.NASID,
		PackageID:   req.PackageID,
		Username:    req.Username,
		Password:    req.Password, // Cleartext password for FreeRADIUS PAP/CHAP
		ServiceType: "PPPOE",
		StaticIP:    req.StaticIP,
		MACAddress:  req.MACAddress,
		Status:      "ACTIVE",
		ExpiresAt:   expiresAt,
	}

	// 6. Execute Transactional Creation and FreeRADIUS Sync
	if err := s.customerRepo.CreateWithAccount(ctx, user, customer, account, pkg); err != nil {
		return nil, err
	}

	return s.customerRepo.FindByID(ctx, customer.ID)
}

func (s *customerService) UpdateCustomer(ctx context.Context, id string, req domain.UpdateCustomerRequest) (*domain.Customer360DetailDTO, error) {
	detail, err := s.customerRepo.FindByID(ctx, id)
	if err != nil || detail == nil {
		return nil, errors.New("customer not found")
	}

	customer := &detail.Customer
	account := &detail.ServiceAccount

	if req.FirstName != "" && customer.User != nil {
		customer.User.FirstName = req.FirstName
	}
	if req.LastName != "" && customer.User != nil {
		lName := req.LastName
		customer.User.LastName = &lName
	}
	if req.Phone != "" && customer.User != nil {
		customer.User.Phone = req.Phone
	}
	if req.AddressLine1 != "" {
		customer.AddressLine1 = req.AddressLine1
	}
	if req.AddressLine2 != "" {
		customer.AddressLine2 = req.AddressLine2
	}
	if req.ZoneArea != "" {
		customer.ZoneArea = req.ZoneArea
	}
	if req.BillingType != "" {
		customer.BillingType = req.BillingType
	}
	if req.BillingCycle != "" {
		customer.BillingCycle = req.BillingCycle
	}

	var newPkg *domain.Package
	if req.PackageID != "" && req.PackageID != account.PackageID {
		newPkg, err = s.packageRepo.FindByID(ctx, req.PackageID)
		if err != nil || newPkg == nil {
			return nil, fmt.Errorf("package not found")
		}
		account.PackageID = newPkg.ID
	}

	if req.Password != "" {
		account.Password = req.Password
	}
	if req.Status != "" {
		account.Status = req.Status
	}
	if req.StaticIP != nil {
		account.StaticIP = req.StaticIP
	}

	if err := s.customerRepo.Update(ctx, customer, account, newPkg); err != nil {
		return nil, err
	}

	return s.customerRepo.FindByID(ctx, customer.ID)
}

func (s *customerService) DeleteCustomer(ctx context.Context, id string) error {
	return s.customerRepo.Delete(ctx, id)
}

func (s *customerService) GetRadiusAttributes(ctx context.Context, username string) ([]domain.RadCheck, []domain.RadReply, error) {
	return s.customerRepo.GetRadiusAttributes(ctx, username)
}
