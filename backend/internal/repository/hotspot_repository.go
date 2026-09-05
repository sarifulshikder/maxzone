package repository

import (
	"context"
	"time"

	"maxzone/internal/domain"

	"gorm.io/gorm"
)

// HotspotRepository persists CAP portal vouchers and SMS OTP codes
type HotspotRepository struct {
	db *gorm.DB
}

func NewHotspotRepository(db *gorm.DB) *HotspotRepository {
	return &HotspotRepository{db: db}
}

// FindVoucherByPin returns a voucher regardless of usage state
func (r *HotspotRepository) FindVoucherByPin(ctx context.Context, pin string) (*domain.HotspotVoucher, error) {
	var v domain.HotspotVoucher
	if err := r.db.Where("pin = ?", pin).First(&v).Error; err != nil {
		return nil, err
	}
	return &v, nil
}

// RedeemVoucher atomically marks a voucher used
func (r *HotspotRepository) RedeemVoucher(ctx context.Context, id string, phone, mac string) error {
	now := time.Now()
	return r.db.Model(&domain.HotspotVoucher{}).
		Where("id = ? AND is_used = FALSE", id).
		Updates(map[string]interface{}{
			"is_used":       true,
			"used_by_phone": phone,
			"used_mac":      mac,
			"used_at":       now,
		}).Error
}

// CreateOTP stores a simulated SMS code
func (r *HotspotRepository) CreateOTP(ctx context.Context, otp *domain.HotspotOTP) error {
	return r.db.Create(otp).Error
}

// FindLatestActiveOTP returns the freshest unexpired, unused code for a phone
func (r *HotspotRepository) FindLatestActiveOTP(ctx context.Context, phone string) (*domain.HotspotOTP, error) {
	var o domain.HotspotOTP
	if err := r.db.
		Where("phone = ? AND used = FALSE AND expires_at > ?", phone, time.Now()).
		Order("created_at DESC").
		First(&o).Error; err != nil {
		return nil, err
	}
	return &o, nil
}

// MarkOTPUsed invalidates a code
func (r *HotspotRepository) MarkOTPUsed(ctx context.Context, id string) error {
	return r.db.Model(&domain.HotspotOTP{}).
		Where("id = ?", id).
		Update("used", true).Error
}