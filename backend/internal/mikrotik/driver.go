package mikrotik

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"net"
	"strconv"
	"time"

	"maxzone/internal/domain"

	"github.com/go-routeros/routeros/v3"
)

// RouterOSDriver abstracts real and simulated RouterOS devices
type RouterOSDriver interface {
	Ping(ctx context.Context) (time.Duration, error)
	GetSystemResource(ctx context.Context) (*domain.SystemResourceDTO, error)
	GetActiveSessions(ctx context.Context) ([]domain.ActiveSessionDTO, error)
	CreatePPPoEServer(ctx context.Context, name, iface, profile string) error
	SetAddressList(ctx context.Context, listName string, ip string, comment string) error
	RemoveAddressList(ctx context.Context, listName string, ip string) error
}

// NewDriver constructs either a Simulated or Real driver depending on configuration
func NewDriver(router *domain.NASRouter, globalSimulation bool) RouterOSDriver {
	if router.IsSimulated || globalSimulation {
		return &SimulatedDriver{router: router}
	}
	return &RealDriver{router: router}
}

// ==============================================================================
// 1. SIMULATED DRIVER (For Development, CI/CD, and Verification)
// ==============================================================================

type SimulatedDriver struct {
	router *domain.NASRouter
}

func (s *SimulatedDriver) Ping(ctx context.Context) (time.Duration, error) {
	// Realistic micro-jitter between 1.1ms and 1.7ms
	jitter := time.Duration(1100+rand.Intn(600)) * time.Microsecond
	select {
	case <-time.After(jitter):
		return jitter, nil
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}

func (s *SimulatedDriver) GetSystemResource(ctx context.Context) (*domain.SystemResourceDTO, error) {
	// Slight variation to reflect realistic live telemetry
	cpuLoad := 12 + rand.Intn(5) // 12% - 16%
	return &domain.SystemResourceDTO{
		Uptime:           "45d 08:34:12",
		Version:          "7.14.3 (stable)",
		Platform:         "MikroTik",
		BoardName:        "CCR2004-16G-2S+",
		CPULoad:          cpuLoad,
		CPUCount:         4,
		FreeMemoryBytes:  1736704000,          // ~1.73 GB free
		TotalMemoryBytes: 2048 * 1024 * 1024,  // 2048 MB
		FreeHDDBytes:     108003328,
		TotalHDDBytes:    134217728,
		ArchitectureName: "arm64",
	}, nil
}

func (s *SimulatedDriver) GetActiveSessions(ctx context.Context) ([]domain.ActiveSessionDTO, error) {
	now := time.Now()
	return []domain.ActiveSessionDTO{
		{
			ID:          "sim-sess-001",
			Username:    "karim_fiber",
			IPAddress:   "10.10.20.51",
			MACAddress:  "48:8F:5A:11:22:33",
			CallerID:    "48:8F:5A:11:22:33",
			Uptime:      "2d 04:12:00",
			BytesIn:     4823910000,
			BytesOut:    18932000000,
			RateLimit:   "20M/20M",
			Service:     "pppoe",
			ConnectedAt: now.Add(-52 * time.Hour),
		},
		{
			ID:          "sim-sess-002",
			Username:    "hasan_speed",
			IPAddress:   "10.10.20.52",
			MACAddress:  "C4:AD:34:55:66:77",
			CallerID:    "C4:AD:34:55:66:77",
			Uptime:      "14h 22:18",
			BytesIn:     1204800000,
			BytesOut:    4592000000,
			RateLimit:   "30M/30M",
			Service:     "pppoe",
			ConnectedAt: now.Add(-14 * time.Hour),
		},
		{
			ID:          "sim-sess-003",
			Username:    "tariq_home",
			IPAddress:   "10.10.20.53",
			MACAddress:  "70:4F:57:88:99:AA",
			CallerID:    "70:4F:57:88:99:AA",
			Uptime:      "5d 11:45:00",
			BytesIn:     9840200000,
			BytesOut:    34290000000,
			RateLimit:   "15M/15M",
			Service:     "pppoe",
			ConnectedAt: now.Add(-131 * time.Hour),
		},
		{
			ID:          "sim-sess-004",
			Username:    "nasir_corp",
			IPAddress:   "10.10.20.54",
			MACAddress:  "00:0C:42:BB:CC:DD",
			CallerID:    "00:0C:42:BB:CC:DD",
			Uptime:      "18d 02:00:10",
			BytesIn:     45000000000,
			BytesOut:    180000000000,
			RateLimit:   "50M/50M",
			Service:     "pppoe",
			ConnectedAt: now.Add(-434 * time.Hour),
		},
		{
			ID:          "sim-sess-005",
			Username:    "sumon_online",
			IPAddress:   "10.10.20.55",
			MACAddress:  "B8:69:F4:EE:FF:11",
			CallerID:    "B8:69:F4:EE:FF:11",
			Uptime:      "06:33:40",
			BytesIn:     320100000,
			BytesOut:    980400000,
			RateLimit:   "25M/25M",
			Service:     "pppoe",
			ConnectedAt: now.Add(-6 * time.Hour),
		},
	}, nil
}

func (s *SimulatedDriver) CreatePPPoEServer(ctx context.Context, name, iface, profile string) error {
	log.Printf("[SIMULATOR] Created PPPoE server '%s' on iface '%s' with profile '%s'", name, iface, profile)
	return nil
}

func (s *SimulatedDriver) SetAddressList(ctx context.Context, listName string, ip string, comment string) error {
	log.Printf("[SIMULATOR] Added IP '%s' to firewall address-list '%s' (%s)", ip, listName, comment)
	return nil
}

func (s *SimulatedDriver) RemoveAddressList(ctx context.Context, listName string, ip string) error {
	log.Printf("[SIMULATOR] Removed IP '%s' from firewall address-list '%s'", ip, listName)
	return nil
}

// ==============================================================================
// 2. REAL DRIVER (Production RouterOS Socket & API Connection)
// ==============================================================================

type RealDriver struct {
	router *domain.NASRouter
}

func (r *RealDriver) dial(ctx context.Context) (*routeros.Client, error) {
	port := r.router.APIPort
	if port <= 0 {
		port = 8728
	}
	addr := net.JoinHostPort(r.router.IPAddress, strconv.Itoa(port))

	d := net.Dialer{Timeout: 3 * time.Second}
	conn, err := d.DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("failed to reach router %s: %w", addr, err)
	}

	client, err := routeros.NewClient(conn)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to init routeros client: %w", err)
	}

	if err := client.Login(r.router.APIUsername, r.router.APIPasswordEncrypted); err != nil {
		client.Close()
		return nil, fmt.Errorf("router authentication failed: %w", err)
	}

	return client, nil
}

