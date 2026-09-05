package handler

import (
	"net/http"

	"maxzone/internal/domain"
	"maxzone/internal/service"

	"github.com/gin-gonic/gin"
)

type OLTHandler struct {
	oltService service.OLTService
}

func NewOLTHandler(oltService service.OLTService) *OLTHandler {
	return &OLTHandler{oltService: oltService}
}

func (h *OLTHandler) ListOLTs(c *gin.Context) {
	devices, err := h.oltService.ListOLTs(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "FETCH_ERROR",
				"message": err.Error(),
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    devices,
	})
}

func (h *OLTHandler) GetOLT(c *gin.Context) {
	id := c.Param("id")
	device, err := h.oltService.GetOLT(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "OLT_NOT_FOUND",
				"message": err.Error(),
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    device,
	})
}

func (h *OLTHandler) CreateOLT(c *gin.Context) {
	var req domain.CreateOLTRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_PAYLOAD",
				"message": err.Error(),
			},
		})
		return
	}

	device, err := h.oltService.CreateOLT(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CREATE_OLT_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    device,
	})
}

func (h *OLTHandler) UpdateOLT(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdateOLTRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_PAYLOAD",
				"message": err.Error(),
			},
		})
		return
	}

	device, err := h.oltService.UpdateOLT(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UPDATE_OLT_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    device,
	})
}

func (h *OLTHandler) DeleteOLT(c *gin.Context) {
	id := c.Param("id")
	if err := h.oltService.DeleteOLT(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DELETE_OLT_FAILED",
				"message": err.Error(),
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "OLT deleted successfully",
	})
}

func (h *OLTHandler) TestConnection(c *gin.Context) {
	id := c.Param("id")
	result, err := h.oltService.TestConnection(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "PING_ERROR",
				"message": err.Error(),
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

func (h *OLTHandler) PollPorts(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.oltService.PollPorts(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "POLL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    detail,
	})
}

func (h *OLTHandler) GetOLTDetail(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.oltService.GetOLTDetail(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DETAIL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    detail,
	})
}

func (h *OLTHandler) ListDiscoveredONUs(c *gin.Context) {
	id := c.Param("id")
	onus, err := h.oltService.ListDiscoveredONUs(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "FETCH_ERROR",
				"message": err.Error(),
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    onus,
	})
}

func (h *OLTHandler) AuthorizeONU(c *gin.Context) {
	oltID := c.Param("id")
	onuID := c.Param("onuId")
	onu, err := h.oltService.AuthorizeONU(c.Request.Context(), oltID, onuID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "AUTHORIZE_FAILED",
				"message": err.Error(),
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    onu,
	})
}

func (h *OLTHandler) UpdateONU(c *gin.Context) {
	oltID := c.Param("id")
	onuID := c.Param("onuId")
	var req domain.UpdateONURequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_PAYLOAD",
				"message": err.Error(),
			},
		})
		return
	}

	onu, err := h.oltService.UpdateONU(c.Request.Context(), oltID, onuID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UPDATE_ONU_FAILED",
				"message": err.Error(),
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    onu,
	})
}