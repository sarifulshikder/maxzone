package mikrotik

import (
	"context"
	"testing"
	"time"

	"maxzone/internal/domain"
)

func TestSimulatedDriver_Ping(t *testing.T) {
	router := &domain.NASRouter{
		Name:        "Test Router",
		IPAddress:   "10.0.0.1",
		IsSimulated: true,
	}
	driver := NewDriver(router, false)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	latency, err := driver.Ping(ctx)
	if err != nil {
		t.Fatalf("expected ping to succeed, got %v", err)
	}
	if latency <= 0 {
		t.Errorf("expected positive latency, got %v", latency)
	}
}

func TestSimulatedDriver_GetSystemResource(t *testing.T) {
	router := &domain.NASRouter{
		Name:        "Test Router",
		IPAddress:   "10.0.0.1",
		IsSimulated: true,
	}
	driver := NewDriver(router, false)

	ctx := context.Background()
	res, err := driver.GetSystemResource(ctx)
	if err != nil {
		t.Fatalf("failed to get system resource: %v", err)
	}

	if res.BoardName == "" {
		t.Errorf("expected non-empty board name")
	}
	if res.CPULoad < 0 || res.CPULoad > 100 {
		t.Errorf("invalid CPU load: %d", res.CPULoad)
	}
	if res.TotalMemoryBytes <= 0 {
		t.Errorf("expected positive total memory, got %d", res.TotalMemoryBytes)
	}
}

func TestSimulatedDriver_GetActiveSessions(t *testing.T) {
	router := &domain.NASRouter{
		Name:        "Test Router",
		IPAddress:   "10.0.0.1",
		IsSimulated: true,
	}
	driver := NewDriver(router, false)

	ctx := context.Background()
	sessions, err := driver.GetActiveSessions(ctx)
	if err != nil {
		t.Fatalf("failed to get active sessions: %v", err)
	}

	if len(sessions) == 0 {
		t.Fatalf("expected simulated sessions, got 0")
	}

	first := sessions[0]
	if first.Username == "" || first.IPAddress == "" {
		t.Errorf("session missing required fields: %+v", first)
	}
}

func TestSimulatedDriver_Commands(t *testing.T) {
	router := &domain.NASRouter{
		Name:        "Test Router",
		IPAddress:   "10.0.0.1",
		IsSimulated: true,
	}
	driver := NewDriver(router, false)
	ctx := context.Background()

	if err := driver.CreatePPPoEServer(ctx, "pppoe-srv", "ether1", "default"); err != nil {
		t.Errorf("CreatePPPoEServer failed: %v", err)
	}
	if err := driver.SetAddressList(ctx, "expired_users", "10.10.20.50", "Expired"); err != nil {
		t.Errorf("SetAddressList failed: %v", err)
	}
	if err := driver.RemoveAddressList(ctx, "expired_users", "10.10.20.50"); err != nil {
		t.Errorf("RemoveAddressList failed: %v", err)
	}
}
