package domain

import (
	"fmt"
	"time"
)

// Package represents an Internet bandwidth subscription tier
type Package struct {
	ID                string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Name              string    `json:"name" gorm:"size:100;not null"`
	ServiceType       string    `json:"service_type" gorm:"size:20;not null;default:'PPPOE'"` // 'PPPOE', 'HOTSPOT', 'STATIC'
	DownloadSpeedKbps int       `json:"download_speed_kbps" gorm:"not null"`
	UploadSpeedKbps   int       `json:"upload_speed_kbps" gorm:"not null"`
	RateLimitString   string    `json:"rate_limit_string" gorm:"size:100;not null"`
	ValidityDays      int       `json:"validity_days" gorm:"not null;default:30"`
	Price             float64   `json:"price" gorm:"type:decimal(10,2);not null"`
	WholesalePrice    float64   `json:"wholesale_price" gorm:"column:wholesale_price;type:decimal(10,2);not null;default:0.00"`
	FUPEnabled        bool      `json:"fup_enabled" gorm:"column:fup_enabled;default:false"`
	FUPQuotaBytes     *int64    `json:"fup_quota_bytes" gorm:"column:fup_quota_bytes"`
	FUPReducedRate    *string   `json:"fup_reduced_rate" gorm:"column:fup_reduced_rate;size:50"`
	IsActive          bool      `json:"is_active" gorm:"column:is_active;default:true"`
	CreatedAt         time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt         time.Time `json:"updated_at" gorm:"column:updated_at"`
}

func (Package) TableName() string {
	return "packages"
}

// Helper to format Mbps or Kbps into standard MikroTik Rate Limit string
// e.g., 30M/30M or with burst: 30M/30M 45M/45M 20M/20M 10/10 8 15M/15M
func FormatSpeedString(kbps int) string {
	if kbps >= 1024 && kbps%1024 == 0 {
		return fmt.Sprintf("%dM", kbps/1024)
	}
	return fmt.Sprintf("%dk", kbps)
}

type CreatePackageRequest struct {
	Name              string  `json:"name" binding:"required"`
	ServiceType       string  `json:"service_type"` // Defaults to PPPOE
	DownloadSpeedKbps int     `json:"download_speed_kbps" binding:"required"`
	UploadSpeedKbps   int     `json:"upload_speed_kbps" binding:"required"`
	RateLimitString   string  `json:"rate_limit_string"` // Optional, auto-generated if empty
	ValidityDays      int     `json:"validity_days"`      // Defaults to 30
	Price             float64 `json:"price" binding:"required"`
	WholesalePrice    float64 `json:"wholesale_price"`
	FUPEnabled        bool    `json:"fup_enabled"`
	FUPQuotaBytes     *int64  `json:"fup_quota_bytes"`
	FUPReducedRate    *string `json:"fup_reduced_rate"`
}

type UpdatePackageRequest struct {
	Name              string   `json:"name"`
	ServiceType       string   `json:"service_type"`
	DownloadSpeedKbps int      `json:"download_speed_kbps"`
	UploadSpeedKbps   int      `json:"upload_speed_kbps"`
	RateLimitString   string   `json:"rate_limit_string"`
	ValidityDays      int      `json:"validity_days"`
	Price             float64  `json:"price"`
	WholesalePrice    float64  `json:"wholesale_price"`
	FUPEnabled        *bool    `json:"fup_enabled"`
	FUPQuotaBytes     *int64   `json:"fup_quota_bytes"`
	FUPReducedRate    *string  `json:"fup_reduced_rate"`
	IsActive          *bool    `json:"is_active"`
}

// IPPool represents an IP range configured on a NAS
type IPPool struct {
	ID           string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	NASID        string    `json:"nas_id" gorm:"column:nas_id;type:uuid;not null"`
	Name         string    `json:"name" gorm:"column:name;size:100;not null"`
	CIDRRange    string    `json:"cidr_range" gorm:"column:cidr_range;type:cidr;not null"`
	GatewayIP    string    `json:"gateway_ip" gorm:"column:gateway_ip;type:inet;not null"`
	DNSPrimary   string    `json:"dns_primary" gorm:"column:dns_primary;type:inet;default:'8.8.8.8'"`
	DNSSecondary string    `json:"dns_secondary" gorm:"column:dns_secondary;type:inet;default:'1.1.1.1'"`
	PoolType     string    `json:"pool_type" gorm:"column:pool_type;size:20;default:'PPPOE'"`
	CreatedAt    time.Time `json:"created_at" gorm:"column:created_at"`
}

func (IPPool) TableName() string {
	return "ip_pools"
}
