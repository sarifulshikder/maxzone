package billing

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/rand"
	"time"
)

type BkashDriver interface {
	CreatePayment(invoiceID string, amount float64, invoiceNumber string) (*BkashPaymentSession, error)
	ExecutePayment(paymentID string, otp, pin string) (*BkashExecuteResult, error)
	VerifySignature(payload []byte, signature, secretKey string) bool
}

type BkashPaymentSession struct {
	PaymentID    string  `json:"payment_id"`
	InvoiceID    string  `json:"invoice_id"`
	Amount       float64 `json:"amount"`
	BkashURL     string  `json:"bkash_url"`
	CallbackURL  string  `json:"callback_url"`
	IsSimulated  bool    `json:"is_simulated"`
}

type BkashExecuteResult struct {
	PaymentID     string    `json:"payment_id"`
	TransactionID string    `json:"transaction_id"`
	Amount        float64   `json:"amount"`
	Currency      string    `json:"currency"`
	Status        string    `json:"status"` // 'Completed'
	CustomerMsisdn string   `json:"customer_msisdn"`
	CompletedAt   time.Time `json:"completed_at"`
}

type simulatedBkashDriver struct {
	sessions map[string]*BkashPaymentSession
}

func NewSimulatedBkashDriver() BkashDriver {
	return &simulatedBkashDriver{
		sessions: make(map[string]*BkashPaymentSession),
	}
}

func (b *simulatedBkashDriver) CreatePayment(invoiceID string, amount float64, invoiceNumber string) (*BkashPaymentSession, error) {
	paymentID := fmt.Sprintf("BKASH-SIM-%d-%04d", time.Now().Unix(), rand.Intn(9000)+1000)
	session := &BkashPaymentSession{
		PaymentID:   paymentID,
		InvoiceID:   invoiceID,
		Amount:      amount,
		BkashURL:    fmt.Sprintf("https://sandbox.bkash.com/checkout?paymentID=%s", paymentID),
		CallbackURL: fmt.Sprintf("/api/v1/billing/pay/bkash/callback?paymentID=%s", paymentID),
		IsSimulated: true,
	}
	b.sessions[paymentID] = session
	return session, nil
}

func (b *simulatedBkashDriver) ExecutePayment(paymentID string, otp, pin string) (*BkashExecuteResult, error) {
	session, exists := b.sessions[paymentID]
	amount := 1000.00
	if exists {
		amount = session.Amount
	}

	// Generate realistic bKash TrxID e.g. "BKA99X7821"
	chars := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	trxSuffix := make([]byte, 8)
	for i := range trxSuffix {
		trxSuffix[i] = chars[rand.Intn(len(chars))]
	}
	trxID := "BKA" + string(trxSuffix)

	return &BkashExecuteResult{
		PaymentID:      paymentID,
		TransactionID:  trxID,
		Amount:         amount,
		Currency:       "BDT",
		Status:         "Completed",
		CustomerMsisdn: "017XXXXXXXX",
		CompletedAt:    time.Now(),
	}, nil
}

func (b *simulatedBkashDriver) VerifySignature(payload []byte, signature, secretKey string) bool {
	mac := hmac.New(sha256.New, []byte(secretKey))
	mac.Write(payload)
	expectedMAC := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedMAC))
}
