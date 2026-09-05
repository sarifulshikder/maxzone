package handler

import (
	"net/http"

	"maxzone/internal/api/middleware"
	"maxzone/internal/domain"
	"maxzone/internal/service"

	"github.com/gin-gonic/gin"
)

// TicketHandler exposes the support helpdesk Kanban endpoints
type TicketHandler struct {
	ticketService service.TicketService
}

func NewTicketHandler(ticketService service.TicketService) *TicketHandler {
	return &TicketHandler{ticketService: ticketService}
}

func (h *TicketHandler) ListTickets(c *gin.Context) {
	status := c.DefaultQuery("status", "")
	list, err := h.ticketService.List(c.Request.Context(), status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "TICKETS_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": list})
}

func (h *TicketHandler) CreateTicket(c *gin.Context) {
	var req domain.CreateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "INVALID_PAYLOAD", "message": "Subject is required"},
		})
		return
	}
	createdBy := c.GetString(middleware.ContextKeyUserID)
	ticket, err := h.ticketService.Create(c.Request.Context(), req, createdBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   gin.H{"code": "CREATE_TICKET_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": ticket})
}

func (h *TicketHandler) UpdateTicketStatus(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdateTicketStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "INVALID_PAYLOAD", "message": "Status is required"},
		})
		return
	}
	ticket, err := h.ticketService.UpdateStatus(c.Request.Context(), id, req.Status)
	if err != nil {
		code := "TICKET_ERROR"
		switch err.Error() {
		case "TICKET_NOT_FOUND":
			code = "TICKET_NOT_FOUND"
		case "INVALID_TICKET_STATUS":
			code = "INVALID_TICKET_STATUS"
		}
		statusCode := http.StatusInternalServerError
		if code == "TICKET_NOT_FOUND" {
			statusCode = http.StatusNotFound
		}
		if code == "INVALID_TICKET_STATUS" {
			statusCode = http.StatusBadRequest
		}
		c.JSON(statusCode, gin.H{
			"success": false,
			"error":   gin.H{"code": code, "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": ticket})
}

func (h *TicketHandler) GetTicketDetail(c *gin.Context) {
	detail, err := h.ticketService.GetDetail(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   gin.H{"code": "TICKET_NOT_FOUND", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": detail})
}

func (h *TicketHandler) ReplyToTicket(c *gin.Context) {
	id := c.Param("id")
	var req domain.ReplyToTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   gin.H{"code": "INVALID_PAYLOAD", "message": "Message is required"},
		})
		return
	}
	authorID := c.GetString(middleware.ContextKeyUserID)
	detail, err := h.ticketService.Reply(c.Request.Context(), id, req, authorID)
	if err != nil {
		code := "TICKET_ERROR"
		statusCode := http.StatusInternalServerError
		if err.Error() == "TICKET_NOT_FOUND" {
			code = "TICKET_NOT_FOUND"
			statusCode = http.StatusNotFound
		}
		if err.Error() == "EMPTY_REPLY" {
			code = "EMPTY_REPLY"
			statusCode = http.StatusBadRequest
		}
		c.JSON(statusCode, gin.H{
			"success": false,
			"error":   gin.H{"code": code, "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": detail})
}