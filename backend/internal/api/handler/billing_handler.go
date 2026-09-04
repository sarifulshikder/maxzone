package handler

import (
	"net/http"
	"strconv"

	"maxzone/internal/domain"
	"maxzone/internal/service"

	"github.com/gin-gonic/gin"
)

type BillingHandler struct {
	billingSvc service.BillingService
}

func NewBillingHandler(billingSvc service.BillingService) *BillingHandler {
	return &BillingHandler{billingSvc: billingSvc}
}

func (h *BillingHandler) ListInvoices(c *gin.Context) {
	status := c.Query("status")
	search := c.Query("search")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))

	items, total, err := h.billingSvc.ListInvoices(c.Request.Context(), status, search, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{"code": "FETCH_INVOICES_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items":     items,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

func (h *BillingHandler) GetInvoice(c *gin.Context) {
	id := c.Param("id")
	inv, err := h.billingSvc.GetInvoice(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{"code": "INVOICE_NOT_FOUND", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    inv,
	})
}

func (h *BillingHandler) GenerateInvoices(c *gin.Context) {
	var req domain.GenerateInvoicesRequest
	_ = c.ShouldBindJSON(&req)

	res, err := h.billingSvc.GenerateMonthlyInvoices(c.Request.Context(), req.Month)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{"code": "INVOICE_GENERATION_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    res,
	})
}

func (h *BillingHandler) CreateBkashPayment(c *gin.Context) {
	var req domain.BkashCreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "INVALID_REQUEST", "message": err.Error()},
		})
		return
	}

	res, err := h.billingSvc.CreateBkashPayment(c.Request.Context(), req.InvoiceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "BKASH_CREATE_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    res,
	})
}

func (h *BillingHandler) ExecuteBkashPayment(c *gin.Context) {
	var req domain.BkashExecutePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "INVALID_REQUEST", "message": err.Error()},
		})
		return
	}

	payment, err := h.billingSvc.ExecuteBkashPayment(c.Request.Context(), req.PaymentID, req.OTP, req.PIN)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "BKASH_EXECUTE_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    payment,
	})
}

func (h *BillingHandler) InitializeNagadPayment(c *gin.Context) {
	var req domain.NagadInitializePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "INVALID_REQUEST", "message": err.Error()},
		})
		return
	}

	res, err := h.billingSvc.InitializeNagadPayment(c.Request.Context(), req.InvoiceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "NAGAD_INIT_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    res,
	})
}

func (h *BillingHandler) VerifyNagadPayment(c *gin.Context) {
	var req domain.NagadVerifyPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "INVALID_REQUEST", "message": err.Error()},
		})
		return
	}

	payment, err := h.billingSvc.VerifyNagadPayment(c.Request.Context(), req.PaymentRefID, req.OTP, req.PIN)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "NAGAD_VERIFY_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    payment,
	})
}

func (h *BillingHandler) RecordManualPayment(c *gin.Context) {
	var req domain.ManualPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "INVALID_REQUEST", "message": err.Error()},
		})
		return
	}

	var receivedBy *string
	if userID, exists := c.Get("user_id"); exists {
		if s, ok := userID.(string); ok {
			receivedBy = &s
		}
	}

	payment, err := h.billingSvc.RecordManualPayment(c.Request.Context(), req, receivedBy)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "PAYMENT_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    payment,
	})
}

func (h *BillingHandler) RequestPromiseToPay(c *gin.Context) {
	var req domain.PromiseToPayRequest
	_ = c.ShouldBindJSON(&req)

	customerID := req.CustomerID
	if customerID == "" {
		// Try fetching the first customer if in test/simulator mode
		// or fetch from user claims
		invoices, _, err := h.billingSvc.ListInvoices(c.Request.Context(), "", "", 1, 0)
		if err == nil && len(invoices) > 0 {
			customerID = invoices[0].CustomerID
		}
	}

	if customerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "CUSTOMER_REQUIRED", "message": "customer ID is required"},
		})
		return
	}

	promise, err := h.billingSvc.RequestPromiseToPay(c.Request.Context(), customerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "PROMISE_TO_PAY_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    promise,
	})
}

func (h *BillingHandler) GetCustomerPortalOverview(c *gin.Context) {
	customerID := c.Query("customer_id")
	if customerID == "" {
		// Default to first customer in system for seamless simulator view
		invoices, _, err := h.billingSvc.ListInvoices(c.Request.Context(), "", "", 1, 0)
		if err == nil && len(invoices) > 0 {
			customerID = invoices[0].CustomerID
		}
	}

	overview, err := h.billingSvc.GetCustomerPortalOverview(c.Request.Context(), customerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{"code": "CUSTOMER_NOT_FOUND", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    overview,
	})
}

func (h *BillingHandler) ArtificiallyExpireCustomer(c *gin.Context) {
	var req domain.ArtificiallyExpireRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "INVALID_REQUEST", "message": err.Error()},
		})
		return
	}

	if err := h.billingSvc.ArtificiallyExpireCustomer(c.Request.Context(), req.CustomerID, req.Status); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{"code": "EXPIRE_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"message": "Customer artificially expired successfully",
		},
	})
}

func (h *BillingHandler) ListPayments(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))

	payments, total, err := h.billingSvc.ListPayments(c.Request.Context(), page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{"code": "FETCH_PAYMENTS_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items":     payments,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}
