package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"maxzone/internal/domain"
)

type mockResellerRepo struct {
	reseller     *domain.Reseller
	wallet       *domain.ResellerWallet
	transactions []domain.ResellerTransaction
	renewErr     error
}

func (m *mockResellerRepo) FindResellerByUserID(ctx context.Context, userID string) (*domain.Reseller, error) {
	if m.reseller != nil && m.reseller.UserID == userID {
		return m.reseller, nil
	}
	return nil, errors.New("reseller not found")
}

func (m *mockResellerRepo) FindResellerByID(ctx context.Context, id string) (*domain.Reseller, error) {
	if m.reseller != nil && m.reseller.ID == id {
		return m.reseller, nil
	}
	return nil, errors.New("reseller not found")
}

func (m *mockResellerRepo) GetWallet(ctx context.Context, resellerID string) (*domain.ResellerWallet, error) {
	if m.wallet != nil && m.wallet.ResellerID == resellerID {
		return m.wallet, nil
	}
	return nil, errors.New("wallet not found")
}

func (m *mockResellerRepo) ListResellers(ctx context.Context, search string, page, pageSize int) ([]domain.Reseller, int64, error) {
	if m.reseller != nil {
		return []domain.Reseller{*m.reseller}, 1, nil
	}
	return []domain.Reseller{}, 0, nil
}

func (m *mockResellerRepo) ListTransactions(ctx context.Context, resellerID string, page, pageSize int) ([]domain.ResellerTransaction, int64, error) {
	return m.transactions, int64(len(m.transactions)), nil
}

func (m *mockResellerRepo) TopupWallet(ctx context.Context, resellerID string, amount float64, txType, refID, remarks string, performedBy *string) (*domain.ResellerTransaction, *domain.ResellerWallet, error) {
	if m.wallet == nil {
		return nil, nil, errors.New("wallet not found")
	}
	before := m.wallet.Balance
	after := before + amount
	m.wallet.Balance = after

	tx := &domain.ResellerTransaction{
		ID:            "tx-topup-1",
		ResellerID:    resellerID,
		WalletID:      m.wallet.ID,
		Type:          txType,
		Amount:        amount,
		BalanceBefore: before,
		BalanceAfter:  after,
		ReferenceID:   &refID,
		Remarks:       &remarks,
		PerformedBy:   performedBy,
		CreatedAt:     time.Now(),
	}
	m.transactions = append(m.transactions, *tx)
	return tx, m.wallet, nil
}

func (m *mockResellerRepo) ExecuteBatchRenewal(ctx context.Context, resellerID string, customerIDs []string, performedBy *string) (*domain.BatchRenewResponse, error) {
	if m.renewErr != nil {
		return nil, m.renewErr
	}
	cost := float64(len(customerIDs)) * 550.00
	if m.wallet.Balance+m.wallet.CreditLimit < cost {
		return nil, errors.New("INSUFFICIENT_FUNDS")
	}

	before := m.wallet.Balance
	after := before - cost
	m.wallet.Balance = after

	var renewed []domain.RenewedCustomerDTO
	for _, id := range customerIDs {
		renewed = append(renewed, domain.RenewedCustomerDTO{
			CustomerID:    id,
			RenewedAmount: 550.00,
			Status:        "ACTIVE",
			NewExpiresAt:  time.Now().AddDate(0, 1, 0),
		})
	}

	return &domain.BatchRenewResponse{
		RenewedCount:     len(customerIDs),
		TotalDeducted:    cost,
		BalanceBefore:    before,
		BalanceAfter:     after,
		RenewedCustomers: renewed,
	}, nil
}

func (m *mockResellerRepo) UpdateCreditLimit(ctx context.Context, resellerID string, newLimit float64) error {
	if m.wallet != nil {
		m.wallet.CreditLimit = newLimit
	}
	return nil
}

func (m *mockResellerRepo) GetCustomerCounts(ctx context.Context, resellerID string) (total int64, active int64, expired int64, err error) {
	return 3, 0, 3, nil
}

