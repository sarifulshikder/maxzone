package domain

import (
	"time"
)

// Reseller represents an ISP franchise, master reseller, or sub-reseller
type Reseller struct {
	ID               string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID           string    `json:"user_id" gorm:"column:user_id;type:uuid;unique;not null"`
	ParentResellerID *string   `json:"parent_reseller_id" gorm:"column:parent_reseller_id;type:uuid"`
	BusinessName     string    `json:"business_name" gorm:"column:business_name;size:150;not null"`
	TradeLicense     *string   `json:"trade_license" gorm:"column:trade_license;size:100"`
	ResellerType     string    `json:"reseller_type" gorm:"column:reseller_type;size:20;default:'RESELLER'"`
	CommissionType   string    `json:"commission_type" gorm:"column:commission_type;size:20;default:'PERCENTAGE'"`
	CommissionValue  float64   `json:"commission_value" gorm:"column:commission_value;type:decimal(10,2);default:0.00"`
	CreditLimit      float64   `json:"credit_limit" gorm:"column:credit_limit;type:decimal(12,2);default:0.00"`
	IsActive         bool      `json:"is_active" gorm:"column:is_active;default:true"`
	CreatedAt        time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt        time.Time `json:"updated_at" gorm:"column:updated_at"`

	// Joined relations
	User           *User             `json:"user,omitempty" gorm:"foreignKey:UserID"`
	ParentReseller *Reseller         `json:"parent_reseller,omitempty" gorm:"foreignKey:ParentResellerID"`
	Wallet         *ResellerWallet   `json:"wallet,omitempty" gorm:"foreignKey:ResellerID"`
	Customers      []Customer        `json:"customers,omitempty" gorm:"foreignKey:ResellerID"`
}

func (Reseller) TableName() string {
	return "resellers"
}

// ResellerWallet anchors the double-entry accounting balance
type ResellerWallet struct {
	ID            string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ResellerID    string    `json:"reseller_id" gorm:"column:reseller_id;type:uuid;unique;not null"`
	Balance       float64   `json:"balance" gorm:"column:balance;type:decimal(12,2);not null;default:0.00"`
	CreditLimit   float64   `json:"credit_limit" gorm:"column:credit_limit;type:decimal(12,2);default:0.00"`
	LockedBalance float64   `json:"locked_balance" gorm:"column:locked_balance;type:decimal(12,2);default:0.00"`
	Currency      string    `json:"currency" gorm:"column:currency;size:3;default:'BDT'"`
	CreatedAt     time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"column:updated_at"`

	// Joined relation
	Reseller *Reseller `json:"reseller,omitempty" gorm:"foreignKey:ResellerID"`
}

func (ResellerWallet) TableName() string {
	return "reseller_wallets"
}

// ResellerTransaction is an immutable double-entry ledger entry
type ResellerTransaction struct {
	ID            string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ResellerID    string    `json:"reseller_id" gorm:"column:reseller_id;type:uuid;not null"`
	WalletID      string    `json:"wallet_id" gorm:"column:wallet_id;type:uuid;not null"`
	Type          string    `json:"type" gorm:"column:type;size:30;not null"` // 'TOPUP', 'CUSTOMER_RENEWAL', 'COMMISSION_CREDIT', 'ADJUSTMENT'
	Amount        float64   `json:"amount" gorm:"column:amount;type:decimal(12,2);not null"`
	BalanceBefore float64   `json:"balance_before" gorm:"column:balance_before;type:decimal(12,2);not null"`
	BalanceAfter  float64   `json:"balance_after" gorm:"column:balance_after;type:decimal(12,2);not null"`
	ReferenceID   *string   `json:"reference_id" gorm:"column:reference_id;size:100"`
	Remarks       *string   `json:"remarks" gorm:"column:remarks;type:text"`
	PerformedBy   *string   `json:"performed_by" gorm:"column:performed_by;type:uuid"`
	CreatedAt     time.Time `json:"created_at" gorm:"column:created_at"`

	// Joined relations
	Reseller *Reseller `json:"reseller,omitempty" gorm:"foreignKey:ResellerID"`
	Wallet   *ResellerWallet `json:"wallet,omitempty" gorm:"foreignKey:WalletID"`
	User     *User     `json:"user,omitempty" gorm:"foreignKey:PerformedBy"`
}

func (ResellerTransaction) TableName() string {
	return "reseller_transactions"
}

// --- DTOs ---

type BatchRenewRequest struct {
	CustomerIDs []string `json:"customer_ids" binding:"required,min=1"`
}

type BatchRenewResponse struct {
	RenewedCount   int                `json:"renewed_count"`
	TotalDeducted  float64            `json:"total_deducted"`
	BalanceBefore  float64            `json:"balance_before"`
	BalanceAfter   float64            `json:"balance_after"`
	RenewedCustomers []RenewedCustomerDTO `json:"renewed_customers"`
}

type RenewedCustomerDTO struct {
	CustomerID    string    `json:"customer_id"`
	CustomerCode  string    `json:"customer_code"`
	Username      string    `json:"username"`
	PackageName   string    `json:"package_name"`
	RenewedAmount float64   `json:"renewed_amount"`
	NewExpiresAt  time.Time `json:"new_expires_at"`
	Status        string    `json:"status"`
}

type ResellerTopupRequest struct {
	Amount        float64 `json:"amount" binding:"required,gt=0"`
	PaymentMethod string  `json:"payment_method" binding:"required"` // 'BKASH', 'NAGAD', 'BANK_TRANSFER', 'CASH'
	TransactionID string  `json:"transaction_id"`
	Remarks       string  `json:"remarks"`
}

type ResellerDashboardOverviewDTO struct {
	Reseller           Reseller              `json:"reseller"`
	Wallet             ResellerWallet        `json:"wallet"`
	TotalCustomers     int64                 `json:"total_customers"`
	ActiveCustomers    int64                 `json:"active_customers"`
	ExpiredCustomers   int64                 `json:"expired_customers"`
	RecentTransactions []ResellerTransaction `json:"recent_transactions"`
	Customers          []CustomerListItemDTO `json:"customers"`
}

type AdminResellerOverviewDTO struct {
	Reseller           Reseller              `json:"reseller"`
	Wallet             ResellerWallet        `json:"wallet"`
	TotalCustomers     int64                 `json:"total_customers"`
}

type AdminAdjustWalletRequest struct {
	ResellerID  string  `json:"reseller_id" binding:"required"`
	Amount      float64 `json:"amount" binding:"required"`
	Type        string  `json:"type" binding:"required"` // 'TOPUP', 'ADJUSTMENT'
	CreditLimit *float64 `json:"credit_limit"`
	Remarks     string  `json:"remarks"`
}
