package billing

import (
	"fmt"
	"math/rand"
	"time"
)

type NagadDriver interface {
	InitializePayment(invoiceID string, amount float64, invoiceNumber string) (*NagadPaymentSession, error)
	VerifyPayment(paymentRefID string, otp, pin string) (*NagadVerifyResult, error)
}

type NagadPaymentSession struct {
	PaymentRefID string  `json:"payment_ref_id"`
	InvoiceID    string  `json:"invoice_id"`
	Amount       float64 `json:"amount"`
	CallbackURL  string  `json:"callback_url"`
	IsSimulated  bool    `json:"is_simulated"`
}

type NagadVerifyResult struct {
	PaymentRefID  string    `json:"payment_ref_id"`
	TransactionID string    `json:"transaction_id"`
	Amount        float64   `json:"amount"`
	Currency      string    `json:"currency"`
	Status        string    `json:"status"` // 'Success'
	CompletedAt   time.Time `json:"completed_at"`
}

type simulatedNagadDriver struct {
	sessions map[string]*NagadPaymentSession
}

func NewSimulatedNagadDriver() NagadDriver {
	return &simulatedNagadDriver{
		sessions: make(map[string]*NagadPaymentSession),
	}
}

func (n *simulatedNagadDriver) InitializePayment(invoiceID string, amount float64, invoiceNumber string) (*NagadPaymentSession, error) {
	refID := fmt.Sprintf("NAGAD-SIM-%d-%04d", time.Now().Unix(), rand.Intn(9000)+1000)
	session := &NagadPaymentSession{
		PaymentRefID: refID,
		InvoiceID:    invoiceID,
		Amount:       amount,
		CallbackURL:  fmt.Sprintf("/api/v1/billing/pay/nagad/callback?payment_ref_id=%s", refID),
		IsSimulated:  true,
	}
	n.sessions[refID] = session
	return session, nil
}

func (n *simulatedNagadDriver) VerifyPayment(paymentRefID string, otp, pin string) (*NagadVerifyResult, error) {
	session, exists := n.sessions[paymentRefID]
	amount := 1000.00
	if exists {
		amount = session.Amount
	}

	chars := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	trxSuffix := make([]byte, 8)
	for i := range trxSuffix {
		trxSuffix[i] = chars[rand.Intn(len(chars))]
	}
	trxID := "NGD" + string(trxSuffix)

	return &NagadVerifyResult{
		PaymentRefID:  paymentRefID,
		TransactionID: trxID,
		Amount:        amount,
		Currency:      "BDT",
		Status:        "Success",
		CompletedAt:   time.Now(),
	}, nil
}