func TestResellerService_GetDashboardOverview(t *testing.T) {
	reseller := &domain.Reseller{
		ID:           "reseller-uuid-1",
		UserID:       "user-reseller-1",
		BusinessName: "Demo Reseller Communications",
		CreditLimit:  5000,
		IsActive:     true,
	}
	wallet := &domain.ResellerWallet{
		ID:          "wallet-uuid-1",
		ResellerID:  "reseller-uuid-1",
		Balance:     10000,
		CreditLimit: 5000,
		Currency:    "BDT",
	}

	resRepo := &mockResellerRepo{reseller: reseller, wallet: wallet}
	custRepo := &mockCustomerRepo{}
	routerRepo := &mockRouterRepo{}

	svc := NewResellerService(resRepo, custRepo, routerRepo)
	overview, err := svc.GetDashboardOverview(context.Background(), "user-reseller-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if overview.Reseller.BusinessName != "Demo Reseller Communications" {
		t.Errorf("expected business name 'Demo Reseller Communications', got %s", overview.Reseller.BusinessName)
	}
	if overview.Wallet.Balance != 10000 {
		t.Errorf("expected balance 10000, got %.2f", overview.Wallet.Balance)
	}
	if overview.Wallet.CreditLimit != 5000 {
		t.Errorf("expected credit limit 5000, got %.2f", overview.Wallet.CreditLimit)
	}
}

func TestResellerService_BatchRenewCustomers(t *testing.T) {
	reseller := &domain.Reseller{
		ID:           "reseller-uuid-1",
		UserID:       "user-reseller-1",
		BusinessName: "Demo Reseller Communications",
	}
	wallet := &domain.ResellerWallet{
		ID:          "wallet-uuid-1",
		ResellerID:  "reseller-uuid-1",
		Balance:     10000,
		CreditLimit: 5000,
	}

	resRepo := &mockResellerRepo{reseller: reseller, wallet: wallet}
	custRepo := &mockCustomerRepo{}
	routerRepo := &mockRouterRepo{}

	svc := NewResellerService(resRepo, custRepo, routerRepo)

	// Renew 3 customers (3 * 550 = 1650 deduction from 10000 -> 8350)
	resp, err := svc.BatchRenewCustomers(context.Background(), "user-reseller-1", []string{"c1", "c2", "c3"})
	if err != nil {
		t.Fatalf("batch renew failed: %v", err)
	}

	if resp.RenewedCount != 3 {
		t.Errorf("expected 3 renewed, got %d", resp.RenewedCount)
	}
	if resp.TotalDeducted != 1650.00 {
		t.Errorf("expected total deducted 1650, got %.2f", resp.TotalDeducted)
	}
	if resp.BalanceBefore != 10000.00 {
		t.Errorf("expected balance before 10000, got %.2f", resp.BalanceBefore)
	}
	if resp.BalanceAfter != 8350.00 {
		t.Errorf("expected balance after 8350, got %.2f", resp.BalanceAfter)
	}
}

func TestResellerService_TopupWallet(t *testing.T) {
	reseller := &domain.Reseller{
		ID:           "reseller-uuid-1",
		UserID:       "user-reseller-1",
		BusinessName: "Demo Reseller Communications",
	}
	wallet := &domain.ResellerWallet{
		ID:          "wallet-uuid-1",
		ResellerID:  "reseller-uuid-1",
		Balance:     5000,
		CreditLimit: 5000,
	}

	resRepo := &mockResellerRepo{reseller: reseller, wallet: wallet}
	custRepo := &mockCustomerRepo{}
	routerRepo := &mockRouterRepo{}

	svc := NewResellerService(resRepo, custRepo, routerRepo)

	req := domain.ResellerTopupRequest{
		Amount:        2000,
		PaymentMethod: "BKASH",
		TransactionID: "TRX-BKASH-9988",
		Remarks:       "Self-service test topup",
	}

	tx, updatedWallet, err := svc.TopupWallet(context.Background(), "user-reseller-1", req)
	if err != nil {
		t.Fatalf("topup failed: %v", err)
	}

	if updatedWallet.Balance != 7000 {
		t.Errorf("expected updated balance 7000, got %.2f", updatedWallet.Balance)
	}
	if tx.Amount != 2000 {
		t.Errorf("expected tx amount 2000, got %.2f", tx.Amount)
	}
	if tx.BalanceAfter != 7000 {
		t.Errorf("expected tx balance after 7000, got %.2f", tx.BalanceAfter)
	}
}
