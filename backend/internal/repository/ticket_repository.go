package repository

import (
	"context"
	"fmt"
	"time"

	"maxzone/internal/domain"

	"gorm.io/gorm"
)

// TicketRepository persists support helpdesk tickets and replies
type TicketRepository struct {
	db *gorm.DB
}

func NewTicketRepository(db *gorm.DB) *TicketRepository {
	return &TicketRepository{db: db}
}

const ticketSelect = `t.id, t.ticket_no, t.customer_id, t.subject, t.description, t.category,
	t.priority, t.status, t.created_by, t.assigned_to, t.resolved_at, t.created_at, t.updated_at,
	u.username AS customer_username,
	(u.first_name || ' ' || u.last_name) AS customer_name,
	(au.first_name || ' ' || au.last_name) AS created_by_name,
	(SELECT COUNT(*) FROM ticket_replies r WHERE r.ticket_id = t.id) AS reply_count`

// List returns tickets across the Kanban with customer enrichment
func (r *TicketRepository) List(ctx context.Context, status string) ([]domain.TicketDTO, error) {
	q := r.db.Table("tickets t").
		Select(ticketSelect).
		Joins("LEFT JOIN customers cu ON cu.id = t.customer_id").
		Joins("LEFT JOIN users u ON u.id = cu.user_id").
		Joins("LEFT JOIN users au ON au.id = t.created_by").
		Order("CASE t.status "+
			"WHEN 'OPEN' THEN 1 WHEN 'IN_PROGRESS' THEN 2 WHEN 'RESOLVED' THEN 3 ELSE 4 END ASC, "+
			"CASE t.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC, "+
			"t.updated_at DESC")

	if status != "" && status != "ALL" {
		q = q.Where("t.status = ?", status)
	}

	var tickets []domain.TicketDTO
	if err := q.Scan(&tickets).Error; err != nil {
		return nil, err
	}
	return tickets, nil
}

func (r *TicketRepository) FindByID(ctx context.Context, id string) (*domain.Ticket, error) {
	var t domain.Ticket
	if err := r.db.First(&t, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

// NextTicketNo allocates the next TKT-XXXX number from the Postgres sequence
func (r *TicketRepository) NextTicketNo(ctx context.Context) (string, error) {
	var next int64
	if err := r.db.Raw("SELECT nextval('ticket_no_seq')").Scan(&next).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("TKT-%04d", next), nil
}

func (r *TicketRepository) Create(ctx context.Context, t *domain.Ticket) error {
	return r.db.Create(t).Error
}

// UpdateStatus moves a ticket across the Kanban columns
func (r *TicketRepository) UpdateStatus(ctx context.Context, id, status string, resolvedAt *time.Time) error {
	updates := map[string]interface{}{"status": status}
	if status == domain.TicketStatusResolved || status == domain.TicketStatusClosed {
		updates["resolved_at"] = resolvedAt
	}
	return r.db.Model(&domain.Ticket{}).Where("id = ?", id).Updates(updates).Error
}

// GetDetail returns a ticket row with customer enrichment
func (r *TicketRepository) GetDetail(ctx context.Context, id string) (*domain.TicketDTO, error) {
	var t domain.TicketDTO
	if err := r.db.Table("tickets t").
		Select(ticketSelect).
		Joins("LEFT JOIN customers cu ON cu.id = t.customer_id").
		Joins("LEFT JOIN users u ON u.id = cu.user_id").
		Joins("LEFT JOIN users au ON au.id = t.created_by").
		Where("t.id = ?", id).
		Scan(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TicketRepository) ListReplies(ctx context.Context, ticketID string, includeInternal bool) ([]domain.TicketReplyDTO, error) {
	q := r.db.Table("ticket_replies tr").
		Select("tr.id, tr.ticket_id, tr.author_id, tr.message, tr.is_internal, tr.created_at, (u.first_name || ' ' || u.last_name) AS author_name").
		Joins("LEFT JOIN users u ON u.id = tr.author_id").
		Where("tr.ticket_id = ?", ticketID).
		Order("tr.created_at ASC")
	if !includeInternal {
		q = q.Where("tr.is_internal = FALSE")
	}

	var replies []domain.TicketReplyDTO
	if err := q.Scan(&replies).Error; err != nil {
		return nil, err
	}
	return replies, nil
}

func (r *TicketRepository) CreateReply(ctx context.Context, reply *domain.TicketReply) error {
	return r.db.Create(reply).Error
}