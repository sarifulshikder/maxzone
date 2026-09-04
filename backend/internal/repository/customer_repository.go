package repository

import (
	"context"
	"errors"
	"fmt"

	"maxzone/internal/domain"

	"gorm.io/gorm"
)

type CustomerRepository interface {
	List(ctx context.Context, search, status string, limit, offset int) ([]domain.CustomerListItemDTO, int64, error)
	ListByReseller(ctx context.Context, resellerID, search, status string, limit, offset int) ([]domain.CustomerListItemDTO, int64, error)
	FindByID(ctx context.Context, id string) (*domain.Customer360DetailDTO, error)
	CreateWithAccount(ctx context.Context, user *domain.User, customer *domain.Customer, account *domain.ServiceAccount, pkg *domain.Package) error
	Update(ctx context.Context, customer *domain.Customer, account *domain.ServiceAccount, pkg *domain.Package) error
	Delete(ctx context.Context, id string) error
	GetRadiusAttributes(ctx context.Context, username string) ([]domain.RadCheck, []domain.RadReply, error)
}

type customerRepository struct {
	db *gorm.DB
}

func NewCustomerRepository(db *gorm.DB) CustomerRepository {
	return &customerRepository{db: db}
}

func (r *customerRepository) List(ctx context.Context, search, status string, limit, offset int) ([]domain.CustomerListItemDTO, int64, error) {
	var items []domain.CustomerListItemDTO
	var total int64

	baseQuery := r.db.WithContext(ctx).Table("customers").
		Select(`
			customers.id,
			customers.customer_code,
			users.first_name || ' ' || COALESCE(users.last_name, '') as name,
			users.phone,
			users.email,
			customers.zone_area,
			service_accounts.username,
			packages.name as package_name,
			packages.rate_limit_string as package_speed,
			packages.price,
			nas_routers.name as router_name,
			service_accounts.status,
			service_accounts.expires_at,
			customers.created_at
		`).
		Joins("JOIN users ON users.id = customers.user_id").
		Joins("LEFT JOIN service_accounts ON service_accounts.customer_id = customers.id").
		Joins("LEFT JOIN packages ON packages.id = service_accounts.package_id").
		Joins("LEFT JOIN nas_routers ON nas_routers.id = service_accounts.nas_id")

	if search != "" {
		s := "%" + search + "%"
		baseQuery = baseQuery.Where("users.first_name ILIKE ? OR users.last_name ILIKE ? OR users.phone ILIKE ? OR service_accounts.username ILIKE ? OR customers.customer_code ILIKE ?", s, s, s, s, s)
	}

	if status != "" && status != "ALL" {
		baseQuery = baseQuery.Where("service_accounts.status = ?", status)
	}

	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if limit <= 0 {
		limit = 50
	}
	err := baseQuery.Order("customers.created_at DESC").Limit(limit).Offset(offset).Scan(&items).Error
	return items, total, err
}

func (r *customerRepository) ListByReseller(ctx context.Context, resellerID, search, status string, limit, offset int) ([]domain.CustomerListItemDTO, int64, error) {
	var items []domain.CustomerListItemDTO
	var total int64

	baseQuery := r.db.WithContext(ctx).Table("customers").
		Select(`
			customers.id,
			customers.customer_code,
			users.first_name || ' ' || COALESCE(users.last_name, '') as name,
			users.phone,
			users.email,
			customers.zone_area,
			service_accounts.username,
			packages.name as package_name,
			packages.rate_limit_string as package_speed,
			COALESCE(NULLIF(packages.wholesale_price, 0), packages.price) as price,
			nas_routers.name as router_name,
			service_accounts.status,
			service_accounts.expires_at,
			customers.created_at
		`).
		Joins("JOIN users ON users.id = customers.user_id").
		Joins("LEFT JOIN service_accounts ON service_accounts.customer_id = customers.id").
		Joins("LEFT JOIN packages ON packages.id = service_accounts.package_id").
		Joins("LEFT JOIN nas_routers ON nas_routers.id = service_accounts.nas_id").
		Where("customers.reseller_id = ?", resellerID)

	if search != "" {
		s := "%" + search + "%"
		baseQuery = baseQuery.Where("users.first_name ILIKE ? OR users.last_name ILIKE ? OR users.phone ILIKE ? OR service_accounts.username ILIKE ? OR customers.customer_code ILIKE ?", s, s, s, s, s)
	}

	if status != "" && status != "ALL" {
		baseQuery = baseQuery.Where("service_accounts.status = ?", status)
	}

	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if limit <= 0 {
		limit = 50
	}
	err := baseQuery.Order("customers.created_at DESC").Limit(limit).Offset(offset).Scan(&items).Error
	return items, total, err
}

