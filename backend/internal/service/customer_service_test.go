package service

import (
	"context"
	"testing"
	"time"

	"maxzone/internal/domain"
)

type mockCustomerRepo struct {
	createdUser     *domain.User
	createdCustomer *domain.Customer
	createdAccount  *domain.ServiceAccount
}

func (m *mockCustomerRepo) List(ctx context.Context, search, status string, limit, offset int) ([]domain.CustomerListItemDTO, int64, error) {
	return []domain.CustomerListItemDTO{}, 0, nil
}

func (m *mockCustomerRepo) ListByReseller(ctx context.Context, resellerID, search, status string, limit, offset int) ([]domain.CustomerListItemDTO, int64, error) {
	return []domain.CustomerListItemDTO{}, 0, nil
}

func (m *mockCustomerRepo) FindByID(ctx context.Context, id string) (*domain.Customer360DetailDTO, error) {
	return &domain.Customer360DetailDTO{
		Customer:       *m.createdCustomer,
		ServiceAccount: *m.createdAccount,
	}, nil
}

func (m *mockCustomerRepo) CreateWithAccount(ctx context.Context, user *domain.User, customer *domain.Customer, account *domain.ServiceAccount, pkg *domain.Package) error {
	m.createdUser = user
	m.createdCustomer = customer
	m.createdAccount = account
	return nil
}

func (m *mockCustomerRepo) Update(ctx context.Context, customer *domain.Customer, account *domain.ServiceAccount, pkg *domain.Package) error {
	return nil
}

func (m *mockCustomerRepo) Delete(ctx context.Context, id string) error {
	return nil
}

func (m *mockCustomerRepo) GetRadiusAttributes(ctx context.Context, username string) ([]domain.RadCheck, []domain.RadReply, error) {
	return []domain.RadCheck{}, []domain.RadReply{}, nil
}

type mockPackageRepo struct{}

func (m *mockPackageRepo) FindAll(ctx context.Context) ([]domain.Package, error) {
	return []domain.Package{}, nil
}
func (m *mockPackageRepo) FindByID(ctx context.Context, id string) (*domain.Package, error) {
	if id == "pkg-123" {
		return &domain.Package{
			ID:              "pkg-123",
			Name:            "30 Mbps Fiber Blast",
			RateLimitString: "30M/30M",
			ValidityDays:    30,
			Price:           1000,
		}, nil
	}
	return nil, nil
}
func (m *mockPackageRepo) Create(ctx context.Context, pkg *domain.Package) error { return nil }
func (m *mockPackageRepo) Update(ctx context.Context, pkg *domain.Package) error { return nil }
func (m *mockPackageRepo) Delete(ctx context.Context, id string) error          { return nil }

type mockRouterRepo struct{}

func (m *mockRouterRepo) FindAll(ctx context.Context) ([]domain.NASRouter, error) {
	return []domain.NASRouter{}, nil
}
func (m *mockRouterRepo) FindByID(ctx context.Context, id string) (*domain.NASRouter, error) {
	if id == "router-123" {
		return &domain.NASRouter{
			ID:        "router-123",
			Name:      "CCR-2004 Core",
			IPAddress: "10.0.0.1",
		}, nil
	}
	return nil, nil
}
func (m *mockRouterRepo) FindByIP(ctx context.Context, ip string) (*domain.NASRouter, error) {
	return nil, nil
}
func (m *mockRouterRepo) Create(ctx context.Context, router *domain.NASRouter) error { return nil }
func (m *mockRouterRepo) Update(ctx context.Context, router *domain.NASRouter) error { return nil }
func (m *mockRouterRepo) Delete(ctx context.Context, id string) error                { return nil }
func (m *mockRouterRepo) UpdateStatus(ctx context.Context, id string, status string, lastPingAt time.Time) error {
	return nil
}
func (m *mockRouterRepo) GetActiveSessionsCount(ctx context.Context, nasIP string) (int64, error) {
	return 0, nil
}
func (m *mockRouterRepo) GetRadAcctSessions(ctx context.Context, nasIP string, limit int) ([]domain.RadAcct, error) {
	return []domain.RadAcct{}, nil
}

func TestCustomerService_CreateCustomer(t *testing.T) {
	custRepo := &mockCustomerRepo{}
	pkgRepo := &mockPackageRepo{}
	routerRepo := &mockRouterRepo{}

	svc := NewCustomerService(custRepo, pkgRepo, routerRepo)

	req := domain.CreateCustomerRequest{
		FirstName:    "Karim",
		LastName:     "Ahmed",
		Phone:        "01711223344",
		Email:        "karim@example.com",
		AddressLine1: "Uttara, Dhaka",
		Username:     "karim_fiber",
		Password:     "pass123",
		PackageID:    "pkg-123",
		NASID:        "router-123",
	}

	res, err := svc.CreateCustomer(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error creating customer: %v", err)
	}

	if res == nil {
		t.Fatal("expected non-nil response")
	}

	if custRepo.createdUser == nil || custRepo.createdUser.Username != "karim_fiber" {
		t.Errorf("expected user username 'karim_fiber', got %v", custRepo.createdUser)
	}

	if custRepo.createdAccount == nil || custRepo.createdAccount.Password != "pass123" {
		t.Errorf("expected cleartext password 'pass123' for FreeRADIUS PAP/CHAP, got %v", custRepo.createdAccount)
	}

	if custRepo.createdCustomer == nil || custRepo.createdCustomer.BillingType != "PREPAID" {
		t.Errorf("expected default billing type 'PREPAID', got %v", custRepo.createdCustomer)
	}
}
