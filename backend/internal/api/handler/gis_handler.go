package handler

import (
	"net/http"

	"maxzone/internal/domain"
	"maxzone/internal/service"

	"github.com/gin-gonic/gin"
)

type GisHandler struct {
	gisService service.GisService
}

func NewGisHandler(gisService service.GisService) *GisHandler {
	return &GisHandler{gisService: gisService}
}

// GetMapData serves the full FTTH fiber map payload
func (h *GisHandler) GetMapData(c *gin.Context) {
	data, err := h.gisService.GetMapData(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "GIS_MAP_ERROR",
				"message": err.Error(),
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

// FindNearestBox computes the closest TJ box to a technician GPS position
func (h *GisHandler) FindNearestBox(c *gin.Context) {
	var req domain.NearestBoxRequest
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
	result, err := h.gisService.FindNearestBox(c.Request.Context(), req.Latitude, req.Longitude)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "NEAREST_BOX_ERROR",
				"message": err.Error(),
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

// GetONUSignal returns the live optical reading for the technician signal meter
func (h *GisHandler) GetONUSignal(c *gin.Context) {
	mac := c.Query("mac")
	signal, err := h.gisService.GetONUSignal(c.Request.Context(), mac)
	if err != nil {
		code := "ONU_NOT_FOUND"
		if err.Error() == "MAC_ADDRESS_REQUIRED" {
			code = "MAC_ADDRESS_REQUIRED"
		}
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    code,
				"message": err.Error(),
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": signal})
}

// ListFieldTasks serves the field technician task queue
func (h *GisHandler) ListFieldTasks(c *gin.Context) {
	tasks, err := h.gisService.ListFieldTasks(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "TASKS_ERROR",
				"message": err.Error(),
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": tasks})
}