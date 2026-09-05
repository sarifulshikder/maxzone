package domain

import "time"

// Support helpdesk ticket statuses (Kanban columns)
const (
	TicketStatusOpen       = "OPEN"
	TicketStatusInProgress = "IN_PROGRESS"
	TicketStatusResolved   = "RESOLVED"
	TicketStatusClosed     = "CLOSED"
)

// Ticket is a support helpdesk issue tracked on the Kanban board
type Ticket struct {
	ID          string     `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	TicketNo    string     `json:"ticket_no" gorm:"size:20;uniqueIndex"`
	CustomerID  *string    `json:"customer_id" gorm:"type:uuid"`
	Subject     string     `json:"subject" gorm:"size:200;not null"`
	Description string     `json:"description" gorm:"type:text"`
	Category    string     `json:"category" gorm:"size:30;default:'OTHER'"` // BILLING|CONNECTIVITY|EQUIPMENT|INSTALLATION|OTHER
	Priority    string     `json:"priority" gorm:"size:20;default:'MEDIUM'"` // LOW|MEDIUM|HIGH|URGENT
	Status      string     `json:"status" gorm:"size:20;index;default:'OPEN'"`
	CreatedBy   string     `json:"created_by" gorm:"type:uuid;not null"`
	AssignedTo  *string    `json:"assigned_to" gorm:"type:uuid"`
	ResolvedAt  *time.Time `json:"resolved_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (Ticket) TableName() string { return "tickets" }

// TicketReply is a message on a ticket thread (internal notes are hidden)
type TicketReply struct {
	ID         string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	TicketID   string    `json:"ticket_id" gorm:"type:uuid;not null;index"`
	AuthorID   string    `json:"author_id" gorm:"type:uuid;not null"`
	Message    string    `json:"message" gorm:"type:text;not null"`
	IsInternal bool      `json:"is_internal" gorm:"default:false"`
	CreatedAt  time.Time `json:"created_at"`
}

func (TicketReply) TableName() string { return "ticket_replies" }

// --- DTOs ---

// TicketDTO is a ticket row enriched with customer + reply-count columns
type TicketDTO struct {
	Ticket
	CustomerName     *string `json:"customer_name"`
	CustomerUsername *string `json:"customer_username"`
	CreatedByName    *string `json:"created_by_name"`
	ReplyCount       int     `json:"reply_count"`
}

// CreateTicketRequest is the payload for opening a new ticket
type CreateTicketRequest struct {
	CustomerID  *string `json:"customer_id"`
	Subject     string  `json:"subject" binding:"required"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Priority    string  `json:"priority"`
}

// UpdateTicketStatusRequest moves a ticket across the Kanban board
type UpdateTicketStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

// ReplyToTicketRequest adds a message to a ticket thread
type ReplyToTicketRequest struct {
	Message    string `json:"message" binding:"required"`
	IsInternal bool   `json:"is_internal"`
}

// TicketReplyDTO is a reply enriched with the author's display name
type TicketReplyDTO struct {
	TicketReply
	AuthorName *string `json:"author_name"`
}

// TicketDetailDTO is the full thread payload for the reply drawer
type TicketDetailDTO struct {
	Ticket  TicketDTO        `json:"ticket"`
	Replies []TicketReplyDTO `json:"replies"`
}