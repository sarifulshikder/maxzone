package handler

import (
	"net/http"

	"maxzone/internal/api/middleware"
	"maxzone/internal/domain"
	"maxzone/internal/service"

	"github.com/gin-gonic/gin"
)

// AuthHandler handles all auth-related HTTP requests
type AuthHandler struct {
	authSvc *service.AuthService
}

func NewAuthHandler(authSvc *service.AuthService) *AuthHandler {
	return &AuthHandler{authSvc: authSvc}
}

// Login godoc handles POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req domain.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "VALIDATION_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	resp, err := h.authSvc.Login(&req, ipAddress, userAgent)
	if err != nil {
		msg := "Authentication failed"
		code := "AUTH_FAILED"
		switch err.Error() {
		case "INVALID_CREDENTIALS":
			msg = "Invalid username or password"
			code = "INVALID_CREDENTIALS"
		case "ACCOUNT_DISABLED":
			msg = "Your account has been disabled. Contact support."
			code = "ACCOUNT_DISABLED"
		}
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   gin.H{"code": code, "message": msg},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    resp,
	})
}

// Refresh handles POST /api/v1/auth/refresh
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req domain.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "VALIDATION_FAILED", "message": err.Error()},
		})
		return
	}

	resp, err := h.authSvc.Refresh(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   gin.H{"code": "INVALID_REFRESH_TOKEN", "message": "Refresh token is invalid or expired. Please log in again."},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    resp,
	})
}

// Logout handles POST /api/v1/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	var req domain.RefreshRequest
	_ = c.ShouldBindJSON(&req) // optional body

	userIDVal, exists := c.Get(middleware.ContextKeyUserID)
	if exists {
		userID := userIDVal.(string)
		if req.RefreshToken != "" {
			_ = h.authSvc.Logout(userID, req.RefreshToken)
		} else {
			_ = h.authSvc.LogoutAll(userID)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Logged out successfully"},
	})
}

// Me returns the current authenticated user info
func (h *AuthHandler) Me(c *gin.Context) {
	userIDVal, exists := c.Get(middleware.ContextKeyUserID)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   gin.H{"code": "UNAUTHORIZED", "message": "Unauthorized"},
		})
		return
	}

	userID := userIDVal.(string)
	userInfo, err := h.authSvc.GetUserInfo(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   gin.H{"code": "USER_NOT_FOUND", "message": "User not found"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": userInfo,
		},
	})
}
