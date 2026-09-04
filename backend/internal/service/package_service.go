package service

import (
	"context"
	"errors"
	"fmt"

	"maxzone/internal/domain"
	"maxzone/internal/repository"
)

type PackageService interface {
	ListPackages(ctx context.Context) ([]domain.Package, error)
	GetPackage(ctx context.Context, id string) (*domain.Package, error)
	CreatePackage(ctx context.Context, req domain.CreatePackageRequest) (*domain.Package, error)
	UpdatePackage(ctx context.Context, id string, req domain.UpdatePackageRequest) (*domain.Package, error)
	DeletePackage(ctx context.Context, id string) error
}

type packageService struct {
	repo repository.PackageRepository
}

func NewPackageService(repo repository.PackageRepository) PackageService {
	return &packageService{repo: repo}
}

func (s *packageService) ListPackages(ctx context.Context) ([]domain.Package, error) {
	return s.repo.FindAll(ctx)
}

func (s *packageService) GetPackage(ctx context.Context, id string) (*domain.Package, error) {
	pkg, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if pkg == nil {
		return nil, errors.New("package not found")
	}
	return pkg, nil
}

func (s *packageService) CreatePackage(ctx context.Context, req domain.CreatePackageRequest) (*domain.Package, error) {
	serviceType := req.ServiceType
	if serviceType == "" {
		serviceType = "PPPOE"
	}
	validityDays := req.ValidityDays
	if validityDays <= 0 {
		validityDays = 30
	}

	rateLimit := req.RateLimitString
	if rateLimit == "" {
		rateLimit = fmt.Sprintf("%s/%s",
			domain.FormatSpeedString(req.UploadSpeedKbps),
			domain.FormatSpeedString(req.DownloadSpeedKbps),
		)
	}

	pkg := &domain.Package{
		Name:              req.Name,
		ServiceType:       serviceType,
		DownloadSpeedKbps: req.DownloadSpeedKbps,
		UploadSpeedKbps:   req.UploadSpeedKbps,
		RateLimitString:   rateLimit,
		ValidityDays:      validityDays,
		Price:             req.Price,
		WholesalePrice:    req.WholesalePrice,
		FUPEnabled:        req.FUPEnabled,
		FUPQuotaBytes:     req.FUPQuotaBytes,
		FUPReducedRate:    req.FUPReducedRate,
		IsActive:          true,
	}

	if err := s.repo.Create(ctx, pkg); err != nil {
		return nil, fmt.Errorf("failed to create package: %w", err)
	}

	return pkg, nil
}

func (s *packageService) UpdatePackage(ctx context.Context, id string, req domain.UpdatePackageRequest) (*domain.Package, error) {
	pkg, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if pkg == nil {
		return nil, errors.New("package not found")
	}

	if req.Name != "" {
		pkg.Name = req.Name
	}
	if req.ServiceType != "" {
		pkg.ServiceType = req.ServiceType
	}
	if req.DownloadSpeedKbps > 0 {
		pkg.DownloadSpeedKbps = req.DownloadSpeedKbps
	}
	if req.UploadSpeedKbps > 0 {
		pkg.UploadSpeedKbps = req.UploadSpeedKbps
	}
	if req.RateLimitString != "" {
		pkg.RateLimitString = req.RateLimitString
	} else if req.DownloadSpeedKbps > 0 || req.UploadSpeedKbps > 0 {
		pkg.RateLimitString = fmt.Sprintf("%s/%s",
			domain.FormatSpeedString(pkg.UploadSpeedKbps),
			domain.FormatSpeedString(pkg.DownloadSpeedKbps),
		)
	}
	if req.ValidityDays > 0 {
		pkg.ValidityDays = req.ValidityDays
	}
	if req.Price > 0 {
		pkg.Price = req.Price
	}
	if req.WholesalePrice >= 0 {
		pkg.WholesalePrice = req.WholesalePrice
	}
	if req.FUPEnabled != nil {
		pkg.FUPEnabled = *req.FUPEnabled
	}
	if req.FUPQuotaBytes != nil {
		pkg.FUPQuotaBytes = req.FUPQuotaBytes
	}
	if req.FUPReducedRate != nil {
		pkg.FUPReducedRate = req.FUPReducedRate
	}
	if req.IsActive != nil {
		pkg.IsActive = *req.IsActive
	}

	if err := s.repo.Update(ctx, pkg); err != nil {
		return nil, fmt.Errorf("failed to update package: %w", err)
	}

	return pkg, nil
}

func (s *packageService) DeletePackage(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
