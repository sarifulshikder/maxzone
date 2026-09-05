package service

import (
	"context"
	"strings"
	"testing"

	"maxzone/internal/domain"
	"maxzone/internal/repository"
)

func TestNormalizeMAC(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"00:1B:44:11:3A:B7", "001B44113AB7"},
		{"00-1B-44-11-3A-B7", "001B44113AB7"},
		{"001b44113ab7", "001B44113AB7"},
		{"001B44113AB7", "001B44113AB7"},
		{"garbage", ""},
		{"", ""},
	}
	for _, c := range cases {
		got := normalizeMAC(c.in)
		if got != c.want {
			t.Errorf("normalizeMAC(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestGetONUSignalRequiresMAC(t *testing.T) {
	svc := NewGisService(repository.NewGisRepository(nil))
	_, err := svc.GetONUSignal(context.Background(), "")
	if err == nil {
		t.Fatal("expected error for empty MAC")
	}
	if !strings.Contains(err.Error(), "MAC_ADDRESS_REQUIRED") {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestTJBoxAvailable(t *testing.T) {
	box := domain.TJBox{PortsUsed: 6, MaxPorts: 8}
	if box.Available() != 2 {
		t.Errorf("TJBox{6/8}.Available() = %d, want 2", box.Available())
	}
	over := domain.TJBox{PortsUsed: 9, MaxPorts: 8}
	if over.Available() != 0 {
		t.Errorf("over-provisioned box should clamp to 0, got %d", over.Available())
	}
}