func (r *customerRepository) FindByID(ctx context.Context, id string) (*domain.Customer360DetailDTO, error) {
	var customer domain.Customer
	if err := r.db.WithContext(ctx).Preload("User").Preload("Accounts").Where("id = ?", id).First(&customer).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	var account domain.ServiceAccount
	if len(customer.Accounts) > 0 {
		account = customer.Accounts[0]
	} else {
		// Try to query directly
		_ = r.db.WithContext(ctx).Where("customer_id = ?", customer.ID).First(&account).Error
	}

	var pkg domain.Package
	if account.PackageID != "" {
		_ = r.db.WithContext(ctx).Where("id = ?", account.PackageID).First(&pkg).Error
	}

	var router domain.NASRouter
	if account.NASID != "" {
		_ = r.db.WithContext(ctx).Where("id = ?", account.NASID).First(&router).Error
	}

	var checks []domain.RadCheck
	var replies []domain.RadReply
	if account.Username != "" {
		_ = r.db.WithContext(ctx).Where("username = ?", account.Username).Find(&checks).Error
		_ = r.db.WithContext(ctx).Where("username = ?", account.Username).Find(&replies).Error
	}

	return &domain.Customer360DetailDTO{
		Customer:       customer,
		ServiceAccount: account,
		Package:        pkg,
		Router:         router,
		RadiusCheck:    checks,
		RadiusReply:    replies,
	}, nil
}

func (r *customerRepository) CreateWithAccount(
	ctx context.Context,
	user *domain.User,
	customer *domain.Customer,
	account *domain.ServiceAccount,
	pkg *domain.Package,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Create User
		if err := tx.Create(user).Error; err != nil {
			return fmt.Errorf("failed to create user: %w", err)
		}

		// 2. Create Customer
		customer.UserID = user.ID
		if err := tx.Create(customer).Error; err != nil {
			return fmt.Errorf("failed to create customer profile: %w", err)
		}

		// 3. Create Service Account
		account.CustomerID = customer.ID
		if err := tx.Create(account).Error; err != nil {
			return fmt.Errorf("failed to create service account: %w", err)
		}

		// 4. FreeRADIUS Sync: radcheck (Cleartext-Password)
		radcheck := domain.RadCheck{
			Username:  account.Username,
			Attribute: "Cleartext-Password",
			Op:        ":=",
			Value:     account.Password,
		}
		if err := tx.Create(&radcheck).Error; err != nil {
			return fmt.Errorf("failed to sync radcheck: %w", err)
		}

		// 5. FreeRADIUS Sync: radreply (Mikrotik-Rate-Limit & Framed-Protocol)
		radReplies := []domain.RadReply{
			{
				Username:  account.Username,
				Attribute: "Mikrotik-Rate-Limit",
				Op:        "=",
				Value:     pkg.RateLimitString,
			},
			{
				Username:  account.Username,
				Attribute: "Framed-Protocol",
				Op:        "=",
				Value:     "PPP",
			},
		}

		if account.StaticIP != nil && *account.StaticIP != "" {
			radReplies = append(radReplies, domain.RadReply{
				Username:  account.Username,
				Attribute: "Framed-IP-Address",
				Op:        "=",
				Value:     *account.StaticIP,
			})
		}

		for _, reply := range radReplies {
			if err := tx.Create(&reply).Error; err != nil {
				return fmt.Errorf("failed to sync radreply: %w", err)
			}
		}

		return nil
	})
}

func (r *customerRepository) Update(
	ctx context.Context,
	customer *domain.Customer,
	account *domain.ServiceAccount,
	pkg *domain.Package,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(customer).Error; err != nil {
			return err
		}

		if account != nil && account.ID != "" {
			if err := tx.Save(account).Error; err != nil {
				return err
			}

			// Update FreeRADIUS radcheck password if updated
			if account.Password != "" {
				_ = tx.Model(&domain.RadCheck{}).
					Where("username = ? AND attribute = 'Cleartext-Password'", account.Username).
					Update("value", account.Password).Error
			}

			// Update FreeRADIUS radreply rate-limit if package updated
			if pkg != nil && pkg.RateLimitString != "" {
				_ = tx.Model(&domain.RadReply{}).
					Where("username = ? AND attribute = 'Mikrotik-Rate-Limit'", account.Username).
					Update("value", pkg.RateLimitString).Error
			}
		}

		return nil
	})
}

func (r *customerRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var customer domain.Customer
		if err := tx.Where("id = ?", id).First(&customer).Error; err != nil {
			return err
		}

		var account domain.ServiceAccount
		_ = tx.Where("customer_id = ?", customer.ID).First(&account).Error

		if account.Username != "" {
			// Clean FreeRADIUS entries
			_ = tx.Where("username = ?", account.Username).Delete(&domain.RadCheck{}).Error
			_ = tx.Where("username = ?", account.Username).Delete(&domain.RadReply{}).Error
			_ = tx.Where("id = ?", account.ID).Delete(&domain.ServiceAccount{}).Error
		}

		if err := tx.Where("id = ?", customer.ID).Delete(&domain.Customer{}).Error; err != nil {
			return err
		}

		return tx.Where("id = ?", customer.UserID).Delete(&domain.User{}).Error
	})
}

func (r *customerRepository) GetRadiusAttributes(ctx context.Context, username string) ([]domain.RadCheck, []domain.RadReply, error) {
	var checks []domain.RadCheck
	var replies []domain.RadReply

	if err := r.db.WithContext(ctx).Where("username = ?", username).Find(&checks).Error; err != nil {
		return nil, nil, err
	}
	if err := r.db.WithContext(ctx).Where("username = ?", username).Find(&replies).Error; err != nil {
		return nil, nil, err
	}

	return checks, replies, nil
}
