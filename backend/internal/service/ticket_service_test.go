package service

import (
	"testing"

	"maxzone/internal/domain"
)

func TestNormalizeEnum(t *testing.T) {
	cases := []struct {
		value, fallback string
		allowed         []string
		want            string
	}{
		{"connectivity", "OTHER", []string{"BILLING", "CONNECTIVITY", "EQUIPMENT", "INSTALLATION", "OTHER"}, "CONNECTIVITY"},
		{"urgent", "MEDIUM", []string{"LOW", "MEDIUM", "HIGH", "URGENT"}, "URGENT"},
		{"WEIRD", "OTHER", []string{"BILLING", "CONNECTIVITY", "EQUIPMENT", "OTHER"}, "OTHER"},
		{"", "OTHER", []string{"BILLING", "CONNECTIVITY", "OTHER"}, "OTHER"},
	}
	for _, c := range cases {
		if got := normalizeEnum(c.value, c.fallback, c.allowed); got != c.want {
			t.Errorf("normalizeEnum(%q) = %q, want %q", c.value, got, c.want)
		}
	}
}

func TestValidTicketStatuses(t *testing.T) {
	for _, s := range []string{domain.TicketStatusOpen, domain.TicketStatusInProgress, domain.TicketStatusResolved, domain.TicketStatusClosed} {
		if !validTicketStatuses[s] {
			t.Errorf("expected %q to be a valid ticket status", s)
		}
	}
	if validTicketStatuses["NOPE"] {
		t.Error("unexpected status should be invalid")
	}
}

func TestRandomCodeLength(t *testing.T) {
	code, err := randomCode(6)
	if err != nil {
		t.Fatalf("randomCode error: %v", err)
	}
	if len(code) != 6 {
		t.Errorf("randomCode length = %d, want 6", len(code))
	}
}