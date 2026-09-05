package olt

import (
	"context"
	"fmt"
	"hash/fnv"
	"log"
	"math/rand"
	"strings"
	"time"

	"maxzone/internal/domain"
)

// SimulatedDriver generates deterministic synthetic GPON telemetry for the
// connected OLT so the entire Phase 6 workflow can be exercised without
// hardware. Values are seeded by the OLT IP so polls are repeatable.
type SimulatedDriver struct {
	olt *domain.OLT
}

func newSeeded(parts ...string) *rand.Rand {
	h := fnv.New64a()
	for _, p := range parts {
		h.Write([]byte(p))
		h.Write([]byte{0})
	}
	return rand.New(rand.NewSource(int64(h.Sum64())))
}

func (s *SimulatedDriver) Ping(ctx context.Context) (time.Duration, error) {
	jitter := time.Duration(800+newSeeded(s.olt.IPAddress).Intn(600)) * time.Microsecond
	select {
	case <-time.After(jitter):
		return jitter, nil
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}

func (s *SimulatedDriver) GetSystemInfo(ctx context.Context) (*domain.OLTSystemInfoDTO, error) {
	version := map[string]string{
		domain.VendorHuawei: "V300R022C10SPC100",
		domain.VendorZTE:    "ZXG100-PON_V2.0.2",
		domain.VendorVSOL:   "V100R001C20B011",
		domain.VendorBDCOM:  "V3.13.2.9",
	}[s.olt.Vendor]
	if version == "" {
		version = "V1.0.0"
	}
	model := s.olt.Model
	if model == "" {
		model = map[string]string{
			domain.VendorHuawei: "MA5800-X7",
			domain.VendorZTE:    "C320",
			domain.VendorVSOL:   "OLT3610-08",
			domain.VendorBDCOM:  "P3608-OLT",
		}[s.olt.Vendor]
		if model == "" {
			model = "GPON-OLT"
		}
	}
	return &domain.OLTSystemInfoDTO{
		Vendor:          s.olt.Vendor,
		Model:           model,
		SoftwareVersion: version,
		Uptime:          "216d 14:32:05",
		SerialNumber:    fmt.Sprintf("%s%06d", "OLTX", newSeeded(s.olt.IPAddress, "sn").Intn(999999)),
	}, nil
}

func (s *SimulatedDriver) DiscoverPorts(ctx context.Context) ([]domain.OLTPONInfoDTO, error) {
	ports := make([]domain.OLTPONInfoDTO, 0, 8)
	for p := 1; p <= 8; p++ {
		count := s.portONUCount(p)
		ports = append(ports, domain.OLTPONInfoDTO{
			Frame:        0,
			Slot:         1,
			Port:         p,
			OnboardedONT: count,
			MaxONTs:      64,
		})
	}
	return ports, nil
}

// portONUCount returns a deterministic active-ONU count for a GPON port.
func (s *SimulatedDriver) portONUCount(port int) int {
	if port == 1 {
		return 42
	}
	return 8 + newSeeded(s.olt.IPAddress, "port", fmt.Sprint(port)).Intn(34)
}

func (s *SimulatedDriver) DiscoverONUs(ctx context.Context, pon domain.OLTPONInfoDTO) ([]domain.ONTInfoDTO, error) {
	count := s.portONUCount(pon.Port)
	if count <= 0 {
		return nil, nil
	}

	onus := make([]domain.ONTInfoDTO, 0, count)
	base := 99887724
	for i := 1; i <= count; i++ {
		serialI := base + i
		serial := fmt.Sprintf("HWTC%08d", serialI)

		onu := domain.ONTInfoDTO{
			SerialNumber: serial,
			MACAddress:   simMAC(serial),
			Status:       domain.ONUStatusOnline,
			Registered:   i <= 5,
		}

		switch i {
		case 1:
			onu.Name = "ASP-MD-RAHIM"
		case 2:
			onu.Name = "ASP-HASAN-BALA"
		case 3:
			onu.Name = "ASP-NASHIR-HOME"
		case 4:
			onu.Name = "ASP-SULTAN-APT"
		case 5:
			onu.Name = "ASP-GHULAM-CORP"
		}

		switch {
		case i == 1:
			rx := -18.9
			onu.RXPowerDB = &rx
		case i == 2:
			rx := -25.1
			onu.RXPowerDB = &rx
		case i%11 == 0:
			onu.Status = domain.ONUStatusLOS
			rx := -32.4
			onu.RXPowerDB = &rx
		default:
			rr := newSeeded(serial)
			rxV := -16.0 - rr.Float64()*12.5
			if rr.Intn(100) < 14 {
				rxV -= 3.0
			}
			onu.RXPowerDB = &rxV
		}

		tx := 0.6 + newSeeded(serial, "tx").Float64()*1.5
		temp := 38 + newSeeded(serial, "t").Float64()*20
		dist := 420 + newSeeded(serial, "d").Float64()*1800
		onu.TXPowerDB = &tx
		onu.TemperatureC = &temp
		onu.DistanceM = &dist

		// The last unit (HWTC...766) is freshly discovered and parked in the
		// discovery queue until a technician authorizes it.
		if strings.HasSuffix(serial, "766") {
			onu.Registered = false
			onu.Status = domain.ONUStatusDiscovered
			onu.Name = ""
		}

		onus = append(onus, onu)
	}
	return onus, nil
}

func (s *SimulatedDriver) AuthorizeONU(ctx context.Context, serial string) error {
	log.Printf("[OLT-SIM] Authorize ONU %s on %s", serial, s.olt.IPAddress)
	return nil
}

func simMAC(seed string) string {
	rr := newSeeded(seed, "mac")
	hex := "0123456789ABCDEF"
	parts := make([]string, 6)
	for i := 0; i < 6; i++ {
		b := ""
		for j := 0; j < 2; j++ {
			b += string(hex[rr.Intn(len(hex))])
		}
		parts[i] = b
	}
	switch parts[0] {
	case "00", "FF", "01":
		parts[0] = "48"
	}
	return strings.Join(parts, ":")
}