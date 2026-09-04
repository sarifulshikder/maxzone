package service

import (
	"context"
	"errors"
	"fmt"
	"net"
	"time"

	"maxzone/internal/domain"
	"maxzone/internal/radius"
	"maxzone/internal/repository"
)

type ResellerService interface {
	GetDashboardOverview(ctx context.Context, userID string) (*domain.ResellerDashboardOverviewDTO, error)
	BatchRenewCustomers(ctx context.Context, userID string, customerIDs []string) (*domain.BatchRenewResponse, error)
	TopupWallet(ctx context.Context, userID string, req domain.ResellerTopupRequest) (*domain.ResellerTransaction, *domain.ResellerWallet, error)
	ListLedger(ctx context.Context, userID string, page, pageSize int) ([]domain.ResellerTransaction, int64, *domain.ResellerWallet, error)
	ListResellerCustomers(ctx context.Context, userID string, search, status string, page, pageSize int) ([]domain.CustomerListItemDTO, int64, error)
	AdminListResellers(ctx context.Context, search string, page, pageSize int) ([]domain.AdminResellerOverviewDTO, int64, error)
	AdminAdjustWallet(ctx context.Context, adminUserID string, req domain.AdminAdjustWalletRequest) (*domain.ResellerTransaction, *domain.ResellerWallet, error)
}

type resellerService struct {
	resellerRepo repository.ResellerRepository
	customerRepo repository.CustomerRepository
	routerRepo   repository.RouterRepository
}

func NewResellerService(
	resellerRepo repository.ResellerRepository,
	customerRepo repository.CustomerRepository,
	routerRepo repository.RouterRepository,
) ResellerService {
	return &resellerService{
		resellerRepo: resellerRepo,
		customerRepo: customerRepo,
		routerRepo:   routerRepo,
	}
}

func (s *resellerService) GetDashboardOverview(ctx context.Context, userID string) (*domain.ResellerDashboardOverviewDTO, error) {
	reseller, err := s.resellerRepo.FindResellerByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch reseller: %w", err)
	}
	if reseller == nil {
		return nil, errors.New("reseller profile not found for current user")
	}

	wallet, err := s.resellerRepo.GetWallet(ctx, reseller.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch wallet: %w", err)
	}

	totalCust, activeCust, expiredCust, err := s.resellerRepo.GetCustomerCounts(ctx, reseller.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch customer counts: %w", err)
	}

	recentTxs, _, err := s.resellerRepo.ListTransactions(ctx, reseller.ID, 1, 5)
	if err != nil {
		recentTxs = []domain.ResellerTransaction{}
	}

	customers, _, err := s.customerRepo.ListByReseller(ctx, reseller.ID, "", "", 50, 0)
	if err != nil {
		customers = []domain.CustomerListItemDTO{}
	}

	return &domain.ResellerDashboardOverviewDTO{
		Reseller:           *reseller,
		Wallet:             *wallet,
		TotalCustomers:     totalCust,
		ActiveCustomers:    activeCust,
		ExpiredCustomers:   expiredCust,
		RecentTransactions: recentTxs,
		Customers:          customers,
	}, nil
}

func (s *resellerService) BatchRenewCustomers(ctx context.Context, userID string, customerIDs []string) (*domain.BatchRenewResponse, error) {
	reseller, err := s.resellerRepo.FindResellerByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch reseller: %w", err)
	}
	if reseller == nil {
		return nil, errors.New("reseller profile not found for user")
	}

	resp, err := s.resellerRepo.ExecuteBatchRenewal(ctx, reseller.ID, customerIDs, &userID)
	if err != nil {
		return nil, err
	}

	// Dispatch CoA Disconnect/Reconnect asynchronously so active sessions obtain fresh expiry
	go func() {
		for _, rc := range resp.RenewedCustomers {
			s.dispatchCoASilent(context.Background(), rc.CustomerID)
		}
	}()

	return resp, nil
}

func (s *resellerService) TopupWallet(ctx context.Context, userID string, req domain.ResellerTopupRequest) (*domain.ResellerTransaction, *domain.ResellerWallet, error) {
	reseller, err := s.resellerRepo.FindResellerByUserID(ctx, userID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch reseller: %w", err)
	}
	if reseller == nil {
		return nil, nil, errors.New("reseller profile not found for user")
	}

	ref := req.TransactionID
	if ref == "" {
		ref = fmt.Sprintf("TRX-%s-%d", req.PaymentMethod, time.Now().Unix())
	}
	remarks := req.Remarks
	if remarks == "" {
		remarks = fmt.Sprintf("Self-service topup via %s", req.PaymentMethod)
	}

	return s.resellerRepo.TopupWallet(ctx, reseller.ID, req.Amount, "TOPUP", ref, remarks, &userID)
}

