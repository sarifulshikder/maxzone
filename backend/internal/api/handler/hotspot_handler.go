package handler

import (
	"net/http"
	"strings"

	"maxzone/internal/domain"
	"maxzone/internal/service"

	"github.com/gin-gonic/gin"
)

// HotspotHandler exposes the public captive portal login endpoints
type HotspotHandler struct {
	hotspotService service.HotspotService
}

func NewHotspotHandler(hotspotService service.HotspotService) *HotspotHandler {
	return &HotspotHandler{hotspotService: hotspotService}
}

// LoginWithVoucher redeems a voucher PIN on the captive portal
func (h *HotspotHandler) LoginWithVoucher(c *gin.Context) {
	var req domain.HotspotVoucherLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "INVALID_PAYLOAD", "message": "PIN is required"},
		})
		return
	}
	session, err := h.hotspotService.LoginWithVoucher(c.Request.Context(), req)
	if err != nil {
		h.voucherError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": session})
}

// RequestOTP simulates sending an SMS code to a phone
func (h *HotspotHandler) RequestOTP(c *gin.Context) {
	var req domain.HotspotOTPRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "INVALID_PAYLOAD", "message": "Phone number is required"},
		})
		return
	}
	resp, err := h.hotspotService.RequestOTP(c.Request.Context(), req.Phone)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "OTP_REQUEST_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": resp})
}

// VerifyOTP opens a session once the subscriber confirms the SMS code
func (h *HotspotHandler) VerifyOTP(c *gin.Context) {
	var req domain.HotspotOTPVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "INVALID_PAYLOAD", "message": "Phone and code are required"},
		})
		return
	}
	session, err := h.hotspotService.VerifyOTP(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "OTP_VERIFY_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": session})
}

func (h *HotspotHandler) voucherError(c *gin.Context, err error) {
	code := "INVALID_VOUCHER_PIN"
	statusCode := http.StatusBadRequest
	msg := err.Error()
	switch {
	case strings.Contains(msg, "PHONE_REQUIRED"):
		code = "PHONE_REQUIRED"
	case strings.Contains(msg, "ALREADY_USED"):
		code = "VOUCHER_ALREADY_USED"
		statusCode = http.StatusConflict
	}
	c.JSON(statusCode, gin.H{
		"success": false,
		"error":   gin.H{"code": code, "message": msg},
	})
}