package billing

import (
	"testing"
	"time"
)

func TestCalculateProRata(t *testing.T) {
	// Sept has 30 days. Activated on 15th: 30 - 15 + 1 = 16 days.
	// 1000 / 30 * 16 = 533.33
	activation := time.Date(2026, time.September, 15, 10, 0, 0, 0, time.UTC)
	charge := CalculateProRata(1000.00, activation)

	expected := 533.33
	if charge != expected {
		t.Errorf("expected pro-rata charge %.2f, got %.2f", expected, charge)
	}

	// Activated on 1st of month: full charge 1000
	activation1st := time.Date(2026, time.September, 1, 0, 0, 0, 0, time.UTC)
	charge1st := CalculateProRata(1000.00, activation1st)
	if charge1st != 1000.00 {
		t.Errorf("expected full month charge 1000.00, got %.2f", charge1st)
	}
}

func TestFormatInvoiceNumber(t *testing.T) {
	ref := time.Date(2026, time.September, 1, 0, 0, 0, 0, time.UTC)
	invNum := FormatInvoiceNumber(ref, 1)
	expected := "INV-202609-0001"
	if invNum != expected {
		t.Errorf("expected invoice number '%s', got '%s'", expected, invNum)
	}
}

func TestDaysInMonth(t *testing.T) {
	if days := DaysInMonth(2026, time.February); days != 28 {
		t.Errorf("expected 28 days in Feb 2026, got %d", days)
	}
	if days := DaysInMonth(2026, time.September); days != 30 {
		t.Errorf("expected 30 days in Sept 2026, got %d", days)
	}
}
