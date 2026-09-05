package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"os"
	"time"

	"maxzone/internal/domain"
	"maxzone/internal/olt"
	"maxzone/internal/repository"
)

type OLTService interface {
	ListOLTs(ctx context.Context) ([]domain.OLT, error)
	GetOLT(ctx context.Context, id string) (*domain.OLT, error)
	CreateOLT(ctx context.Context, req domain.CreateOLTRequest) (*domain.OLT, error)
	UpdateOLT(ctx context.Context, id string, req domain.UpdateOLTRequest) (*domain.OLT, error)
	DeleteOLT(ctx context.Context, id string) error
	TestConnection(ctx context.Context, id string) (*domain.OLTPingResultDTO, error)
	GetOLTDetail(ctx context.Context, id string) (*domain.OLTDetailDTO, error)
	PollPorts(ctx context.Context, id string) (*domain.OLTDetailDTO, error)
	ListDiscoveredONUs(ctx context.Context, id string) ([]domain.ONU, error)
	AuthorizeONU(ctx context.Context, oltID, onuID string) (*domain.ONU, error)
	UpdateONU(ctx context.Context, oltID, onuID string, req domain.UpdateONURequest) (*domain.ONU, error)
}

type oltService struct {
	oltRepo          repository.OLTRepository
	globalSimulation bool
}

func NewOLTService(oltRepo repository.OLTRepository) OLTService {
	globalSim := os.Getenv("OLT_SIMULATION_MODE") == "true"
	return &oltService{
		oltRepo:          oltRepo,
		globalSimulation: globalSim,
	}
}

func (s *oltService) ListOLTs(ctx context.Context) ([]domain.OLT, error) {
	return s.oltRepo.FindAll(ctx)
}

func (s *oltService) GetOLT(ctx context.Context, id string) (*domain.OLT, error) {
	device, err := s.oltRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if device == nil {
		return nil, errors.New("OLT not found")
	}
	return device, nil
}

func (s *oltService) CreateOLT(ctx context.Context, req domain.CreateOLTRequest) (*domain.OLT, error) {
	vendor := req.Vendor
	if vendor == "" {
		vendor = domain.VendorHuawei
	}
	snmpVersion := req.SNMPVersion
	if snmpVersion == "" {
		snmpVersion = "v2c"
	}
	port := req.SNMPPort
	if port <= 0 {
		port = 161
	}
	community := req.SNMPCommunity
	if community == "" && snmpVersion == "v2c" {
		community = "public"
	}

	device := &domain.OLT{
		Name:              req.Name,
		Vendor:            vendor,
		Model:             req.Model,
		IPAddress:         req.IPAddress,
		SNMPVersion:       snmpVersion,
		SNMPPort:          port,
		SNMPCommunity:     community,
		SNMPUsername:      req.SNMPUsername,
		SNMPAuthProtocol:  req.AuthProtocol,
		SNMPAuthPassword:  req.AuthPassword,
		SNMPPrivProtocol:  req.PrivProtocol,
		SNMPPrivPassword:  req.PrivPassword,
		OIDProfile:        req.OIDProfile,
		IsSimulated:       req.IsSimulated || s.globalSimulation,
		IsActive:          true,
		LastStatus:        domain.OLTStatusUnknown,
	}

	if err := s.oltRepo.Create(ctx, device); err != nil {
		return nil, fmt.Errorf("failed to create OLT: %w", err)
	}
	return device, nil
}

func (s *oltService) UpdateOLT(ctx context.Context, id string, req domain.UpdateOLTRequest) (*domain.OLT, error) {
	device, err := s.oltRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if device == nil {
		return nil, errors.New("OLT not found")
	}

	if req.Name != "" {
		device.Name = req.Name
	}
	if req.Vendor != "" {
		device.Vendor = req.Vendor
	}
	if req.Model != "" {
		device.Model = req.Model
	}
	if req.IPAddress != "" {
		device.IPAddress = req.IPAddress
	}
	if req.SNMPVersion != "" {
		device.SNMPVersion = req.SNMPVersion
	}
	if req.SNMPPort > 0 {
		device.SNMPPort = req.SNMPPort
	}
	if req.SNMPCommunity != "" {
		device.SNMPCommunity = req.SNMPCommunity
	}
	if req.SNMPUsername != "" {
		device.SNMPUsername = req.SNMPUsername
	}
	if req.AuthProtocol != "" {
		device.SNMPAuthProtocol = req.AuthProtocol
	}
	if req.AuthPassword != "" {
		device.SNMPAuthPassword = req.AuthPassword
	}
	if req.PrivProtocol != "" {
		device.SNMPPrivProtocol = req.PrivProtocol
	}
	if req.PrivPassword != "" {
		device.SNMPPrivPassword = req.PrivPassword
	}
	if req.OIDProfile != "" {
		device.OIDProfile = req.OIDProfile
	}
	device.IsSimulated = req.IsSimulated
	if req.IsActive != nil {
		device.IsActive = *req.IsActive
	}

	if err := s.oltRepo.Update(ctx, device); err != nil {
		return nil, fmt.Errorf("failed to update OLT: %w", err)
	}
	return device, nil
}

