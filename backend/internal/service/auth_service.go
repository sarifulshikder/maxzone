package service

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"maxzone/internal/domain"
	"maxzone/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AuthService handles authentication and token management
type AuthService struct {
	userRepo  *repository.UserRepository
	jwtSecret []byte
	db        *gorm.DB
}

func NewAuthService(userRepo *repository.UserRepository, db *gorm.DB) *AuthService {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "super_secret_jwt_key_for_maxzone_development_testing_2026"
	}
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: []byte(secret),
		db:        db,
	}
}

// JWTClaims are the custom JWT claims
type JWTClaims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// Login authenticates a user and returns access + refresh tokens
func (s *AuthService) Login(req *domain.LoginRequest, ipAddress, userAgent string) (*domain.AuthResponse, error) {
	user, err := s.userRepo.FindByUsername(req.Username)
	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}
	if user == nil {
		return nil, errors.New("INVALID_CREDENTIALS")
	}
	if !user.IsActive {
		return nil, errors.New("ACCOUNT_DISABLED")
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("INVALID_CREDENTIALS")
	}

	// Generate access token (15 minutes)
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Generate refresh token (30 days)
	refreshToken, err := s.generateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Persist refresh token
	expiresAt := time.Now().Add(30 * 24 * time.Hour)
	ip := &ipAddress
	ua := &userAgent
	tokenRecord := &domain.UserToken{
		UserID:       user.ID,
		RefreshToken: refreshToken,
		IPAddress:    ip,
		UserAgent:    ua,
		ExpiresAt:    expiresAt,
	}
	if err := s.userRepo.CreateToken(tokenRecord); err != nil {
		return nil, fmt.Errorf("failed to persist token: %w", err)
	}

	return &domain.AuthResponse{
		Token:        accessToken,
		RefreshToken: refreshToken,
		User:         s.toUserInfo(user),
	}, nil
}

// Refresh validates a refresh token and issues new token pair (rotation)
func (s *AuthService) Refresh(refreshToken string) (*domain.AuthResponse, error) {
	// Find token in DB
	tokenRecord, err := s.userRepo.FindToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("database error: %w", err)
	}
	if tokenRecord == nil {
		return nil, errors.New("INVALID_REFRESH_TOKEN")
	}

	// Get user
	user, err := s.userRepo.FindByID(tokenRecord.UserID)
	if err != nil || user == nil {
		return nil, errors.New("USER_NOT_FOUND")
	}
	if !user.IsActive {
		return nil, errors.New("ACCOUNT_DISABLED")
	}

	// Rotate: revoke old, issue new
	if err := s.userRepo.RevokeToken(refreshToken); err != nil {
		return nil, fmt.Errorf("failed to revoke old token: %w", err)
	}

	newAccessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}
	newRefreshToken, err := s.generateRefreshToken()
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(30 * 24 * time.Hour)
	tokenRecord2 := &domain.UserToken{
		UserID:       user.ID,
		RefreshToken: newRefreshToken,
		ExpiresAt:    expiresAt,
	}
	if err := s.userRepo.CreateToken(tokenRecord2); err != nil {
		return nil, err
	}

	return &domain.AuthResponse{
		Token:        newAccessToken,
		RefreshToken: newRefreshToken,
		User:         s.toUserInfo(user),
	}, nil
}

// Logout revokes the given refresh token
func (s *AuthService) Logout(userID string, refreshToken string) error {
	return s.userRepo.RevokeToken(refreshToken)
}

// LogoutAll revokes all refresh tokens for a user
func (s *AuthService) LogoutAll(userID string) error {
	return s.userRepo.RevokeAllUserTokens(userID)
}

// GetUserInfo retrieves public user details by ID
func (s *AuthService) GetUserInfo(userID string) (*domain.UserInfo, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("USER_NOT_FOUND")
	}
	info := s.toUserInfo(user)
	return &info, nil
}

// ValidateAccessToken parses and validates a JWT access token
func (s *AuthService) ValidateAccessToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

// SeedInitialAdmin creates the initial SUPER_ADMIN account if it doesn't exist
func (s *AuthService) SeedInitialAdmin() {
	username := os.Getenv("INITIAL_ADMIN_USERNAME")
	password := os.Getenv("INITIAL_ADMIN_PASSWORD")
	email := os.Getenv("INITIAL_ADMIN_EMAIL")
	phone := os.Getenv("INITIAL_ADMIN_PHONE")

	if username == "" {
		username = "admin"
	}
	if password == "" {
		password = "Maxzone@2026"
	}
	if email == "" {
		email = "admin@maxzone.local"
	}
	if phone == "" {
		phone = "01700000000"
	}

	// Check if admin already exists
	existing, _ := s.userRepo.FindByUsername(username)
	if existing != nil {
		log.Printf("[AUTH] Admin user '%s' already exists, skipping seed", username)
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("[AUTH] Failed to hash admin password: %v", err)
		return
	}

	emailPtr := &email
	adminUser := domain.User{
		ID:           "11111111-1111-1111-1111-111111111111",
		RoleID:       "11111111-1111-1111-1111-111111111111",
		Username:     username,
		Email:        emailPtr,
		Phone:        phone,
		PasswordHash: string(hash),
		FirstName:    "System",
		LastName:     strPtr("Admin"),
		IsActive:     true,
	}

	if err := s.db.Create(&adminUser).Error; err != nil {
		log.Printf("[AUTH] Failed to seed admin user: %v", err)
		return
	}
	log.Printf("[AUTH] ✅ Admin user '%s' seeded successfully (password: %s)", username, password)
}

func (s *AuthService) generateAccessToken(user *domain.User) (string, error) {
	expirationMinutes := 15
	roleName := "SUPER_ADMIN"
	if user.Role.Name != "" {
		roleName = user.Role.Name
	}
	claims := JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     roleName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expirationMinutes) * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "maxzone",
			Subject:   user.ID,
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) generateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *AuthService) toUserInfo(user *domain.User) domain.UserInfo {
	roleName := "SUPER_ADMIN"
	if user.Role.Name != "" {
		roleName = user.Role.Name
	}
	return domain.UserInfo{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      roleName,
		AvatarURL: user.AvatarURL,
		IsActive:  user.IsActive,
	}
}

func strPtr(s string) *string { return &s }
