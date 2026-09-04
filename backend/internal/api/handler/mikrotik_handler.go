package handler

import (
	"net/http"

	"maxzone/internal/domain"
	"maxzone/internal/service"

	"github.com/gin-gonic/gin"
)

type MikrotikHandler struct {
	routerService service.RouterService
}

func NewMikrotikHandler(routerService service.RouterService) *MikrotikHandler {
	return &MikrotikHandler{routerService: routerService}
}

func (h *MikrotikHandler) ListRouters(c *gin.Context) {
	routers, err := h.routerService.ListRouters(c.Request.Context())
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
		"data":    routers,
	})
}

func (h *MikrotikHandler) GetRouter(c *gin.Context) {
	id := c.Param("id")
	router, err := h.routerService.GetRouter(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "ROUTER_NOT_FOUND",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    router,
	})
}

func (h *MikrotikHandler) CreateRouter(c *gin.Context) {
	var req domain.CreateRouterRequest
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

	router, err := h.routerService.CreateRouter(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CREATE_ROUTER_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    router,
	})
}

func (h *MikrotikHandler) UpdateRouter(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdateRouterRequest
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

	router, err := h.routerService.UpdateRouter(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UPDATE_ROUTER_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    router,
	})
}

func (h *MikrotikHandler) DeleteRouter(c *gin.Context) {
	id := c.Param("id")
	if err := h.routerService.DeleteRouter(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DELETE_ROUTER_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Router deleted successfully",
	})
}

func (h *MikrotikHandler) PingRouter(c *gin.Context) {
	id := c.Param("id")
	result, err := h.routerService.PingRouter(c.Request.Context(), id)
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

func (h *MikrotikHandler) GetRouterStats(c *gin.Context) {
	id := c.Param("id")
	res, sessions, err := h.routerService.GetRouterStats(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "STATS_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"resource": res,
			"sessions": sessions,
		},
	})
}

func (h *MikrotikHandler) DisconnectSession(c *gin.Context) {
	var req domain.DisconnectSessionRequest
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

	if err := h.routerService.DisconnectSession(c.Request.Context(), req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DISCONNECT_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Disconnect-Request acknowledged by NAS",
	})
}
