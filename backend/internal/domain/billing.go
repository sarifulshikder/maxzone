package domain

import "time"

// Invoice represents a billing charge for internet service
type Invoice struct {
	ID                 string          `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	InvoiceNumber      string          `json:"invoice_number" gorm:"column:invoice_number;size:50;not null;unique"`
	CustomerID         string          `json:"customer_id" gorm:"column:customer_id;type:uuid;not null"`
	ServiceAccountID   *string         `json:"service_account_id" gorm:"column:service_account_id;type:uuid"`
	ResellerID         *string         `json:"reseller_id" gorm:"column:reseller_id;type:uuid"`
	PackageID          string          `json:"package_id" gorm:"column:package_id;type:uuid;not null"`
	Amount             float64         `json:"amount" gorm:"column:amount;type:decimal(10,2);not null"`
	Discount           float64         `json:"discount" gorm:"column:discount;type:decimal(10,2);default:0.00"`
	TotalPayable       float64         `json:"total_payable" gorm:"column:total_payable;type:decimal(10,2);not null"`
	Status             string          `json:"status" gorm:"column:status;size:20;default:'UNPAID'"` // 'UNPAID', 'PAID', 'CANCELLED', 'OVERDUE'
	BillingPeriodStart time.Time       `json:"billing_period_start" gorm:"column:billing_period_start;type:date;not null"`
	BillingPeriodEnd   time.Time       `json:"billing_period_end" gorm:"column:billing_period_end;type:date;not null"`
	DueDate            time.Time       `json:"due_date" gorm:"column:due_date;type:date;not null"`
	PaidAt             *time.Time      `json:"paid_at" gorm:"column:paid_at"`
	CreatedAt          time.Time       `json:"created_at" gorm:"column:created_at"`
	UpdatedAt          time.Time       `json:"updated_at" gorm:"column:updated_at"`

	// Joined relations
	Customer       *Customer       `json:"customer,omitempty" gorm:"foreignKey:CustomerID"`
	ServiceAccount *ServiceAccount `json:"service_account,omitempty" gorm:"foreignKey:ServiceAccountID"`
	Package        *Package        `json:"package,omitempty" gorm:"foreignKey:PackageID"`
	Payments       []Payment       `json:"payments,omitempty" gorm:"foreignKey:InvoiceID"`
}

func (Invoice) TableName() string {
	return "invoices"
}

// Payment represents a settled financial transaction
type Payment struct {
	ID                   string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	InvoiceID            string    `json:"invoice_id" gorm:"column:invoice_id;type:uuid;not null"`
	CustomerID           string    `json:"customer_id" gorm:"column:customer_id;type:uuid;not null"`
	Amount               float64   `json:"amount" gorm:"column:amount;type:decimal(10,2);not null"`
	PaymentMethod        string    `json:"payment_method" gorm:"column:payment_method;size:50;not null"` // 'BKASH', 'NAGAD', 'ROCKET', 'SSLCOMMERZ', 'CASH'
	GatewayTransactionID *string   `json:"gateway_transaction_id" gorm:"column:gateway_transaction_id;size:100"`
	GatewayResponse      *string   `json:"gateway_response" gorm:"column:gateway_response;type:jsonb"`
	Status               string    `json:"status" gorm:"column:status;size:20;default:'COMPLETED'"` // 'COMPLETED', 'FAILED', 'REFUNDED'
	ReceivedBy           *string   `json:"received_by" gorm:"column:received_by;type:uuid"`
	CreatedAt            time.Time `json:"created_at" gorm:"column:created_at"`

	// Joined relations
	Invoice *Invoice `json:"invoice,omitempty" gorm:"foreignKey:InvoiceID"`
}

func (Payment) TableName() string {
	return "payments"
}

// PromiseToPay represents an emergency 24h/48h service unblock request
type PromiseToPay struct {
	ID               string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CustomerID       string    `json:"customer_id" gorm:"column:customer_id;type:uuid;not null"`
	ServiceAccountID string    `json:"service_account_id" gorm:"column:service_account_id;type:uuid;not null"`
	ExtensionHours   int       `json:"extension_hours" gorm:"column:extension_hours;not null;default:48"`
	GrantedAt        time.Time `json:"granted_at" gorm:"column:granted_at"`
	ExpiresAt        time.Time `json:"expires_at" gorm:"column:expires_at"`
	Status           string    `json:"status" gorm:"column:status;size:20;default:'ACTIVE'"` // 'ACTIVE', 'SETTLED', 'EXPIRED'
	CreatedBy        *string   `json:"created_by" gorm:"column:created_by;type:uuid"`
	CreatedAt        time.Time `json:"created_at" gorm:"column:created_at"`

	// Joined relations
	Customer       *Customer       `json:"customer,omitempty" gorm:"foreignKey:CustomerID"`
	ServiceAccount *ServiceAccount `json:"service_account,omitempty" gorm:"foreignKey:ServiceAccountID"`
}

func (PromiseToPay) TableName() string {
	return "promise_to_pay"
}

// --- DTOs ---

type GenerateInvoicesRequest struct {
	Month string `json:"month"` // e.g. "2026-09"
}

type GenerateInvoicesResponse struct {
	GeneratedCount int       `json:"generated_count"`
	TotalAmount    float64   `json:"total_amount"`
	Invoices       []Invoice `json:"invoices"`
}

type BkashCreatePaymentRequest struct {
	InvoiceID string `json:"invoice_id" binding:"required"`
}

type BkashCreatePaymentResponse struct {
	PaymentID    string  `json:"payment_id"`
	InvoiceID    string  `json:"invoice_id"`
	Amount       float64 `json:"amount"`
	BkashURL     string  `json:"bkash_url"`
	CallbackURL  string  `json:"callback_url"`
	IsSimulated  bool    `json:"is_simulated"`
}

type BkashExecutePaymentRequest struct {
	PaymentID string `json:"payment_id" binding:"required"`
	OTP       string `json:"otp"`
	PIN       string `json:"pin"`
}

type NagadInitializePaymentRequest struct {
	InvoiceID string `json:"invoice_id" binding:"required"`
}

type NagadInitializePaymentResponse struct {
	PaymentRefID string  `json:"payment_ref_id"`
	InvoiceID    string  `json:"invoice_id"`
	Amount       float64 `json:"amount"`
	CallbackURL  string  `json:"callback_url"`
	IsSimulated  bool    `json:"is_simulated"`
}

type NagadVerifyPaymentRequest struct {
	PaymentRefID string `json:"payment_ref_id" binding:"required"`
	OTP          string `json:"otp"`
	PIN          string `json:"pin"`
}

type ManualPaymentRequest struct {
	InvoiceID     string  `json:"invoice_id" binding:"required"`
	PaymentMethod string  `json:"payment_method" binding:"required"`
	TransactionID string  `json:"transaction_id"`
	Amount        float64 `json:"amount" binding:"required"`
}

type PromiseToPayRequest struct {
	CustomerID string `json:"customer_id"`
}

type CustomerPortalOverviewDTO struct {
	Customer       Customer            `json:"customer"`
	ServiceAccount ServiceAccount      `json:"service_account"`
	Package        Package             `json:"package"`
	Router         NASRouter           `json:"router"`
	LatestInvoice  *Invoice            `json:"latest_invoice"`
	ActivePromise  *PromiseToPay       `json:"active_promise"`
	RecentPayments []Payment           `json:"recent_payments"`
	UnpaidInvoices []Invoice           `json:"unpaid_invoices"`
	DaysRemaining  int                 `json:"days_remaining"`
}

type ArtificiallyExpireRequest struct {
	CustomerID string `json:"customer_id" binding:"required"`
	Status     string `json:"status"` // 'EXPIRED', 'GRACE', 'SUSPENDED'
}
