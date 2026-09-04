package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"maxzone/internal/domain"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ResellerRepository interface {
	FindResellerByUserID(ctx context.Context, userID string) (*domain.Reseller, error)
	FindResellerByID(ctx context.Context, id string) (*domain.Reseller, error)
	GetWallet(ctx context.Context, resellerID string) (*domain.ResellerWallet, error)
	ListResellers(ctx context.Context, search string, page, pageSize int) ([]domain.Reseller, int64, error)
	ListTransactions(ctx context.Context, resellerID string, page, pageSize int) ([]domain.ResellerTransaction, int64, error)
	TopupWallet(ctx context.Context, resellerID string, amount float64, txType, refID, remarks string, performedBy *string) (*domain.ResellerTransaction, *domain.ResellerWallet, error)
	ExecuteBatchRenewal(ctx context.Context, resellerID string, customerIDs []string, performedBy *string) (*domain.BatchRenewResponse, error)
	UpdateCreditLimit(ctx context.Context, resellerID string, newLimit float64) error
	GetCustomerCounts(ctx context.Context, resellerID string) (total int64, active int64, expired int64, err error)
}

type resellerRepository struct {
	db *gorm.DB
}

func NewResellerRepository(db *gorm.DB) ResellerRepository {
	return &resellerRepository{db: db}
}

func (r *resellerRepository) FindResellerByUserID(ctx context.Context, userID string) (*domain.Reseller, error) {
	var reseller domain.Reseller
	err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Wallet").
		Where("user_id = ?", userID).
		First(&reseller).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &reseller, nil
}

func (r *resellerRepository) FindResellerByID(ctx context.Context, id string) (*domain.Reseller, error) {
	var reseller domain.Reseller
	err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Wallet").
		Where("id = ?", id).
		First(&reseller).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &reseller, nil
}

func (r *resellerRepository) GetWallet(ctx context.Context, resellerID string) (*domain.ResellerWallet, error) {
	var wallet domain.ResellerWallet
	err := r.db.WithContext(ctx).
		Where("reseller_id = ?", resellerID).
		First(&wallet).Error
	if err != nil {
		return nil, err
	}
	return &wallet, nil
}

func (r *resellerRepository) ListResellers(ctx context.Context, search string, page, pageSize int) ([]domain.Reseller, int64, error) {
	var resellers []domain.Reseller
	var total int64

	query := r.db.WithContext(ctx).Model(&domain.Reseller{})
	if search != "" {
		s := "%" + search + "%"
		query = query.Joins("LEFT JOIN users ON users.id = resellers.user_id").
			Where("resellers.business_name ILIKE ? OR users.username ILIKE ? OR users.first_name ILIKE ?", s, s, s)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Preload("User").Preload("Wallet").
		Order("created_at DESC").
		Limit(pageSize).Offset(offset).
		Find(&resellers).Error

	return resellers, total, err
}

func (r *resellerRepository) ListTransactions(ctx context.Context, resellerID string, page, pageSize int) ([]domain.ResellerTransaction, int64, error) {
	var items []domain.ResellerTransaction
	var total int64

	query := r.db.WithContext(ctx).Model(&domain.ResellerTransaction{})
	if resellerID != "" {
		query = query.Where("reseller_id = ?", resellerID)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Preload("User").
		Order("created_at DESC").
		Limit(pageSize).Offset(offset).
		Find(&items).Error

	return items, total, err
}

func (r *resellerRepository) TopupWallet(
	ctx context.Context,
	resellerID string,
	amount float64,
	txType, refID, remarks string,
	performedBy *string,
) (*domain.ResellerTransaction, *domain.ResellerWallet, error) {
	var txRecord *domain.ResellerTransaction
	var updatedWallet *domain.ResellerWallet

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Lock wallet row FOR UPDATE to ensure atomic consistency
		var wallet domain.ResellerWallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("reseller_id = ?", resellerID).
			First(&wallet).Error; err != nil {
			return fmt.Errorf("failed to lock wallet: %w", err)
		}

		balanceBefore := wallet.Balance
		balanceAfter := wallet.Balance + amount

		wallet.Balance = balanceAfter
		wallet.UpdatedAt = time.Now()
		if err := tx.Save(&wallet).Error; err != nil {
			return fmt.Errorf("failed to update wallet balance: %w", err)
		}

		// 2. Insert audit ledger transaction
		txRecord = &domain.ResellerTransaction{
			ResellerID:    resellerID,
			WalletID:      wallet.ID,
			Type:          txType,
			Amount:        amount,
			BalanceBefore: balanceBefore,
			BalanceAfter:  balanceAfter,
			ReferenceID:   &refID,
			Remarks:       &remarks,
			PerformedBy:   performedBy,
			CreatedAt:     time.Now(),
		}
		if err := tx.Create(txRecord).Error; err != nil {
			return fmt.Errorf("failed to create ledger entry: %w", err)
		}

		updatedWallet = &wallet
		return nil
	})

	return txRecord, updatedWallet, err
}

