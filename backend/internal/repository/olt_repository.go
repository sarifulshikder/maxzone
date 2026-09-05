package repository

import (
	"context"
	"errors"
	"time"

	"maxzone/internal/domain"

	"gorm.io/gorm"
)

type OLTRepository interface {
	FindAll(ctx context.Context) ([]domain.OLT, error)
	FindByID(ctx context.Context, id string) (*domain.OLT, error)
	Create(ctx context.Context, olt *domain.OLT) error
	Update(ctx context.Context, olt *domain.OLT) error
	Delete(ctx context.Context, id string) error
	UpdateStatus(ctx context.Context, id string, status string, lastPolledAt time.Time) error

	ListPONPorts(ctx context.Context, oltID string) ([]domain.PONPort, error)
	FindPONPort(ctx context.Context, id string) (*domain.PONPort, error)
	FindPONPortByPath(ctx context.Context, oltID string, frame, slot, port int) (*domain.PONPort, error)
	CreatePONPort(ctx context.Context, port *domain.PONPort) error
	UpdatePONPort(ctx context.Context, port *domain.PONPort) error

	ListONUs(ctx context.Context, oltID string) ([]domain.ONU, error)
	ListONUsByPort(ctx context.Context, ponPortID string) ([]domain.ONU, error)
	FindBySerial(ctx context.Context, oltID string, serial string) (*domain.ONU, error)
	FindONU(ctx context.Context, id string) (*domain.ONU, error)
	CreateONU(ctx context.Context, onu *domain.ONU) error
	UpdateONU(ctx context.Context, onu *domain.ONU) error
	ListUnregisteredONUs(ctx context.Context, oltID string) ([]domain.ONU, error)
}

type oltRepository struct {
	db *gorm.DB
}

func NewOLTRepository(db *gorm.DB) OLTRepository {
	return &oltRepository{db: db}
}

func (r *oltRepository) FindAll(ctx context.Context) ([]domain.OLT, error) {
	var olts []domain.OLT
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&olts).Error
	return olts, err
}

func (r *oltRepository) FindByID(ctx context.Context, id string) (*domain.OLT, error) {
	var olt domain.OLT
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&olt).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &olt, nil
}

func (r *oltRepository) Create(ctx context.Context, olt *domain.OLT) error {
	return r.db.WithContext(ctx).Create(olt).Error
}

func (r *oltRepository) Update(ctx context.Context, olt *domain.OLT) error {
	return r.db.WithContext(ctx).Save(olt).Error
}

func (r *oltRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.OLT{}).Error
}

func (r *oltRepository) UpdateStatus(ctx context.Context, id string, status string, lastPolledAt time.Time) error {
	return r.db.WithContext(ctx).Model(&domain.OLT{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"last_status":    status,
			"last_polled_at": lastPolledAt,
			"updated_at":     time.Now(),
		}).Error
}

func (r *oltRepository) ListPONPorts(ctx context.Context, oltID string) ([]domain.PONPort, error) {
	var ports []domain.PONPort
	err := r.db.WithContext(ctx).
		Where("olt_id = ?", oltID).
		Order("frame ASC, slot ASC, port ASC").
		Find(&ports).Error
	return ports, err
}

func (r *oltRepository) FindPONPort(ctx context.Context, id string) (*domain.PONPort, error) {
	var port domain.PONPort
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&port).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &port, nil
}

func (r *oltRepository) FindPONPortByPath(ctx context.Context, oltID string, frame, slot, port int) (*domain.PONPort, error) {
	var p domain.PONPort
	err := r.db.WithContext(ctx).
		Where("olt_id = ? AND frame = ? AND slot = ? AND port = ?", oltID, frame, slot, port).
		First(&p).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

func (r *oltRepository) CreatePONPort(ctx context.Context, port *domain.PONPort) error {
	return r.db.WithContext(ctx).Create(port).Error
}

func (r *oltRepository) UpdatePONPort(ctx context.Context, port *domain.PONPort) error {
	return r.db.WithContext(ctx).Save(port).Error
}

func (r *oltRepository) ListONUs(ctx context.Context, oltID string) ([]domain.ONU, error) {
	var onus []domain.ONU
	err := r.db.WithContext(ctx).
		Where("olt_id = ?", oltID).
		Order("created_at ASC").
		Find(&onus).Error
	return onus, err
}

func (r *oltRepository) ListONUsByPort(ctx context.Context, ponPortID string) ([]domain.ONU, error) {
	var onus []domain.ONU
	err := r.db.WithContext(ctx).
		Where("pon_port_id = ?", ponPortID).
		Order("created_at ASC").
		Find(&onus).Error
	return onus, err
}

func (r *oltRepository) FindBySerial(ctx context.Context, oltID string, serial string) (*domain.ONU, error) {
	var onu domain.ONU
	err := r.db.WithContext(ctx).
		Where("olt_id = ? AND serial_number = ?", oltID, serial).
		First(&onu).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &onu, nil
}

func (r *oltRepository) FindONU(ctx context.Context, id string) (*domain.ONU, error) {
	var onu domain.ONU
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&onu).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &onu, nil
}

func (r *oltRepository) CreateONU(ctx context.Context, onu *domain.ONU) error {
	return r.db.WithContext(ctx).Create(onu).Error
}

func (r *oltRepository) UpdateONU(ctx context.Context, onu *domain.ONU) error {
	return r.db.WithContext(ctx).Save(onu).Error
}

func (r *oltRepository) ListUnregisteredONUs(ctx context.Context, oltID string) ([]domain.ONU, error) {
	var onus []domain.ONU
	err := r.db.WithContext(ctx).
		Where("olt_id = ? AND registered = FALSE", oltID).
		Order("last_discovered_at DESC NULLS LAST, created_at ASC").
		Find(&onus).Error
	return onus, err
}