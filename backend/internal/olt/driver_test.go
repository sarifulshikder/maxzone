package olt

import (
	"context"
	"strings"
	"testing"
	"time"

	"maxzone/internal/domain"
)

func simOLT(vendor string) *domain.OLT {
	return &domain.OLT{
		Name:        "Sim OLT",
		Vendor:      vendor,
		Model:       "MA5800-X7",
		IPAddress:   "10.20.0.1",
		IsSimulated: true,
	}
}

func TestSimulatedDriver_Ping(t *testing.T) {
	driver := NewDriver(simOLT(domain.VendorHuawei), false)

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

func TestSimulatedDriver_GetSystemInfo(t *testing.T) {
	driver := NewDriver(simOLT(domain.VendorHuawei), false)

	info, err := driver.GetSystemInfo(context.Background())
	if err != nil {
		t.Fatalf("GetSystemInfo failed: %v", err)
	}
	if info.Vendor != domain.VendorHuawei {
		t.Errorf("vendor = %q, want %q", info.Vendor, domain.VendorHuawei)
	}
	if info.Model == "" || info.SoftwareVersion == "" {
		t.Errorf("expected model and version, got %+v", info)
	}
}

func TestSimulatedDriver_DiscoverPorts(t *testing.T) {
	driver := NewDriver(simOLT(domain.VendorHuawei), false)

	ports, err := driver.DiscoverPorts(context.Background())
	if err != nil {
		t.Fatalf("DiscoverPorts failed: %v", err)
	}
	if len(ports) == 0 {
		t.Fatal("expected PON ports, got 0")
	}

	found := false
	for _, p := range ports {
		if p.Frame == 0 && p.Slot == 1 && p.Port == 1 {
			found = true
			if p.OnboardedONT != 42 {
				t.Errorf("PON 0/1/1 onboarded = %d, want 42", p.OnboardedONT)
			}
			if p.MaxONTs != 64 {
				t.Errorf("PON 0/1/1 max onts = %d, want 64", p.MaxONTs)
			}
		}
		if p.Name() == "" || !strings.HasPrefix(p.Name(), "PON ") {
			t.Errorf("invalid port name %q", p.Name())
		}
	}
	if !found {
		t.Error("expected GPON port 0/1/1 in discovered ports")
	}
}

func TestSimulatedDriver_DiscoverONUs(t *testing.T) {
	driver := NewDriver(simOLT(domain.VendorHuawei), false)

	onus, err := driver.DiscoverONUs(context.Background(), domain.OLTPONInfoDTO{
		Frame: 0, Slot: 1, Port: 1, MaxONTs: 64,
	})
	if err != nil {
		t.Fatalf("DiscoverONUs failed: %v", err)
	}
	if len(onus) != 42 {
		t.Fatalf("expected 42 onus on 0/1/1, got %d", len(onus))
	}

	bySerial := map[string]domain.ONTInfoDTO{}
	for _, o := range onus {
		if o.SerialNumber == "" {
			t.Error("onu missing serial number")
		}
		bySerial[o.SerialNumber] = o
	}

	// Headline walkthrough values must hold deterministically.
	if o, ok := bySerial["HWTC99887725"]; ok {
		if o.RXPowerDB == nil || *o.RXPowerDB != -18.9 {
			t.Errorf("HWTC99887725 rx = %v, want -18.9", o.RXPowerDB)
		}
		if got := domain.EvaluateOpticalHealth(o.RXPowerDB); got != domain.HealthOptimal {
			t.Errorf("HWTC99887725 health = %q, want OPTIMAL", got)
		}
	}
	if o, ok := bySerial["HWTC99887726"]; ok {
		if o.RXPowerDB == nil || *o.RXPowerDB != -25.1 {
			t.Errorf("HWTC99887726 rx = %v, want -25.1", o.RXPowerDB)
		}
		if got := domain.EvaluateOpticalHealth(o.RXPowerDB); got != domain.HealthWarning {
			t.Errorf("HWTC99887726 health = %q, want WARNING", got)
		}
	}

	// The unassigned unit must land in the discovery queue.
	if o, ok := bySerial["HWTC99887766"]; !ok {
		t.Error("expected discovery-queue ONU HWTC99887766")
	} else if o.Registered {
		t.Error("HWTC99887766 must start unregistered")
	}
}

func TestSimulatedDriver_Deterministic(t *testing.T) {
	driver := NewDriver(simOLT(domain.VendorHuawei), false)
	ctx := context.Background()

	first, err := driver.DiscoverONUs(ctx, domain.OLTPONInfoDTO{Slot: 1, Port: 2, MaxONTs: 64})
	if err != nil {
		t.Fatal(err)
	}
	second, err := driver.DiscoverONUs(ctx, domain.OLTPONInfoDTO{Slot: 1, Port: 2, MaxONTs: 64})
	if err != nil {
		t.Fatal(err)
	}
	if len(first) != len(second) {
		t.Fatalf("count drifted between polls: %d vs %d", len(first), len(second))
	}
	for i := range first {
		if first[i].SerialNumber != second[i].SerialNumber {
			t.Errorf("serial drifted at %d: %s vs %s", i, first[i].SerialNumber, second[i].SerialNumber)
		}
	}
}

func TestProfileFor(t *testing.T) {
	cases := []struct {
		vendor  string
		profile string
		wantErr bool
	}{
		{domain.VendorHuawei, "default", false},
		{domain.VendorZTE, "", false},
		{domain.VendorVSOL, "", false},
		{domain.VendorBDCOM, "", false},
		{"CISCO", "", true},
	}
	for _, tc := range cases {
		olt := &domain.OLT{Vendor: tc.vendor, OIDProfile: tc.profile}
		_, err := profileFor(olt)
		if tc.wantErr && err == nil {
			t.Errorf("vendor %q expected profile error, got none", tc.vendor)
		}
		if !tc.wantErr && err != nil {
			t.Errorf("vendor %q unexpected error: %v", tc.vendor, err)
		}
	}
}

func TestExtractIndexes(t *testing.T) {
	got, err := extractIndexes("1.2.3.4", "1.2.3.4.5.6.7")
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 3 || got[0] != 5 || got[1] != 6 || got[2] != 7 {
		t.Errorf("extractIndexes = %v, want [5 6 7]", got)
	}
}