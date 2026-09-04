package repository

import (
	"context"
	"errors"
	"time"

	"maxzone/internal/domain"

	"gorm.io/gorm"
)

type RouterRepository interface {
	FindAll(ctx context.Context) ([]domain.NASRouter, error)
	FindByID(ctx context.Context, id string) (*domain.NASRouter, error)
	FindByIP(ctx context.Context, ip string) (*domain.NASRouter, error)
	Create(ctx context.Context, router *domain.NASRouter) error
	Update(ctx context.Context, router *domain.NASRouter) error
	Delete(ctx context.Context, id string) error
	UpdateStatus(ctx context.Context, id string, status string, lastPingAt time.Time) error
	GetActiveSessionsCount(ctx context.Context, nasIP string) (int64, error)
	GetRadAcctSessions(ctx context.Context, nasIP string, limit int) ([]domain.RadAcct, error)
}

type routerRepository struct {
	db *gorm.DB
}

func NewRouterRepository(db *gorm.DB) RouterRepository {
	return &routerRepository{db: db}
}

func (r *routerRepository) FindAll(ctx context.Context) ([]domain.NASRouter, error) {
	var routers []domain.NASRouter
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&routers).Error
	return routers, err
}

func (r *routerRepository) FindByID(ctx context.Context, id string) (*domain.NASRouter, error) {
	var router domain.NASRouter
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&router).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &router, nil
}

func (r *routerRepository) FindByIP(ctx context.Context, ip string) (*domain.NASRouter, error) {
	var router domain.NASRouter
	err := r.db.WithContext(ctx).Where("ip_address = ?", ip).First(&router).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &router, nil
}

// Create inserts into nas_routers and automatically syncs to FreeRADIUS nas table
func (r *routerRepository) Create(ctx context.Context, router *domain.NASRouter) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(router).Error; err != nil {
			return err
		}

		// Sync with FreeRADIUS nas table
		nasClient := domain.NAS{
			NASName:     router.IPAddress,
			ShortName:   router.Name,
			Type:        "other",
			Secret:      router.RadiusSecret,
			Description: "Synced from Maxzone NAS: " + router.Name,
		}

		// Upsert into FreeRADIUS nas table
		var existing domain.NAS
		if err := tx.Where("nasname = ?", router.IPAddress).First(&existing).Error; err == nil {
			existing.Secret = router.RadiusSecret
			existing.ShortName = router.Name
			existing.Description = nasClient.Description
			if err := tx.Save(&existing).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Create(&nasClient).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// Update updates nas_routers and synchronizes changes to the FreeRADIUS nas table
func (r *routerRepository) Update(ctx context.Context, router *domain.NASRouter) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(router).Error; err != nil {
			return err
		}

		// Synchronize FreeRADIUS client entry
		var nasClient domain.NAS
		if err := tx.Where("nasname = ?", router.IPAddress).First(&nasClient).Error; err == nil {
			nasClient.Secret = router.RadiusSecret
			nasClient.ShortName = router.Name
			nasClient.Description = "Synced from Maxzone NAS: " + router.Name
			if err := tx.Save(&nasClient).Error; err != nil {
				return err
			}
		} else {
			nasClient = domain.NAS{
				NASName:     router.IPAddress,
				ShortName:   router.Name,
				Type:        "other",
				Secret:      router.RadiusSecret,
				Description: "Synced from Maxzone NAS: " + router.Name,
			}
			if err := tx.Create(&nasClient).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// Delete removes from nas_routers and the synchronized FreeRADIUS nas client
func (r *routerRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var router domain.NASRouter
		if err := tx.Where("id = ?", id).First(&router).Error; err != nil {
			return err
		}

		// Delete from FreeRADIUS client table
		if err := tx.Where("nasname = ?", router.IPAddress).Delete(&domain.NAS{}).Error; err != nil {
			return err
		}

		return tx.Delete(&router).Error
	})
}

func (r *routerRepository) UpdateStatus(ctx context.Context, id string, status string, lastPingAt time.Time) error {
	return r.db.WithContext(ctx).Model(&domain.NASRouter{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"last_status":  status,
			"last_ping_at": lastPingAt,
			"updated_at":   time.Now(),
		}).Error
}

func (r *routerRepository) GetActiveSessionsCount(ctx context.Context, nasIP string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.RadAcct{}).
		Where("nasipaddress = ? AND acctstoptime IS NULL", nasIP).
		Count(&count).Error
	return count, err
}

func (r *routerRepository) GetRadAcctSessions(ctx context.Context, nasIP string, limit int) ([]domain.RadAcct, error) {
	var sessions []domain.RadAcct
	q := r.db.WithContext(ctx).Where("acctstoptime IS NULL")
	if nasIP != "" {
		q = q.Where("nasipaddress = ?", nasIP)
	}
	err := q.Order("acctstarttime DESC").Limit(limit).Find(&sessions).Error
	return sessions, err
}
