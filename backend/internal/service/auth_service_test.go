package service

import (
	"regexp"
	"testing"
	"time"

	"maxzone/internal/domain"

	"github.com/golang-jwt/jwt/v5"
)

func TestGenerateUUID(t *testing.T) {
	uuidRegex := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
	for i := 0; i < 10; i++ {
		u := domain.GenerateUUID()
		if !uuidRegex.MatchString(u) {
			t.Fatalf("Generated UUID '%s' does not match RFC 4122 v4 pattern", u)
		}
	}
}

func TestGenerateAndValidateAccessToken(t *testing.T) {
	svc := &AuthService{
		jwtSecret: []byte("test_secret_key_1234567890123456"),
	}

	testUser := &domain.User{
		ID:       "11111111-1111-1111-1111-111111111111",
		Username: "admin",
		Role: domain.Role{
			Name: "SUPER_ADMIN",
		},
	}

	tokenStr, err := svc.generateAccessToken(testUser)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}
	if tokenStr == "" {
		t.Fatal("Expected non-empty token string")
	}

	// Validate valid token
	claims, err := svc.ValidateAccessToken(tokenStr)
	if err != nil {
		t.Fatalf("ValidateAccessToken returned unexpected error: %v", err)
	}
	if claims.UserID != testUser.ID {
		t.Errorf("Expected UserID %s, got %s", testUser.ID, claims.UserID)
	}
	if claims.Username != testUser.Username {
		t.Errorf("Expected Username %s, got %s", testUser.Username, claims.Username)
	}
	if claims.Role != "SUPER_ADMIN" {
		t.Errorf("Expected Role SUPER_ADMIN, got %s", claims.Role)
	}

	// Validate invalid token
	_, err = svc.ValidateAccessToken("invalid.token.string")
	if err == nil {
		t.Fatal("Expected error for invalid token, got nil")
	}

	// Validate expired token
	expiredClaims := JWTClaims{
		UserID:   testUser.ID,
		Username: testUser.Username,
		Role:     "SUPER_ADMIN",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
	}
	expiredToken := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
	expiredStr, _ := expiredToken.SignedString(svc.jwtSecret)

	_, err = svc.ValidateAccessToken(expiredStr)
	if err == nil {
		t.Fatal("Expected error for expired token, got nil")
	}
}

func TestGenerateRefreshToken(t *testing.T) {
	svc := &AuthService{}
	token1, err1 := svc.generateRefreshToken()
	token2, err2 := svc.generateRefreshToken()

	if err1 != nil || err2 != nil {
		t.Fatalf("Unexpected error generating refresh token: %v, %v", err1, err2)
	}
	if len(token1) != 64 || len(token2) != 64 {
		t.Errorf("Expected 64-char hex string, got %d and %d", len(token1), len(token2))
	}
	if token1 == token2 {
		t.Error("Expected distinct refresh tokens")
	}
}
