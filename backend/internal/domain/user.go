package domain

import (
	"crypto/rand"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// GenerateUUID produces a standard RFC 4122 v4 UUID string
func GenerateUUID() string {
	var u [16]byte
	_, _ = rand.Read(u[:])
	u[6] = (u[6] & 0x0f) | 0x40 // Version 4
	u[8] = (u[8] & 0x3f) | 0x80 // Variant 10
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", u[0:4], u[4:6], u[6:8], u[8:10], u[10:16])
}

// Role represents a system role
type Role struct {
	ID          string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	Name        string    `json:"name" gorm:"unique;not null"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (Role) TableName() string { return "roles" }

func (r *Role) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = GenerateUUID()
	}
	return nil
}

// User represents a system user across all portal types
type User struct {
	ID           string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	RoleID       string    `json:"role_id" gorm:"not null"`
	Role         Role      `json:"role" gorm:"foreignKey:RoleID"`
	Username     string    `json:"username" gorm:"unique;not null"`
	Email        *string   `json:"email" gorm:"unique"`
	Phone        string    `json:"phone" gorm:"unique;not null"`
	PasswordHash string    `json:"-" gorm:"not null"`
	FirstName    string    `json:"first_name" gorm:"not null"`
	LastName     *string   `json:"last_name"`
	AvatarURL    *string   `json:"avatar_url"`
	IsActive     bool      `json:"is_active" gorm:"default:true"`
	CreatedBy    *string   `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (User) TableName() string { return "users" }

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = GenerateUUID()
	}
	return nil
}

// UserToken stores refresh tokens for session management
type UserToken struct {
	ID           string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID       string    `json:"user_id" gorm:"not null"`
	RefreshToken string    `json:"refresh_token" gorm:"not null"`
	IPAddress    *string   `json:"ip_address"`
	UserAgent    *string   `json:"user_agent"`
	ExpiresAt    time.Time `json:"expires_at"`
	Revoked      bool      `json:"revoked" gorm:"default:false"`
	CreatedAt    time.Time `json:"created_at"`
}

func (UserToken) TableName() string { return "user_tokens" }

func (t *UserToken) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = GenerateUUID()
	}
	return nil
}

// --- DTOs ---

// LoginRequest is the login request body
type LoginRequest struct {
	Username string `json:"username" binding:"required,min=2"`
	Password string `json:"password" binding:"required,min=6"`
}

// AuthResponse is returned on successful login or refresh
type AuthResponse struct {
	Token        string   `json:"token"`
	RefreshToken string   `json:"refresh_token"`
	User         UserInfo `json:"user"`
}

// UserInfo is the safe public user info included in JWT responses
type UserInfo struct {
	ID        string  `json:"id"`
	Username  string  `json:"username"`
	Email     *string `json:"email"`
	FirstName string  `json:"first_name"`
	LastName  *string `json:"last_name"`
	Role      string  `json:"role"`
	AvatarURL *string `json:"avatar_url"`
	IsActive  bool    `json:"is_active"`
}

// RefreshRequest is the token refresh request body
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// SystemSetting is a key/value config row
type SystemSetting struct {
	Key         string    `json:"key" gorm:"primaryKey"`
	Value       string    `json:"value" gorm:"not null"`
	Category    string    `json:"category" gorm:"default:GENERAL"`
	Description string    `json:"description"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (SystemSetting) TableName() string { return "system_settings" }