func (r *RealDriver) Ping(ctx context.Context) (time.Duration, error) {
	start := time.Now()
	port := r.router.APIPort
	if port <= 0 {
		port = 8728
	}
	addr := net.JoinHostPort(r.router.IPAddress, strconv.Itoa(port))

	d := net.Dialer{Timeout: 2 * time.Second}
	conn, err := d.DialContext(ctx, "tcp", addr)
	if err != nil {
		return 0, err
	}
	_ = conn.Close()
	return time.Since(start), nil
}

func (r *RealDriver) GetSystemResource(ctx context.Context) (*domain.SystemResourceDTO, error) {
	client, err := r.dial(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	reply, err := client.Run("/system/resource/print")
	if err != nil {
		return nil, err
	}
	if len(reply.Re) == 0 {
		return nil, fmt.Errorf("empty response from /system/resource/print")
	}

	re := reply.Re[0]
	cpuLoad, _ := strconv.Atoi(re.Map["cpu-load"])
	cpuCount, _ := strconv.Atoi(re.Map["cpu-count"])
	freeMem, _ := strconv.ParseInt(re.Map["free-memory"], 10, 64)
	totalMem, _ := strconv.ParseInt(re.Map["total-memory"], 10, 64)
	freeHdd, _ := strconv.ParseInt(re.Map["free-hdd-space"], 10, 64)
	totalHdd, _ := strconv.ParseInt(re.Map["total-hdd-space"], 10, 64)

	return &domain.SystemResourceDTO{
		Uptime:           re.Map["uptime"],
		Version:          re.Map["version"],
		Platform:         re.Map["platform"],
		BoardName:        re.Map["board-name"],
		CPULoad:          cpuLoad,
		CPUCount:         cpuCount,
		FreeMemoryBytes:  freeMem,
		TotalMemoryBytes: totalMem,
		FreeHDDBytes:     freeHdd,
		TotalHDDBytes:    totalHdd,
		ArchitectureName: re.Map["architecture-name"],
	}, nil
}

func (r *RealDriver) GetActiveSessions(ctx context.Context) ([]domain.ActiveSessionDTO, error) {
	client, err := r.dial(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	reply, err := client.Run("/ppp/active/print")
	if err != nil {
		return nil, err
	}

	sessions := make([]domain.ActiveSessionDTO, 0, len(reply.Re))
	for _, re := range reply.Re {
		sessions = append(sessions, domain.ActiveSessionDTO{
			ID:          re.Map[".id"],
			Username:    re.Map["name"],
			IPAddress:   re.Map["address"],
			CallerID:    re.Map["caller-id"],
			Uptime:      re.Map["uptime"],
			Service:     re.Map["service"],
			ConnectedAt: time.Now(),
		})
	}
	return sessions, nil
}

func (r *RealDriver) CreatePPPoEServer(ctx context.Context, name, iface, profile string) error {
	client, err := r.dial(ctx)
	if err != nil {
		return err
	}
	defer client.Close()

	_, err = client.Run(
		"/interface/pppoe-server/server/add",
		"=service-name="+name,
		"=interface="+iface,
		"=default-profile="+profile,
		"=one-session-per-host=yes",
	)
	return err
}

func (r *RealDriver) SetAddressList(ctx context.Context, listName string, ip string, comment string) error {
	client, err := r.dial(ctx)
	if err != nil {
		return err
	}
	defer client.Close()

	_, err = client.Run(
		"/ip/firewall/address-list/add",
		"=list="+listName,
		"=address="+ip,
		"=comment="+comment,
	)
	return err
}

func (r *RealDriver) RemoveAddressList(ctx context.Context, listName string, ip string) error {
	client, err := r.dial(ctx)
	if err != nil {
		return err
	}
	defer client.Close()

	// Find entry id
	reply, err := client.Run(
		"/ip/firewall/address-list/print",
		"?list="+listName,
		"?address="+ip,
	)
	if err != nil || len(reply.Re) == 0 {
		return err
	}

	id := reply.Re[0].Map[".id"]
	if id != "" {
		_, err = client.Run("/ip/firewall/address-list/remove", "=.id="+id)
		return err
	}
	return nil
}