func (s *oltService) DeleteOLT(ctx context.Context, id string) error {
	return s.oltRepo.Delete(ctx, id)
}

func (s *oltService) TestConnection(ctx context.Context, id string) (*domain.OLTPingResultDTO, error) {
	device, err := s.getOLTCheck(ctx, id)
	if err != nil {
		return nil, err
	}

	driver := olt.NewDriver(device, s.globalSimulation)
	latency, pingErr := driver.Ping(ctx)

	status := domain.OLTStatusOnline
	now := time.Now()
	if pingErr != nil {
		status = domain.OLTStatusOffline
	}
	_ = s.oltRepo.UpdateStatus(ctx, id, status, now)

	latencyMs := math.Round(float64(latency.Microseconds())/10.0) / 100.0

	result := &domain.OLTPingResultDTO{
		Status:          status,
		LatencyMS:       latencyMs,
		Vendor:          device.Vendor,
		Model:           device.Model,
		SoftwareVersion: "N/A",
		Uptime:          "N/A",
	}

	if pingErr != nil {
		return result, nil
	}

	sysInfo, infoErr := driver.GetSystemInfo(ctx)
	if infoErr != nil {
		return result, nil
	}
	if sysInfo != nil {
		result.Vendor = sysInfo.Vendor
		if sysInfo.Model != "" {
			result.Model = sysInfo.Model
		}
		result.SoftwareVersion = sysInfo.SoftwareVersion
		result.Uptime = sysInfo.Uptime
	}
	return result, nil
}

func (s *oltService) GetOLTDetail(ctx context.Context, id string) (*domain.OLTDetailDTO, error) {
	device, err := s.getOLTCheck(ctx, id)
	if err != nil {
		return nil, err
	}

	vals, err := s.loadDetail(ctx, device)
	if err != nil {
		return nil, err
	}
	return vals, nil
}

func (s *oltService) PollPorts(ctx context.Context, id string) (*domain.OLTDetailDTO, error) {
	device, err := s.getOLTCheck(ctx, id)
	if err != nil {
		return nil, err
	}

	driver := olt.NewDriver(device, s.globalSimulation)

	now := time.Now()
	if _, pingErr := driver.Ping(ctx); pingErr != nil {
		_ = s.oltRepo.UpdateStatus(ctx, id, domain.OLTStatusOffline, now)
		return nil, fmt.Errorf("OLT unreachable over SNMP: %w", pingErr)
	}

	ports, err := driver.DiscoverPorts(ctx)
	if err != nil {
		_ = s.oltRepo.UpdateStatus(ctx, id, domain.OLTStatusError, now)
		return nil, fmt.Errorf("failed to discover PON ports: %w", err)
	}

	for _, pon := range ports {
		portRow, perr := s.oltRepo.FindPONPortByPath(ctx, device.ID, pon.Frame, pon.Slot, pon.Port)
		if perr != nil {
			return nil, perr
		}
		if portRow == nil {
			portRow = &domain.PONPort{
				OLTID:   device.ID,
				Frame:   pon.Frame,
				Slot:    pon.Slot,
				Port:    pon.Port,
				Name:    pon.Name(),
				MaxONTs: pon.MaxONTs,
				IsActive: true,
			}
			if err := s.oltRepo.CreatePONPort(ctx, portRow); err != nil {
				return nil, fmt.Errorf("failed to persist PON port %s: %w", pon.Name(), err)
			}
		} else if pon.MaxONTs > 0 && portRow.MaxONTs != pon.MaxONTs {
			portRow.MaxONTs = pon.MaxONTs
			if err := s.oltRepo.UpdatePONPort(ctx, portRow); err != nil {
				return nil, err
			}
		}

		onts, oerr := driver.DiscoverONUs(ctx, pon)
		if oerr != nil {
			// One broken port should not fail the whole poll.
			continue
		}

		active := len(onts)
		for _, ont := range onts {
			existing, uerr := s.oltRepo.FindBySerial(ctx, device.ID, ont.SerialNumber)
			if uerr != nil {
				return nil, uerr
			}

			health := domain.EvaluateOpticalHealth(ont.RXPowerDB)

			if existing == nil {
				onu := &domain.ONU{
					OLTID:            device.ID,
					PONPortID:        portRow.ID,
					SerialNumber:     ont.SerialNumber,
					Name:             ont.Name,
					MACAddress:       ont.MACAddress,
					RXPowerDB:        ont.RXPowerDB,
					TXPowerDB:        ont.TXPowerDB,
					TemperatureC:     ont.TemperatureC,
					DistanceM:        ont.DistanceM,
					Status:           ont.Status,
					Health:           health,
					Registered:       ont.Registered,
					LastDiscoveredAt: &now,
					LastPolledAt:     &now,
				}
				if err := s.oltRepo.CreateONU(ctx, onu); err != nil {
					return nil, fmt.Errorf("failed to persist ONU %s: %w", ont.SerialNumber, err)
				}
			} else {
				existing.Status = ont.Status
				existing.Health = health
				existing.RXPowerDB = ont.RXPowerDB
				existing.TXPowerDB = ont.TXPowerDB
				existing.TemperatureC = ont.TemperatureC
				existing.DistanceM = ont.DistanceM
				if existing.Name == "" {
					existing.Name = ont.Name
				}
				if existing.MACAddress == "" {
					existing.MACAddress = ont.MACAddress
				}
				// Keep local authorization state authoritative.
				existing.Registered = existing.Registered || ont.Registered
				existing.LastPolledAt = &now
				if err := s.oltRepo.UpdateONU(ctx, existing); err != nil {
					return nil, err
				}
			}
		}

		if portRow.OnboardedONT != active {
			portRow.OnboardedONT = active
			if err := s.oltRepo.UpdatePONPort(ctx, portRow); err != nil {
				return nil, err
			}
		}
	}

	_ = s.oltRepo.UpdateStatus(ctx, id, domain.OLTStatusOnline, now)

	return s.loadDetail(ctx, device)
}

