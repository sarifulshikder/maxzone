package handler

import (
	"net/http"

	"maxzone/internal/domain"
	"maxzone/internal/service"

	"github.com/gin-gonic/gin"
)

type PackageHandler struct {
	pkgService service.PackageService
}

func NewPackageHandler(pkgService service.PackageService) *PackageHandler {
	return &PackageHandler{pkgService: pkgService}
}

func (h *PackageHandler) ListPackages(c *gin.Context) {
	packages, err := h.pkgService.ListPackages(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "FETCH_PACKAGES_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    packages,
	})
}

func (h *PackageHandler) GetPackage(c *gin.Context) {
	id := c.Param("id")
	pkg, err := h.pkgService.GetPackage(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "PACKAGE_NOT_FOUND",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    pkg,
	})
}

func (h *PackageHandler) CreatePackage(c *gin.Context) {
	var req domain.CreatePackageRequest
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

	pkg, err := h.pkgService.CreatePackage(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CREATE_PACKAGE_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    pkg,
	})
}

func (h *PackageHandler) UpdatePackage(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdatePackageRequest
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

	pkg, err := h.pkgService.UpdatePackage(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "UPDATE_PACKAGE_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    pkg,
	})
}

func (h *PackageHandler) DeletePackage(c *gin.Context) {
	id := c.Param("id")
	if err := h.pkgService.DeletePackage(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "DELETE_PACKAGE_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Package deleted successfully",
	})
}
