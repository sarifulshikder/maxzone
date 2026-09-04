package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"maxzone/internal/domain"

	"gorm.io/gorm"
)

type BillingRepository interface {
	ListInvoices(ctx context.Context, status, search string, limit, offset int) ([]domain.Invoice, int64, error)
	FindInvoiceByID(ctx context.Context, id string) (*domain.Invoice, error)
	FindInvoiceByNumber(ctx context.Context, invoiceNumber string) (*domain.Invoice, error)
	CreateInvoice(ctx context.Context, invoice *domain.Invoice) error
	GetNextInvoiceSequence(ctx context.Context, yearMonth string) (int, error)
	RecordPaymentAndActivate(ctx context.Context, payment *domain.Payment, invoice *domain.Invoice, extensionDays int) error
	FindActivePromiseToPay(ctx context.Context, customerID string) (*domain.PromiseToPay, error)
	CreatePromiseToPay(ctx context.Context, promise *domain.PromiseToPay) error
	ListPayments(ctx context.Context, limit, offset int) ([]domain.Payment, int64, error)
	GetCustomerOverview(ctx context.Context, customerID string) (*domain.CustomerPortalOverviewDTO, error)
	UpdateCustomerStatus(ctx context.Context, customerID string, status string, expiresAt *time.Time) error
}

type billingRepository struct {
	db *gorm.DB
}

func NewBillingRepository(db *gorm.DB) BillingRepository {
	return &billingRepository{db: db}
}

func (r *billingRepository) ListInvoices(ctx context.Context, status, search string, limit, offset int) ([]domain.Invoice, int64, error) {
	var invoices []domain.Invoice
	var total int64

	query := r.db.WithContext(ctx).Model(&domain.Invoice{})

	if status != "" && status != "ALL" {
		query = query.Where("status = ?", status)
	}

	if search != "" {
		s := "%" + search + "%"
		query = query.Joins("LEFT JOIN customers ON customers.id = invoices.customer_id").
			Joins("LEFT JOIN users ON users.id = customers.user_id").
			Where("invoices.invoice_number ILIKE ? OR customers.customer_code ILIKE ? OR users.first_name ILIKE ? OR users.username ILIKE ?", s, s, s, s)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Preload("Customer.User").Preload("Package").Preload("ServiceAccount").
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&invoices).Error

	return invoices, total, err
}

func (r *billingRepository) FindInvoiceByID(ctx context.Context, id string) (*domain.Invoice, error) {
	var invoice domain.Invoice
	err := r.db.WithContext(ctx).
		Preload("Customer.User").Preload("Package").Preload("ServiceAccount").Preload("Payments").
		Where("id = ?", id).
		First(&invoice).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &invoice, nil
}

func (r *billingRepository) FindInvoiceByNumber(ctx context.Context, invoiceNumber string) (*domain.Invoice, error) {
	var invoice domain.Invoice
	err := r.db.WithContext(ctx).
		Preload("Customer.User").Preload("Package").Preload("ServiceAccount").
		Where("invoice_number = ?", invoiceNumber).
		First(&invoice).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &invoice, nil
}

func (r *billingRepository) CreateInvoice(ctx context.Context, invoice *domain.Invoice) error {
	return r.db.WithContext(ctx).Create(invoice).Error
}

func (r *billingRepository) GetNextInvoiceSequence(ctx context.Context, yearMonth string) (int, error) {
	var count int64
	prefix := fmt.Sprintf("INV-%s-%%", yearMonth)
	err := r.db.WithContext(ctx).Model(&domain.Invoice{}).
		Where("invoice_number LIKE ?", prefix).
		Count(&count).Error
	return int(count) + 1, err
}

func (r *billingRepository) RecordPaymentAndActivate(
	ctx context.Context,
	payment *domain.Payment,
	invoice *domain.Invoice,
	extensionDays int,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Record Payment
		if err := tx.Create(payment).Error; err != nil {
			return fmt.Errorf("failed to create payment: %w", err)
		}

		// 2. Mark Invoice as PAID
		now := time.Now()
		invoice.Status = "PAID"
		invoice.PaidAt = &now
		invoice.UpdatedAt = now
		if err := tx.Save(invoice).Error; err != nil {
			return fmt.Errorf("failed to update invoice: %w", err)
		}

		// 3. Auto-Provision & Extend Service Account
		var account domain.ServiceAccount
		if err := tx.Where("customer_id = ?", invoice.CustomerID).First(&account).Error; err == nil {
			newExpiry := account.ExpiresAt
			if newExpiry.Before(now) {
				newExpiry = now
			}
			newExpiry = newExpiry.AddDate(0, 0, extensionDays)

			account.Status = "ACTIVE"
			account.ExpiresAt = newExpiry
			account.UpdatedAt = now
			if err := tx.Save(&account).Error; err != nil {
				return fmt.Errorf("failed to reactivate service account: %w", err)
			}
		}

		// 4. If there is an active promise to pay, mark as SETTLED
		_ = tx.Model(&domain.PromiseToPay{}).
			Where("customer_id = ? AND status = 'ACTIVE'", invoice.CustomerID).
			Update("status", "SETTLED").Error

		return nil
	})
}