func (s *oltService) ListDiscoveredONUs(ctx context.Context, id string) ([]domain.ONU, error) {
	if _, err := s.getOLTCheck(ctx, id); err != nil {
		return nil, err
	}
	return s.oltRepo.ListUnregisteredONUs(ctx, id)
}

func (s *oltService) AuthorizeONU(ctx context.Context, oltID, onuID string) (*domain.ONU, error) {
	device, err := s.getOLTCheck(ctx, oltID)
	if err != nil {
		return nil, err
	}
	onu, err := s.oltRepo.FindONU(ctx, onuID)
	if err != nil {
		return nil, err
	}
	if onu == nil {
		return nil, errors.New("ONU not found")
	}
	if onu.OLTID != device.ID {
		return nil, errors.New("ONU does not belong to the given OLT")
	}

	// Best-effort hardware push; local registration always succeeds.
	driver := olt.NewDriver(device, s.globalSimulation)
	_ = driver.AuthorizeONU(ctx, onu.SerialNumber)

	now := time.Now()
	onu.Registered = true
	onu.LastPolledAt = &now
	if onu.Name == "" {
		onu.Name = onu.SerialNumber
	}
	if err := s.oltRepo.UpdateONU(ctx, onu); err != nil {
		return nil, err
	}
	return onu, nil
}

func (s *oltService) UpdateONU(ctx context.Context, oltID, onuID string, req domain.UpdateONURequest) (*domain.ONU, error) {
	onu, err := s.findONUInOLT(ctx, oltID, onuID)
	if err != nil {
		return nil, err
	}
	if req.Name != "" {
		onu.Name = req.Name
	}
	if req.MACAddress != "" {
		onu.MACAddress = req.MACAddress
	}
	if req.Registered != nil {
		onu.Registered = *req.Registered
	}
	if err := s.oltRepo.UpdateONU(ctx, onu); err != nil {
		return nil, err
	}
	return onu, nil
}

// --- helpers ---

func (s *oltService) getOLTCheck(ctx context.Context, id string) (*domain.OLT, error) {
	device, err := s.oltRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if device == nil {
		return nil, errors.New("OLT not found")
	}
	return device, nil
}

func (s *oltService) findONUInOLT(ctx context.Context, oltID, onuID string) (*domain.ONU, error) {
	onu, err := s.oltRepo.FindONU(ctx, onuID)
	if err != nil {
		return nil, err
	}
	if onu == nil {
		return nil, errors.New("ONU not found")
	}
	if oltID != "" && onu.OLTID != oltID {
		return nil, errors.New("ONU does not belong to the given OLT")
	}
	return onu, nil
}

func (s *oltService) loadDetail(ctx context.Context, device *domain.OLT) (*domain.OLTDetailDTO, error) {
	ports, err := s.oltRepo.ListPONPorts(ctx, device.ID)
	if err != nil {
		return nil, err
	}

	portDTOs := make([]domain.OLTDetailPortDTO, 0, len(ports))
	totalONUs := 0
	var unregistered int

	for _, p := range ports {
		onus, oerr := s.oltRepo.ListONUsByPort(ctx, p.ID)
		if oerr != nil {
			return nil, oerr
		}
		totalONUs += len(onus)
		for _, onu := range onus {
			if !onu.Registered {
				unregistered++
			}
		}
		portDTOs = append(portDTOs, domain.OLTDetailPortDTO{
			ID:           p.ID,
			Name:         p.Name,
			Frame:        p.Frame,
			Slot:         p.Slot,
			Port:         p.Port,
			OnboardedONT: p.OnboardedONT,
			MaxONTs:      p.MaxONTs,
			Onus:         onus,
		})
	}

	queue, err := s.oltRepo.ListUnregisteredONUs(ctx, device.ID)
	if err != nil {
		return nil, err
	}

	return &domain.OLTDetailDTO{
		OLT:             device,
		Ports:           portDTOs,
		DiscoveredQueue: queue,
		TotalONUs:       totalONUs,
		UnregisteredONU: unregistered,
	}, nil
}