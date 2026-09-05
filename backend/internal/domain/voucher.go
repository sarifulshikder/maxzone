package domain

import "time"

// HotspotVoucher is a PIN a subscriber redeems on the captive portal
type HotspotVoucher struct {
	ID           string     `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Pin          string     `json:"pin" gorm:"size:30;uniqueIndex"`
	PlanName     string     `json:"plan_name" gorm:"size:100;not null"`
	DataLimit    string     `json:"data_limit" gorm:"size:30;default:'UNLIMITED'"`
	ValidityDays int        `json:"validity_days" gorm:"default:15"`
	PriceBDT     float64    `json:"price_bdt" gorm:"numeric(12,2);default:0"`
	IsUsed       bool       `json:"is_used" gorm:"default:false"`
	UsedByPhone  *string    `json:"used_by_phone" gorm:"size:20"`
	UsedMAC      *string    `json:"used_mac" gorm:"size:20"`
	UsedAt       *time.Time `json:"used_at"`
	CreatedAt    time.Time  `json:"created_at"`
}

func (HotspotVoucher) TableName() string { return "hotspot_vouchers" }

// HotspotOTP is a simulated SMS one-time-password for the captive portal
type HotspotOTP struct {
	ID        string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Phone     string    `json:"phone" gorm:"size:20;not null;index"`
	Code      string    `json:"code" gorm:"size:6;not null"`
	ExpiresAt time.Time `json:"expires_at"`
	Used      bool      `json:"used" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
}

func (HotspotOTP) TableName() string { return "hotspot_otps" }

// --- DTOs ---

// HotspotVoucherLoginRequest redeems a voucher PIN on the captive portal
type HotspotVoucherLoginRequest struct {
	Pin   string `json:"pin" binding:"required"`
	Phone string `json:"phone"`
	MAC   string `json:"mac"`
}

// HotspotOTPRequestRequest asks the gateway to SMS an OTP to a phone number
type HotspotOTPRequestRequest struct {
	Phone string `json:"phone" binding:"required"`
}

// HotspotOTPVerifyRequest validates the OTP the subscriber received
type HotspotOTPVerifyRequest struct {
	Phone string `json:"phone" binding:"required"`
	Code  string `json:"code" binding:"required"`
}

// HotspotSession is a successful portal login (simulated RADIUS/CoA handshake)
type HotspotSession struct {
	Method       string  `json:"method"` // 'VOUCHER' | 'OTP'
	Phone        *string `json:"phone"`
	MAC          *string `json:"mac"`
	PlanName     string  `json:"plan_name"`
	DataLimit    string  `json:"data_limit"`
	ValidityDays int     `json:"validity_days"`
	SessionID    string  `json:"session_id"`
	ExpiresAt    string  `json:"expires_at"`
	Note         string  `json:"note"`
}

// HotspotOTPRequestResponse returns the OTP request result; in dev the OTP
// is echoed back because no real SMS gateway is configured.
type HotspotOTPRequestResponse struct {
	Sent     bool   `json:"sent"`
	Phone    string `json:"phone"`
	ExpiresInSec int `json:"expires_in_sec"`
	DevCode  string `json:"dev_code"` // simulated gateway — real SMS would not expose this
}