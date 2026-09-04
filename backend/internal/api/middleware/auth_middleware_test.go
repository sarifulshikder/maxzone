package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"maxzone/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestAuthRequiredMissingHeader(t *testing.T) {
	svc := service.NewAuthService(nil, nil)
	r := gin.New()
	r.Use(AuthRequired(svc))
	r.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req := httptest.NewRequest("GET", "/protected", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 Unauthorized, got %d", w.Code)
	}
}

func TestAuthRequiredValidToken(t *testing.T) {
	svc := service.NewAuthService(nil, nil)

	// Create valid JWT token
	claims := service.JWTClaims{
		UserID:   "11111111-1111-1111-1111-111111111111",
		Username: "admin",
		Role:     "SUPER_ADMIN",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	secret := []byte("super_secret_jwt_key_for_maxzone_development_testing_2026")
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString(secret)
	if err != nil {
		t.Fatalf("Failed to sign token: %v", err)
	}

	r := gin.New()
	r.Use(AuthRequired(svc))
	var capturedUser, capturedRole string
	r.GET("/protected", func(c *gin.Context) {
		capturedUser = c.GetString(ContextKeyUsername)
		capturedRole = c.GetString(ContextKeyRole)
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200 OK, got %d: %s", w.Code, w.Body.String())
	}
	if capturedUser != "admin" || capturedRole != "SUPER_ADMIN" {
		t.Errorf("Expected user=admin, role=SUPER_ADMIN, got user=%s, role=%s", capturedUser, capturedRole)
	}
}

func TestRequireRole(t *testing.T) {
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(ContextKeyRole, "CUSTOMER")
		c.Next()
	})
	r.Use(RequireRole("SUPER_ADMIN"))
	r.GET("/admin-only", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req := httptest.NewRequest("GET", "/admin-only", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden, got %d", w.Code)
	}

	// Test authorized role
	r2 := gin.New()
	r2.Use(func(c *gin.Context) {
		c.Set(ContextKeyRole, "SUPER_ADMIN")
		c.Next()
	})
	r2.Use(RequireRole("SUPER_ADMIN"))
	r2.GET("/admin-only", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req2 := httptest.NewRequest("GET", "/admin-only", nil)
	w2 := httptest.NewRecorder()
	r2.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("Expected 200 OK, got %d", w2.Code)
	}
}
