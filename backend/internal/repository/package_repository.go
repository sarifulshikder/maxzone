package repository

import (
	"context"
	"errors"

	"maxzone/internal/domain"

	"gorm.io/gorm"
)

type PackageRepository interface {
	FindAll(ctx context.Context) ([]domain.Package, error)
	FindByID(ctx context.Context, id string) (*domain.Package, error)
	Create(ctx context.Context, pkg *domain.Package) error
	Update(ctx context.Context, pkg *domain.Package) error
	Delete(ctx context.Context, id string) error
}

type packageRepository struct {
	db *gorm.DB
}

func NewPackageRepository(db *gorm.DB) PackageRepository {
	return &packageRepository{db: db}
}

func (r *packageRepository) FindAll(ctx context.Context) ([]domain.Package, error) {
	var packages []domain.Package
	err := r.db.WithContext(ctx).Order("price ASC").Find(&packages).Error
	return packages, err
}

func (r *packageRepository) FindByID(ctx context.Context, id string) (*domain.Package, error) {
	var pkg domain.Package
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&pkg).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &pkg, nil
}

func (r *packageRepository) Create(ctx context.Context, pkg *domain.Package) error {
	return r.db.WithContext(ctx).Create(pkg).Error
}

func (r *packageRepository) Update(ctx context.Context, pkg *domain.Package) error {
	return r.db.WithContext(ctx).Save(pkg).Error
}

func (r *packageRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.Package{}).Error
}
