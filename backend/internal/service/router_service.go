package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net"
	"os"
	"time"

	"maxzone/internal/domain"
	"maxzone/internal/mikrotik"
	"maxzone/internal/radius"
	"maxzone/internal/repository"
)

type RouterService interface {
	ListRouters(ctx context.Context) ([]domain.NASRouter, error)
	GetRouter(ctx context.Context, id string) (*domain.NASRouter, error)
	CreateRouter(ctx context.Context, req domain.CreateRouterRequest) (*domain.NASRouter, error)
	UpdateRouter(ctx context.Context, id string, req domain.UpdateRouterRequest) (*domain.NASRouter, error)
	DeleteRouter(ctx context.Context, id string) error
	PingRouter(ctx context.Context, id string) (*domain.RouterPingResponseDTO, error)
	GetRouterStats(ctx context.Context, id string) (*domain.SystemResourceDTO, []domain.ActiveSessionDTO, error)
	DisconnectSession(ctx context.Context, req domain.DisconnectSessionRequest) error
}

type routerService struct {
	routerRepo       repository.RouterRepository
	globalSimulation bool
}

func NewRouterService(routerRepo repository.RouterRepository) RouterService {
	globalSim := os.Getenv("MIKROTIK_SIMULATION_MODE") == "true"
	return &routerService{
		routerRepo:       routerRepo,
		globalSimulation: globalSim,
	}
}

func (s *routerService) ListRouters(ctx context.Context) ([]domain.NASRouter, error) {
	return s.routerRepo.FindAll(ctx)
}

func (s *routerService) GetRouter(ctx context.Context, id string) (*domain.NASRouter, error) {
	router, err := s.routerRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if router == nil {
		return nil, errors.New("router not found")
	}
	return router, nil
}

func (s *routerService) CreateRouter(ctx context.Context, req domain.CreateRouterRequest) (*domain.NASRouter, error) {
	// Set defaults
	apiPort := req.APIPort
	if apiPort <= 0 {
		apiPort = 8728
	}
	apiSSLPort := req.APISSLPort
	if apiSSLPort <= 0 {
		apiSSLPort = 8729
	}
	coaPort := req.CoAPort
	if coaPort <= 0 {
		coaPort = 3799
	}
	version := req.RouterOSVersion
	if version == "" {
		version = "v7"
	}
	username := req.APIUsername
	if username == "" {
		username = "admin"
	}

	router := &domain.NASRouter{
		Name:                 req.Name,
		IPAddress:            req.IPAddress,
		APIPort:              apiPort,
		APISSLPort:           apiSSLPort,
		APIUsername:          username,
		APIPasswordEncrypted: req.APIPassword,
		RadiusSecret:         req.RadiusSecret,
		CoAPort:              coaPort,
		RouterOSVersion:      version,
		IsSimulated:          req.IsSimulated || s.globalSimulation,
		IsActive:             true,
		LastStatus:           "UNKNOWN",
	}

	if err := s.routerRepo.Create(ctx, router); err != nil {
		return nil, fmt.Errorf("failed to create router: %w", err)
	}

	return router, nil
}

func (s *routerService) UpdateRouter(ctx context.Context, id string, req domain.UpdateRouterRequest) (*domain.NASRouter, error) {
	router, err := s.routerRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if router == nil {
		return nil, errors.New("router not found")
	}

	if req.Name != "" {
		router.Name = req.Name
	}
	if req.IPAddress != "" {
		router.IPAddress = req.IPAddress
	}
	if req.APIPort > 0 {
		router.APIPort = req.APIPort
	}
	if req.APISSLPort > 0 {
		router.APISSLPort = req.APISSLPort
	}
	if req.APIUsername != "" {
		router.APIUsername = req.APIUsername
	}
	if req.APIPassword != "" {
		router.APIPasswordEncrypted = req.APIPassword
	}
	if req.RadiusSecret != "" {
		router.RadiusSecret = req.RadiusSecret
	}
	if req.CoAPort > 0 {
		router.CoAPort = req.CoAPort
	}
	if req.RouterOSVersion != "" {
		router.RouterOSVersion = req.RouterOSVersion
	}
	router.IsSimulated = req.IsSimulated
	if req.IsActive != nil {
		router.IsActive = *req.IsActive
	}

	if err := s.routerRepo.Update(ctx, router); err != nil {
		return nil, fmt.Errorf("failed to update router: %w", err)
	}

	return router, nil
}

func (s *routerService) DeleteRouter(ctx context.Context, id string) error {
	return s.routerRepo.Delete(ctx, id)
}

func (s *routerService) PingRouter(ctx context.Context, id string) (*domain.RouterPingResponseDTO, error) {
	router, err := s.routerRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if router == nil {
		return nil, errors.New("router not found")
	}

	driver := mikrotik.NewDriver(router, s.globalSimulation)
	latency, pingErr := driver.Ping(ctx)

	status := "ONLINE"
	now := time.Now()
	if pingErr != nil {
		status = "OFFLINE"
	}

	// Update status in DB
	_ = s.routerRepo.UpdateStatus(ctx, id, status, now)

	latencyMs := math.Round(float64(latency.Microseconds())/10.0) / 100.0 // rounded to 2 decimal places

	// Fetch live system resources
	res, resErr := driver.GetSystemResource(ctx)
	if resErr != nil || pingErr != nil {
		return &domain.RouterPingResponseDTO{
			Status:            status,
			LatencyMS:         latencyMs,
			CPULoadPercent:    0,
			MemoryUsedMB:      0,
			MemoryTotalMB:     0,
			ActivePPPSessions: 0,
			Uptime:            "N/A",
			BoardName:         "N/A",
		}, nil
	}

	usedMemMB := int((res.TotalMemoryBytes - res.FreeMemoryBytes) / (1024 * 1024))
	totalMemMB := int(res.TotalMemoryBytes / (1024 * 1024))

	sessions, _ := driver.GetActiveSessions(ctx)

	return &domain.RouterPingResponseDTO{
		Status:            "ONLINE",
		LatencyMS:         latencyMs,
		CPULoadPercent:    res.CPULoad,
		MemoryUsedMB:      usedMemMB,
		MemoryTotalMB:     totalMemMB,
		ActivePPPSessions: len(sessions),
		Uptime:            res.Uptime,
		BoardName:         res.BoardName,
	}, nil
}

func (s *routerService) GetRouterStats(ctx context.Context, id string) (*domain.SystemResourceDTO, []domain.ActiveSessionDTO, error) {
	router, err := s.routerRepo.FindByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	if router == nil {
		return nil, nil, errors.New("router not found")
	}

	driver := mikrotik.NewDriver(router, s.globalSimulation)
	res, err := driver.GetSystemResource(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get system resource: %w", err)
	}

	sessions, err := driver.GetActiveSessions(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get active sessions: %w", err)
	}

	return res, sessions, nil
}

func (s *routerService) DisconnectSession(ctx context.Context, req domain.DisconnectSessionRequest) error {
	router, err := s.routerRepo.FindByID(ctx, req.NASID)
	if err != nil {
		return err
	}
	if router == nil {
		return errors.New("router/NAS not found")
	}

	var framedIP net.IP
	if req.UserIP != "" {
		framedIP = net.ParseIP(req.UserIP)
	}

	coaPort := router.CoAPort
	if coaPort <= 0 {
		coaPort = 3799
	}

	return radius.SendDisconnectRequest(
		router.IPAddress,
		coaPort,
		router.RadiusSecret,
		req.Username,
		framedIP,
		router.IsSimulated || s.globalSimulation,
	)
}
