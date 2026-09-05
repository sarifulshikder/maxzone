package repository

import (
	"context"
	"fmt"

	"maxzone/internal/domain"

	"gorm.io/gorm"
)

// GisRepository provides PostGIS-backed access to the FTTH fiber map entities
type GisRepository struct {
	db *gorm.DB
}

func NewGisRepository(db *gorm.DB) *GisRepository {
	return &GisRepository{db: db}
}

// ListOLTSnapshot returns lightweight OLT rows (with geo anchors) for the map
func (r *GisRepository) ListOLTSnapshot(ctx context.Context) ([]domain.GISOLT, error) {
	var rows []domain.GISOLT
	err := r.db.WithContext(ctx).Raw(`
		SELECT id, name, vendor, model, last_status, latitude, longitude
		FROM olts
		WHERE latitude IS NOT NULL AND longitude IS NOT NULL`).
		Scan(&rows).Error
	return rows, err
}

// ListSplitters returns all optical splitters
func (r *GisRepository) ListSplitters(ctx context.Context) ([]domain.Splitter, error) {
	var items []domain.Splitter
	err := r.db.WithContext(ctx).Order("code ASC").Find(&items).Error
	return items, err
}

// ListTJBoxes returns all termination junction boxes
func (r *GisRepository) ListTJBoxes(ctx context.Context) ([]domain.TJBox, error) {
	var items []domain.TJBox
	err := r.db.WithContext(ctx).Order("box_number ASC").Find(&items).Error
	return items, err
}

// ListFiberCables returns all fiber cables (polylines)
func (r *GisRepository) ListFiberCables(ctx context.Context) ([]domain.FiberCable, error) {
	var items []domain.FiberCable
	err := r.db.WithContext(ctx).Order("cable_type DESC, name ASC").Find(&items).Error
	return items, err
}

// NearestTJBox uses PostGIS ST_DistanceSphere to find the closest TJ box
// to the given WGS84 coordinates, returning the great-circle distance in meters.
func (r *GisRepository) NearestTJBox(ctx context.Context, lat, lng float64) (domain.TJBox, float64, error) {
	type nearestResult struct {
		domain.TJBox
		DistanceM float64
	}
	var row nearestResult
	err := r.db.WithContext(ctx).Raw(`
		SELECT id, name, code, box_number, ports_used, max_ports, address, needs_service,
		       latitude, longitude, created_at, updated_at,
		       ST_DistanceSphere(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)) AS distance_m
		FROM tj_boxes
		WHERE latitude IS NOT NULL AND longitude IS NOT NULL
		ORDER BY distance_m ASC
		LIMIT 1`, lng, lat).
		Scan(&row).Error
	if err != nil {
		return row.TJBox, 0, err
	}
	if row.TJBox.ID == "" {
		return row.TJBox, 0, fmt.Errorf("no TJ boxes registered")
	}
	return row.TJBox, row.DistanceM, nil
}

// FindONUByMAC resolves an ONU optical reading by its MAC address (live field meter)
func (r *GisRepository) FindONUByMAC(ctx context.Context, mac string) (*domain.ONUSignalDTO, error) {
	var out domain.ONUSignalDTO
	err := r.db.WithContext(ctx).Raw(`
		SELECT o.serial_number, o.mac_address, ol.name AS olt_name, pp.name AS pon_port,
		       o.status, o.health, o.rx_power_db, o.tx_power_db, o.temperature_c,
		       o.distance_m, o.last_polled_at
		FROM onus o
		JOIN olts ol ON ol.id = o.olt_id
		JOIN pon_ports pp ON pp.id = o.pon_port_id
		WHERE REPLACE(REPLACE(LOWER(o.mac_address), ':', ''), '-', '')
		      = REPLACE(REPLACE(LOWER(?), ':', ''), '-', '')
		LIMIT 1`, mac).
		Scan(&out).Error
	if err != nil {
		return nil, err
	}
	if out.MACAddress == "" {
		return nil, nil
	}
	return &out, nil
}