func (r *resellerRepository) ExecuteBatchRenewal(
	ctx context.Context,
	resellerID string,
	customerIDs []string,
	performedBy *string,
) (*domain.BatchRenewResponse, error) {
	var response domain.BatchRenewResponse

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Lock wallet row FOR UPDATE
		var wallet domain.ResellerWallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("reseller_id = ?", resellerID).
			First(&wallet).Error; err != nil {
			return fmt.Errorf("failed to lock reseller wallet: %w", err)
		}

		// 2. Fetch Customers and their packages
		var customers []domain.Customer
		if err := tx.Preload("User").
			Where("id IN ? AND reseller_id = ?", customerIDs, resellerID).
			Find(&customers).Error; err != nil {
			return fmt.Errorf("failed to fetch customers: %w", err)
		}

		if len(customers) == 0 {
			return errors.New("no valid customers found for renewal under this reseller")
		}

		// Calculate total cost based on package price (or wholesale price if configured)
		var totalCost float64
		type renewalItem struct {
			customer domain.Customer
			sa       domain.ServiceAccount
			pkg      domain.Package
			price    float64
		}
		var items []renewalItem

		for _, cust := range customers {
			var sa domain.ServiceAccount
			if err := tx.Where("customer_id = ?", cust.ID).First(&sa).Error; err != nil {
				continue
			}

			var pkg domain.Package
			if err := tx.Where("id = ?", sa.PackageID).First(&pkg).Error; err != nil {
				continue
			}

			// Reseller renewals default to package wholesale_price (or regular price if wholesale not set)
			cost := pkg.Price
			if pkg.WholesalePrice > 0 {
				cost = pkg.WholesalePrice
			}

			totalCost += cost
			items = append(items, renewalItem{
				customer: cust,
				sa:       sa,
				pkg:      pkg,
				price:    cost,
			})
		}

		if len(items) == 0 {
			return errors.New("no active service accounts found for specified customers")
		}

		// 3. Prevent double-spending & check available credit
		// Available funds = Balance + CreditLimit
		availableFunds := wallet.Balance + wallet.CreditLimit
		if availableFunds < totalCost {
			return fmt.Errorf("INSUFFICIENT_FUNDS: Total renewal cost ৳ %.2f exceeds available balance + credit limit ৳ %.2f", totalCost, availableFunds)
		}

		balanceBefore := wallet.Balance
		balanceAfter := wallet.Balance - totalCost

		wallet.Balance = balanceAfter
		wallet.UpdatedAt = time.Now()
		if err := tx.Save(&wallet).Error; err != nil {
			return fmt.Errorf("failed to update wallet: %w", err)
		}

		// 4. Create financial ledger entry for batch renewal
		ref := fmt.Sprintf("RENEW-%d-%d", time.Now().Unix(), len(items))
		remarks := fmt.Sprintf("Batch renewal for %d subscribers", len(items))
		ledger := &domain.ResellerTransaction{
			ResellerID:    resellerID,
			WalletID:      wallet.ID,
			Type:          "CUSTOMER_RENEWAL",
			Amount:        totalCost,
			BalanceBefore: balanceBefore,
			BalanceAfter:  balanceAfter,
			ReferenceID:   &ref,
			Remarks:       &remarks,
			PerformedBy:   performedBy,
			CreatedAt:     time.Now(),
		}
		if err := tx.Create(ledger).Error; err != nil {
			return fmt.Errorf("failed to create ledger entry: %w", err)
		}

		// 5. Update each service account (add 30 days & set ACTIVE)
		now := time.Now()
		var renewedDTOs []domain.RenewedCustomerDTO

		// Continue invoice numbering from the highest existing INV-RES sequence
		// for the current month so renewals never collide with prior invoices.
		var invCount int64
		if err := tx.Model(&domain.Invoice{}).
			Where("invoice_number LIKE ?", fmt.Sprintf("INV-RES-%s-%%", now.Format("200601"))).
			Count(&invCount).Error; err != nil {
			return fmt.Errorf("failed to compute next invoice number: %w", err)
		}
		nextSeq := int(invCount) + 1

		for i, it := range items {
			newExpiry := it.sa.ExpiresAt
			if newExpiry.Before(now) {
				newExpiry = now
			}
			newExpiry = newExpiry.AddDate(0, 0, 30)

			// Update Service Account
			if err := tx.Model(&domain.ServiceAccount{}).
				Where("id = ?", it.sa.ID).
				Updates(map[string]interface{}{
					"status":     "ACTIVE",
					"expires_at": newExpiry,
					"updated_at": now,
				}).Error; err != nil {
				return fmt.Errorf("failed to renew service account %s: %w", it.sa.Username, err)
			}

			// Generate an invoice and payment record for accounting audit
			invNum := fmt.Sprintf("INV-RES-%s-%04d", now.Format("200601"), nextSeq+i)
			inv := &domain.Invoice{
				InvoiceNumber:      invNum,
				CustomerID:         it.customer.ID,
				ServiceAccountID:   &it.sa.ID,
				ResellerID:         &resellerID,
				PackageID:          it.pkg.ID,
				Amount:             it.price,
				Discount:           0,
				TotalPayable:       it.price,
				Status:             "PAID",
				BillingPeriodStart: now,
				BillingPeriodEnd:   now.AddDate(0, 0, 30),
				DueDate:            now,
				PaidAt:             &now,
				CreatedAt:          now,
				UpdatedAt:          now,
			}
			if err := tx.Create(inv).Error; err != nil {
				return fmt.Errorf("failed to create invoice %s for %s: %w", invNum, it.customer.CustomerCode, err)
			}

			payment := &domain.Payment{
				InvoiceID:            inv.ID,
				CustomerID:           it.customer.ID,
				Amount:               it.price,
				PaymentMethod:        "RESELLER_WALLET",
				GatewayTransactionID: &ref,
				Status:               "COMPLETED",
				ReceivedBy:           performedBy,
				CreatedAt:            now,
			}
			if err := tx.Create(payment).Error; err != nil {
				return fmt.Errorf("failed to record payment for %s: %w", it.customer.CustomerCode, err)
			}

			renewedDTOs = append(renewedDTOs, domain.RenewedCustomerDTO{
				CustomerID:    it.customer.ID,
				CustomerCode:  it.customer.CustomerCode,
				Username:      it.sa.Username,
				PackageName:   it.pkg.Name,
				RenewedAmount: it.price,
				NewExpiresAt:  newExpiry,
				Status:        "ACTIVE",
			})
		}

		response = domain.BatchRenewResponse{
			RenewedCount:     len(items),
			TotalDeducted:    totalCost,
			BalanceBefore:    balanceBefore,
			BalanceAfter:     balanceAfter,
			RenewedCustomers: renewedDTOs,
		}

		return nil
	})

	return &response, err
}

func (r *resellerRepository) UpdateCreditLimit(ctx context.Context, resellerID string, newLimit float64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&domain.Reseller{}).
			Where("id = ?", resellerID).
			Update("credit_limit", newLimit).Error; err != nil {
			return err
		}
		return tx.Model(&domain.ResellerWallet{}).
			Where("reseller_id = ?", resellerID).
			Update("credit_limit", newLimit).Error
	})
}

func (r *resellerRepository) GetCustomerCounts(ctx context.Context, resellerID string) (total int64, active int64, expired int64, err error) {
	err = r.db.WithContext(ctx).Model(&domain.Customer{}).
		Where("reseller_id = ?", resellerID).
		Count(&total).Error
	if err != nil {
		return 0, 0, 0, err
	}

	err = r.db.WithContext(ctx).Model(&domain.ServiceAccount{}).
		Joins("JOIN customers ON customers.id = service_accounts.customer_id").
		Where("customers.reseller_id = ? AND service_accounts.status = 'ACTIVE'", resellerID).
		Count(&active).Error
	if err != nil {
		return 0, 0, 0, err
	}

	expired = total - active
	if expired < 0 {
		expired = 0
	}

	return total, active, expired, nil
}
