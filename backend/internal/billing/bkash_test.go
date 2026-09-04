package billing

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"testing"
)

func TestBkashDriver_SimulatedFlow(t *testing.T) {
	driver := NewSimulatedBkashDriver()

	sess, err := driver.CreatePayment("inv-123", 1000.00, "INV-202609-0001")
	if err != nil {
		t.Fatalf("failed to create payment session: %v", err)
	}

	if !strings.HasPrefix(sess.PaymentID, "BKASH-SIM-") {
		t.Errorf("expected simulated payment ID prefix, got %s", sess.PaymentID)
	}

	res, err := driver.ExecutePayment(sess.PaymentID, "123456", "12345")
	if err != nil {
		t.Fatalf("failed to execute payment: %v", err)
	}

	if res.Status != "Completed" {
		t.Errorf("expected status Completed, got %s", res.Status)
	}

	if !strings.HasPrefix(res.TransactionID, "BKA") {
		t.Errorf("expected transaction ID starting with BKA, got %s", res.TransactionID)
	}
}

func TestBkashDriver_VerifySignature(t *testing.T) {
	driver := NewSimulatedBkashDriver()

	payload := []byte(`{"amount":1000,"currency":"BDT","invoice":"INV-202609-0001"}`)
	secret := "bkash_secret_key_123"

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	validSig := hex.EncodeToString(mac.Sum(nil))

	if !driver.VerifySignature(payload, validSig, secret) {
		t.Error("expected valid signature to pass")
	}

	if driver.VerifySignature(payload, "invalid_signature", secret) {
		t.Error("expected invalid signature to fail")
	}
}
