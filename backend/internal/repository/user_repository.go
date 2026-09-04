package repository

import (
	"errors"
	"time"

	"maxzone/internal/domain"

	"gorm.io/gorm"
)

// UserRepository handles all database operations for users and tokens
type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// FindByUsername looks up a user by username (case-insensitive), eager-loading the role
func (r *UserRepository) FindByUsername(username string) (*domain.User, error) {
	var user domain.User
	err := r.db.Preload("Role").Where("LOWER(username) = LOWER(?)", username).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// FindByID looks up a user by UUID, eager-loading the role
func (r *UserRepository) FindByID(id string) (*domain.User, error) {
	var user domain.User
	err := r.db.Preload("Role").Where("id = ?", id).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// CreateToken persists a refresh token
func (r *UserRepository) CreateToken(token *domain.UserToken) error {
	return r.db.Create(token).Error
}

// FindToken finds a valid (not revoked, not expired) refresh token
func (r *UserRepository) FindToken(refreshToken string) (*domain.UserToken, error) {
	var token domain.UserToken
	err := r.db.Where("refresh_token = ? AND revoked = false AND expires_at > ?", refreshToken, time.Now()).
		First(&token).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &token, nil
}

// RevokeToken marks a refresh token as revoked
func (r *UserRepository) RevokeToken(refreshToken string) error {
	return r.db.Model(&domain.UserToken{}).
		Where("refresh_token = ?", refreshToken).
		Update("revoked", true).Error
}

// RevokeAllUserTokens revokes all refresh tokens for a user (logout all sessions)
func (r *UserRepository) RevokeAllUserTokens(userID string) error {
	return r.db.Model(&domain.UserToken{}).
		Where("user_id = ? AND revoked = false", userID).
		Update("revoked", true).Error
}
