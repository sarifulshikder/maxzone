package service

import (
	"context"
	"crypto/rand"
	"errors"
	"strings"
	"time"

	"maxzone/internal/domain"
	"maxzone/internal/repository"
)

// HotspotService powers the captive portal voucher + SMS OTP login flows
type HotspotService interface {
	LoginWithVoucher(ctx context.Context, req domain.HotspotVoucherLoginRequest) (*domain.HotspotSession, error)
	RequestOTP(ctx context.Context, phone string) (*domain.HotspotOTPRequestResponse, error)
	VerifyOTP(ctx context.Context, req domain.HotspotOTPVerifyRequest) (*domain.HotspotSession, error)
}

type hotspotService struct {
	hotspotRepo *repository.HotspotRepository
}

func NewHotspotService(hotspotRepo *repository.HotspotRepository) HotspotService {
	return &hotspotService{hotspotRepo: hotspotRepo}
}

// LoginWithVoucher validates and redeems a voucher PIN, returning a simulated
// captive-portal session. In production this would trigger a RADIUS CoA to
// open an internet session for the subscriber's MAC.
func (s *hotspotService) LoginWithVoucher(ctx context.Context, req domain.HotspotVoucherLoginRequest) (*domain.HotspotSession, error) {
	pin := strings.ToUpper(strings.TrimSpace(req.Pin))
	if pin == "" {
		return nil, errors.New("PIN_REQUIRED")
	}

	voucher, err := s.hotspotRepo.FindVoucherByPin(ctx, pin)
	if err != nil {
		return nil, errors.New("INVALID_VOUCHER_PIN")
	}
	if voucher.IsUsed {
		return nil, errors.New("VOUCHER_ALREADY_USED")
	}

	phone := strings.TrimSpace(req.Phone)
	if phone == "" {
		return nil, errors.New("PHONE_REQUIRED")
	}

	if err := s.hotspotRepo.RedeemVoucher(ctx, voucher.ID, phone, strings.TrimSpace(req.MAC)); err != nil {
		return nil, err
	}

	sessionID, err := randomHex(16)
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(time.Duration(voucher.ValidityDays) * 24 * time.Hour).UTC().Format(time.RFC3339)

	return &domain.HotspotSession{
		Method:       "VOUCHER",
		Phone:        &phone,
		MAC:          strPtrOrNil(req.MAC),
		PlanName:     voucher.PlanName,
		DataLimit:    voucher.DataLimit,
		ValidityDays: voucher.ValidityDays,
		SessionID:    sessionID,
		ExpiresAt:    expiresAt,
		Note:         "Simulated captive portal session — production flow triggers RADIUS CoA",
	}, nil
}

// RequestOTP issues a simulated SMS code (dev response echoes the code)
func (s *hotspotService) RequestOTP(ctx context.Context, phone string) (*domain.HotspotOTPRequestResponse, error) {
	phone = strings.TrimSpace(phone)
	if phone == "" {
		return nil, errors.New("PHONE_REQUIRED")
	}

	code, err := randomCode(6)
	if err != nil {
		return nil, err
	}

	otp := &domain.HotspotOTP{
		Phone:     phone,
		Code:      code,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	if err := s.hotspotRepo.CreateOTP(ctx, otp); err != nil {
		return nil, err
	}

	return &domain.HotspotOTPRequestResponse{
		Sent:         true,
		Phone:        phone,
		ExpiresInSec: 300,
		DevCode:      code,
	}, nil
}

// VerifyOTP checks a subscriber's SMS code and opens a simulated session
func (s *hotspotService) VerifyOTP(ctx context.Context, req domain.HotspotOTPVerifyRequest) (*domain.HotspotSession, error) {
	phone := strings.TrimSpace(req.Phone)
	code := strings.TrimSpace(req.Code)
	if phone == "" || code == "" {
		return nil, errors.New("PHONE_AND_CODE_REQUIRED")
	}

	otp, err := s.hotspotRepo.FindLatestActiveOTP(ctx, phone)
	if err != nil {
		return nil, errors.New("INVALID_OR_EXPIRED_OTP")
	}
	if otp.Code != code {
		return nil, errors.New("INVALID_OR_EXPIRED_OTP")
	}
	if err := s.hotspotRepo.MarkOTPUsed(ctx, otp.ID); err != nil {
		return nil, err
	}

	sessionID, err := randomHex(16)
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(24 * time.Hour).UTC().Format(time.RFC3339)

	return &domain.HotspotSession{
		Method:       "OTP",
		Phone:        &phone,
		PlanName:     "Pay-As-You-Go 1 Day Session",
		DataLimit:    "UNLIMITED",
		ValidityDays: 1,
		SessionID:    sessionID,
		ExpiresAt:    expiresAt,
		Note:         "Simulated OTP session — production flow triggers RADIUS CoA",
	}, nil
}

func randomCode(n int) (string, error) {
	digits := "0123456789"
	b := make([]byte, n)
	rb := make([]byte, n)
	if _, err := rand.Read(rb); err != nil {
		return "", err
	}
	for i, v := range rb {
		b[i] = digits[int(v)%len(digits)]
	}
	return string(b), nil
}

func randomHex(n int) (string, error) {
	b := make([]byte, n/2)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	const hexChars = "0123456789abcdef"
	out := make([]byte, n)
	for i, v := range b {
		out[i*2] = hexChars[v>>4]
		out[i*2+1] = hexChars[v&0x0f]
	}
	return string(out), nil
}

func strPtrOrNil(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}