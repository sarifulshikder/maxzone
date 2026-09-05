package service

import (
	"context"
	"errors"
	"strings"

	"maxzone/internal/domain"
	"maxzone/internal/repository"
)

// GisService assembles the FTTH fiber map and powers the field technician portal
type GisService interface {
	GetMapData(ctx context.Context) (*domain.GISMapData, error)
	FindNearestBox(ctx context.Context, lat, lng float64) (*domain.NearestBoxResult, error)
	GetONUSignal(ctx context.Context, rawMAC string) (*domain.ONUSignalDTO, error)
	ListFieldTasks(ctx context.Context) ([]domain.FieldTask, error)
}

type gisService struct {
	gisRepo *repository.GisRepository
}

func NewGisService(gisRepo *repository.GisRepository) GisService {
	return &gisService{gisRepo: gisRepo}
}

// GetMapData returns the full GIS payload for the admin fiber map
func (s *gisService) GetMapData(ctx context.Context) (*domain.GISMapData, error) {
	olts, err := s.gisRepo.ListOLTSnapshot(ctx)
	if err != nil {
		return nil, err
	}
	splitters, err := s.gisRepo.ListSplitters(ctx)
	if err != nil {
		return nil, err
	}
	boxes, err := s.gisRepo.ListTJBoxes(ctx)
	if err != nil {
		return nil, err
	}
	cables, err := s.gisRepo.ListFiberCables(ctx)
	if err != nil {
		return nil, err
	}

	data := &domain.GISMapData{
		Olts:      olts,
		Splitters: make([]domain.GISSplitter, 0, len(splitters)),
		Boxes:     make([]domain.GISTJBox, 0, len(boxes)),
		Cables:    make([]domain.GISCable, 0, len(cables)),
	}
	for _, sp := range splitters {
		g := domain.GISSplitter{Splitter: sp, Available: sp.MaxPorts - sp.PortsUsed}
		data.Splitters = append(data.Splitters, g)
	}
	for _, b := range boxes {
		g := domain.GISTJBox{TJBox: b, Available: b.Available()}
		data.Boxes = append(data.Boxes, g)
	}
	for _, c := range cables {
		from := [2]float64{}
		to := [2]float64{}
		if c.LatitudeStart != nil && c.LongitudeStart != nil {
			from = [2]float64{*c.LatitudeStart, *c.LongitudeStart}
		}
		if c.LatitudeEnd != nil && c.LongitudeEnd != nil {
			to = [2]float64{*c.LatitudeEnd, *c.LongitudeEnd}
		}
		data.Cables = append(data.Cables, domain.GISCable{
			ID:          c.ID,
			Name:        c.Name,
			CableType:   c.CableType,
			CoreCount:   c.CoreCount,
			JacketColor: c.JacketColor,
			FromNode:    c.FromNode,
			ToNode:      c.ToNode,
			From:        from,
			To:          to,
		})
	}
	return data, nil
}

// FindNearestBox locates the closest TJ box to a technician GPS fix
func (s *gisService) FindNearestBox(ctx context.Context, lat, lng float64) (*domain.NearestBoxResult, error) {
	box, distance, err := s.gisRepo.NearestTJBox(ctx, lat, lng)
	if err != nil {
		return nil, err
	}
	g := domain.GISTJBox{TJBox: box, Available: box.Available()}
	return &domain.NearestBoxResult{
		Box:       g,
		DistanceM: distance,
	}, nil
}

// GetONUSignal returns the live optical reading for a field technician MAC lookup
func (s *gisService) GetONUSignal(ctx context.Context, rawMAC string) (*domain.ONUSignalDTO, error) {
	mac := normalizeMAC(rawMAC)
	if mac == "" {
		return nil, errors.New("MAC_ADDRESS_REQUIRED")
	}
	signal, err := s.gisRepo.FindONUByMAC(ctx, mac)
	if err != nil {
		return nil, err
	}
	if signal == nil {
		return nil, errors.New("ONU_NOT_FOUND")
	}
	return signal, nil
}

// ListFieldTasks returns the technician task queue: network nodes needing service
func (s *gisService) ListFieldTasks(ctx context.Context) ([]domain.FieldTask, error) {
	boxes, err := s.gisRepo.ListTJBoxes(ctx)
	if err != nil {
		return nil, err
	}
	splitters, err := s.gisRepo.ListSplitters(ctx)
	if err != nil {
		return nil, err
	}

	tasks := []domain.FieldTask{}
	for _, b := range boxes {
		if b.NeedsService {
			tasks = append(tasks, domain.FieldTask{
				Type:      "BOX",
				ID:        b.ID,
				Name:      b.Name,
				Code:      b.Code,
				Address:   b.Address,
				PortsUsed: b.PortsUsed,
				MaxPorts:  b.MaxPorts,
				Latitude:  b.Latitude,
				Longitude: b.Longitude,
			})
		}
	}
	for _, sp := range splitters {
		if sp.NeedsService {
			tasks = append(tasks, domain.FieldTask{
				Type:      "SPLITTER",
				ID:        sp.ID,
				Name:      sp.Name,
				Code:      sp.Code,
				Address:   sp.Address,
				PortsUsed: sp.PortsUsed,
				MaxPorts:  sp.MaxPorts,
				Latitude:  sp.Latitude,
				Longitude: sp.Longitude,
			})
		}
	}
	return tasks, nil
}

// normalizeMAC strips separators and uppercases a MAC address
func normalizeMAC(raw string) string {
	var sb strings.Builder
	for _, r := range raw {
		if (r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F') {
			sb.WriteRune(r)
		}
	}
	result := strings.ToUpper(sb.String())
	if len(result) != 12 {
		return ""
	}
	return result
}