func (r *billingRepository) FindActivePromiseToPay(ctx context.Context, customerID string) (*domain.PromiseToPay, error) {
	var promise domain.PromiseToPay
	now := time.Now()
	err := r.db.WithContext(ctx).
		Where("customer_id = ? AND status = 'ACTIVE' AND expires_at > ?", customerID, now).
		Order("granted_at DESC").
		First(&promise).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &promise, nil
}

func (r *billingRepository) CreatePromiseToPay(ctx context.Context, promise *domain.PromiseToPay) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(promise).Error; err != nil {
			return err
		}

		// Unblock subscriber account for extension duration
		var account domain.ServiceAccount
		if err := tx.Where("id = ?", promise.ServiceAccountID).First(&account).Error; err == nil {
			account.Status = "ACTIVE"
			account.ExpiresAt = promise.ExpiresAt
			account.UpdatedAt = time.Now()
			if err := tx.Save(&account).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *billingRepository) ListPayments(ctx context.Context, limit, offset int) ([]domain.Payment, int64, error) {
	var payments []domain.Payment
	var total int64

	query := r.db.WithContext(ctx).Model(&domain.Payment{})
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Preload("Invoice.Customer.User").
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&payments).Error

	return payments, total, err
}

func (r *billingRepository) GetCustomerOverview(ctx context.Context, customerID string) (*domain.CustomerPortalOverviewDTO, error) {
	var customer domain.Customer
	if err := r.db.WithContext(ctx).Preload("User").Where("id = ?", customerID).First(&customer).Error; err != nil {
		return nil, err
	}

	var account domain.ServiceAccount
	if err := r.db.WithContext(ctx).Where("customer_id = ?", customerID).First(&account).Error; err != nil {
		return nil, err
	}

	var pkg domain.Package
	_ = r.db.WithContext(ctx).Where("id = ?", account.PackageID).First(&pkg).Error

	var router domain.NASRouter
	_ = r.db.WithContext(ctx).Where("id = ?", account.NASID).First(&router).Error

	var latestInvoice domain.Invoice
	var pLatestInvoice *domain.Invoice
	if err := r.db.WithContext(ctx).Where("customer_id = ?", customerID).Order("created_at DESC").First(&latestInvoice).Error; err == nil {
		pLatestInvoice = &latestInvoice
	}

	var unpaidInvoices []domain.Invoice
	_ = r.db.WithContext(ctx).Where("customer_id = ? AND status = 'UNPAID'", customerID).Find(&unpaidInvoices).Error

	var recentPayments []domain.Payment
	_ = r.db.WithContext(ctx).Where("customer_id = ?", customerID).Order("created_at DESC").Limit(5).Find(&recentPayments).Error

	activePromise, _ := r.FindActivePromiseToPay(ctx, customerID)

	daysRemaining := int(time.Until(account.ExpiresAt).Hours() / 24)
	if daysRemaining < 0 {
		daysRemaining = 0
	}

	return &domain.CustomerPortalOverviewDTO{
		Customer:       customer,
		ServiceAccount: account,
		Package:        pkg,
		Router:         router,
		LatestInvoice:  pLatestInvoice,
		ActivePromise:  activePromise,
		RecentPayments: recentPayments,
		UnpaidInvoices: unpaidInvoices,
		DaysRemaining:  daysRemaining,
	}, nil
}

func (r *billingRepository) UpdateCustomerStatus(ctx context.Context, customerID string, status string, expiresAt *time.Time) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}
	if expiresAt != nil {
		updates["expires_at"] = *expiresAt
	}
	return r.db.WithContext(ctx).Model(&domain.ServiceAccount{}).
		Where("customer_id = ?", customerID).
		Updates(updates).Error
}
