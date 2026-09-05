package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"maxzone/internal/domain"
	"maxzone/internal/repository"
)

var validTicketStatuses = map[string]bool{
	domain.TicketStatusOpen:       true,
	domain.TicketStatusInProgress: true,
	domain.TicketStatusResolved:   true,
	domain.TicketStatusClosed:     true,
}

// TicketService powers the support helpdesk Kanban board
type TicketService interface {
	List(ctx context.Context, status string) ([]domain.TicketDTO, error)
	Create(ctx context.Context, req domain.CreateTicketRequest, createdBy string) (*domain.TicketDTO, error)
	UpdateStatus(ctx context.Context, id, status string) (*domain.TicketDTO, error)
	GetDetail(ctx context.Context, id string) (*domain.TicketDetailDTO, error)
	Reply(ctx context.Context, ticketID string, req domain.ReplyToTicketRequest, authorID string) (*domain.TicketDetailDTO, error)
}

type ticketService struct {
	ticketRepo *repository.TicketRepository
}

func NewTicketService(ticketRepo *repository.TicketRepository) TicketService {
	return &ticketService{ticketRepo: ticketRepo}
}

func (s *ticketService) List(ctx context.Context, status string) ([]domain.TicketDTO, error) {
	list, err := s.ticketRepo.List(ctx, strings.ToUpper(strings.TrimSpace(status)))
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []domain.TicketDTO{}
	}
	return list, nil
}

func (s *ticketService) Create(ctx context.Context, req domain.CreateTicketRequest, createdBy string) (*domain.TicketDTO, error) {
	ticketNo, err := s.ticketRepo.NextTicketNo(ctx)
	if err != nil {
		return nil, err
	}

	category := normalizeEnum(req.Category, "OTHER", []string{"BILLING", "CONNECTIVITY", "EQUIPMENT", "INSTALLATION", "OTHER"})
	priority := normalizeEnum(req.Priority, "MEDIUM", []string{"LOW", "MEDIUM", "HIGH", "URGENT"})

	ticket := &domain.Ticket{
		TicketNo:    ticketNo,
		CustomerID:  req.CustomerID,
		Subject:     strings.TrimSpace(req.Subject),
		Description: strings.TrimSpace(req.Description),
		Category:    category,
		Priority:    priority,
		Status:      domain.TicketStatusOpen,
		CreatedBy:   createdBy,
	}
	if err := s.ticketRepo.Create(ctx, ticket); err != nil {
		return nil, err
	}
	return s.ticketRepo.GetDetail(ctx, ticket.ID)
}

func (s *ticketService) UpdateStatus(ctx context.Context, id, status string) (*domain.TicketDTO, error) {
	status = strings.ToUpper(strings.TrimSpace(status))
	exists, err := s.ticketRepo.FindByID(ctx, id)
	if err != nil {
		return nil, errors.New("TICKET_NOT_FOUND")
	}
	if !validTicketStatuses[status] {
		return nil, errors.New("INVALID_TICKET_STATUS")
	}

	var resolvedAt *time.Time
	if status == domain.TicketStatusResolved || status == domain.TicketStatusClosed {
		now := time.Now()
		resolvedAt = &now
	}
	if err := s.ticketRepo.UpdateStatus(ctx, exists.ID, status, resolvedAt); err != nil {
		return nil, err
	}
	return s.ticketRepo.GetDetail(ctx, exists.ID)
}

func (s *ticketService) GetDetail(ctx context.Context, id string) (*domain.TicketDetailDTO, error) {
	ticket, err := s.ticketRepo.GetDetail(ctx, id)
	if err != nil {
		return nil, errors.New("TICKET_NOT_FOUND")
	}
	replies, err := s.ticketRepo.ListReplies(ctx, id, true)
	if err != nil {
		return nil, err
	}
	if replies == nil {
		replies = []domain.TicketReplyDTO{}
	}
	return &domain.TicketDetailDTO{Ticket: *ticket, Replies: replies}, nil
}

func (s *ticketService) Reply(ctx context.Context, ticketID string, req domain.ReplyToTicketRequest, authorID string) (*domain.TicketDetailDTO, error) {
	if _, err := s.ticketRepo.FindByID(ctx, ticketID); err != nil {
		return nil, errors.New("TICKET_NOT_FOUND")
	}
	reply := &domain.TicketReply{
		TicketID:   ticketID,
		AuthorID:   authorID,
		Message:    strings.TrimSpace(req.Message),
		IsInternal: req.IsInternal,
	}
	if reply.Message == "" {
		return nil, errors.New("EMPTY_REPLY")
	}
	if err := s.ticketRepo.CreateReply(ctx, reply); err != nil {
		return nil, err
	}
	return s.GetDetail(ctx, ticketID)
}

// normalizeEnum coerces a value into an allowed enum, falling back to a default
func normalizeEnum(value, def string, allowed []string) string {
	v := strings.ToUpper(strings.TrimSpace(value))
	for _, a := range allowed {
		if v == a {
			return a
		}
	}
	return def
}