func (s *resellerService) ListLedger(ctx context.Context, userID string, page, pageSize int) ([]domain.ResellerTransaction, int64, *domain.ResellerWallet, error) {
	reseller, err := s.resellerRepo.FindResellerByUserID(ctx, userID)
	if err != nil {
		return nil, 0, nil, fmt.Errorf("failed to fetch reseller: %w", err)
	}
	if reseller == nil {
		return nil, 0, nil, errors.New("reseller profile not found for user")
	}

	wallet, err := s.resellerRepo.GetWallet(ctx, reseller.ID)
	if err != nil {
		return nil, 0, nil, fmt.Errorf("failed to fetch wallet: %w", err)
	}

	txs, total, err := s.resellerRepo.ListTransactions(ctx, reseller.ID, page, pageSize)
	return txs, total, wallet, err
}

func (s *resellerService) ListResellerCustomers(ctx context.Context, userID string, search, status string, page, pageSize int) ([]domain.CustomerListItemDTO, int64, error) {
	reseller, err := s.resellerRepo.FindResellerByUserID(ctx, userID)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to fetch reseller: %w", err)
	}
	if reseller == nil {
		return nil, 0, errors.New("reseller profile not found for user")
	}

	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize

	return s.customerRepo.ListByReseller(ctx, reseller.ID, search, status, pageSize, offset)
}

func (s *resellerService) AdminListResellers(ctx context.Context, search string, page, pageSize int) ([]domain.AdminResellerOverviewDTO, int64, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50
	}

	resellers, total, err := s.resellerRepo.ListResellers(ctx, search, page, pageSize)
	if err != nil {
		return nil, 0, err
	}

	var dtos []domain.AdminResellerOverviewDTO
	for _, r := range resellers {
		wallet, _ := s.resellerRepo.GetWallet(ctx, r.ID)
		if wallet == nil {
			wallet = &domain.ResellerWallet{Balance: 0, CreditLimit: r.CreditLimit}
		}
		custCount, _, _, _ := s.resellerRepo.GetCustomerCounts(ctx, r.ID)

		dtos = append(dtos, domain.AdminResellerOverviewDTO{
			Reseller:       r,
			Wallet:         *wallet,
			TotalCustomers: custCount,
		})
	}

	return dtos, total, nil
}

func (s *resellerService) AdminAdjustWallet(ctx context.Context, adminUserID string, req domain.AdminAdjustWalletRequest) (*domain.ResellerTransaction, *domain.ResellerWallet, error) {
	if req.CreditLimit != nil {
		if err := s.resellerRepo.UpdateCreditLimit(ctx, req.ResellerID, *req.CreditLimit); err != nil {
			return nil, nil, fmt.Errorf("failed to update credit limit: %w", err)
		}
	}

	if req.Amount != 0 {
		ref := fmt.Sprintf("ADJ-%d", time.Now().Unix())
		remarks := req.Remarks
		if remarks == "" {
			remarks = "Manual balance adjustment by Administrator"
		}
		return s.resellerRepo.TopupWallet(ctx, req.ResellerID, req.Amount, req.Type, ref, remarks, &adminUserID)
	}

	wallet, err := s.resellerRepo.GetWallet(ctx, req.ResellerID)
	return nil, wallet, err
}

func (s *resellerService) dispatchCoASilent(ctx context.Context, customerID string) {
	detail, err := s.customerRepo.FindByID(ctx, customerID)
	if err != nil || detail == nil {
		return
	}
	router := detail.Router
	account := detail.ServiceAccount
	if router.ID != "" && account.Username != "" {
		var framedIP net.IP
		if account.StaticIP != nil && *account.StaticIP != "" {
			framedIP = net.ParseIP(*account.StaticIP)
		}
		_ = radius.SendDisconnectRequest(
			router.IPAddress,
			router.CoAPort,
			router.RadiusSecret,
			account.Username,
			framedIP,
			router.IsSimulated,
		)
	}
}
