package api

import (
	"context"
	"fmt"
	"net/http"
	"runtime"
	"time"

	"maxzone/internal/api/handler"
	"maxzone/internal/api/middleware"
	"maxzone/internal/config"
	"maxzone/internal/repository"
	"maxzone/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

var startTime = time.Now()

func SetupRouter(cfg *config.Config, db *gorm.DB, rdb *redis.Client) *gin.Engine {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// CORS — allow frontend origins
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOriginFunc = func(origin string) bool {
		return true
	}
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = []string{
		"Origin", "Content-Type", "Accept", "Authorization",
		"X-Requested-With", "Cache-Control", "Pragma", "X-CSRF-Token",
	}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	corsConfig.ExposeHeaders = []string{"Content-Length", "Content-Type"}
	corsConfig.MaxAge = 12 * time.Hour
	r.Use(cors.New(corsConfig))

	// --- Dependency Wiring ---
	userRepo := repository.NewUserRepository(db)
	authSvc := service.NewAuthService(userRepo, db)
	routerRepo := repository.NewRouterRepository(db)
	routerSvc := service.NewRouterService(routerRepo)
	pkgRepo := repository.NewPackageRepository(db)
	pkgSvc := service.NewPackageService(pkgRepo)
	customerRepo := repository.NewCustomerRepository(db)
	customerSvc := service.NewCustomerService(customerRepo, pkgRepo, routerRepo)
	billingRepo := repository.NewBillingRepository(db)
	billingSvc := service.NewBillingService(billingRepo, customerRepo, pkgRepo, routerRepo)
	resellerRepo := repository.NewResellerRepository(db)
	resellerSvc := service.NewResellerService(resellerRepo, customerRepo, routerRepo)
	oltRepo := repository.NewOLTRepository(db)
	oltSvc := service.NewOLTService(oltRepo)

	// Seed the initial admin user (idempotent)
	authSvc.SeedInitialAdmin()

	// --- Handler instances ---
	authHandler := handler.NewAuthHandler(authSvc)
	mikrotikHandler := handler.NewMikrotikHandler(routerSvc)
	packageHandler := handler.NewPackageHandler(pkgSvc)
	customerHandler := handler.NewCustomerHandler(customerSvc)
	billingHandler := handler.NewBillingHandler(billingSvc)
	resellerHandler := handler.NewResellerHandler(resellerSvc)
	oltHandler := handler.NewOLTHandler(oltSvc)

	// Auth middleware
	authMiddleware := middleware.AuthRequired(authSvc)

	v1 := r.Group("/api/v1")
	{
		// --- Health Check ---
		v1.GET("/health", func(c *gin.Context) {
			dbStatus := "CONNECTED"
			if db != nil {
				sqlDB, err := db.DB()
				if err != nil || sqlDB.Ping() != nil {
					dbStatus = "DISCONNECTED"
				}
			} else {
				dbStatus = "NOT_CONFIGURED"
			}

			redisStatus := "CONNECTED"
			if rdb != nil {
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				defer cancel()
				if err := rdb.Ping(ctx).Err(); err != nil {
					redisStatus = "DISCONNECTED"
				}
			} else {
				redisStatus = "NOT_CONFIGURED"
			}

			var memStats runtime.MemStats
			runtime.ReadMemStats(&memStats)

			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data": gin.H{
					"status":          "UP",
					"app_name":        cfg.AppName,
					"environment":     cfg.AppEnv,
					"version":         "1.0.0",
					"database":        dbStatus,
					"redis":           redisStatus,
					"uptime_seconds":  int(time.Since(startTime).Seconds()),
					"memory_alloc_mb": fmt.Sprintf("%.2f MB", float64(memStats.Alloc)/1024/1024),
					"go_version":      runtime.Version(),
				},
			})
		})

		// --- Auth routes (public) ---
		auth := v1.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.Refresh)
			auth.POST("/logout", authMiddleware, authHandler.Logout)
			auth.GET("/me", authMiddleware, authHandler.Me)
		}

		// --- Admin routes (SUPER_ADMIN only) ---
		admin := v1.Group("/admin")
		admin.Use(authMiddleware)
		admin.Use(middleware.RequireRole("SUPER_ADMIN"))
		{
			admin.GET("/dashboard", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"success": true,
					"data": gin.H{
						"message":       "Welcome to Maxzone Admin Dashboard",
						"total_customers": 0,
						"online_sessions": 0,
						"monthly_revenue": 0,
					},
				})
			})
		}

		// --- MikroTik & Network routes (authenticated staff) ---
		mikrotikRoutes := v1.Group("/mikrotik")
		mikrotikRoutes.Use(authMiddleware)
		{
			mikrotikRoutes.GET("/routers", mikrotikHandler.ListRouters)
			mikrotikRoutes.POST("/routers", middleware.RequireRole("SUPER_ADMIN"), mikrotikHandler.CreateRouter)
			mikrotikRoutes.GET("/routers/:id", mikrotikHandler.GetRouter)
			mikrotikRoutes.PUT("/routers/:id", middleware.RequireRole("SUPER_ADMIN"), mikrotikHandler.UpdateRouter)
			mikrotikRoutes.DELETE("/routers/:id", middleware.RequireRole("SUPER_ADMIN"), mikrotikHandler.DeleteRouter)
			mikrotikRoutes.POST("/routers/:id/ping", mikrotikHandler.PingRouter)
			mikrotikRoutes.GET("/routers/:id/stats", mikrotikHandler.GetRouterStats)
			mikrotikRoutes.POST("/sessions/disconnect", middleware.RequireRole("SUPER_ADMIN", "SUPPORT"), mikrotikHandler.DisconnectSession)
		}

		// --- Packages routes (authenticated staff) ---
		packageRoutes := v1.Group("/packages")
		packageRoutes.Use(authMiddleware)
		{
			packageRoutes.GET("", packageHandler.ListPackages)
			packageRoutes.POST("", middleware.RequireRole("SUPER_ADMIN"), packageHandler.CreatePackage)
			packageRoutes.GET("/:id", packageHandler.GetPackage)
			packageRoutes.PUT("/:id", middleware.RequireRole("SUPER_ADMIN"), packageHandler.UpdatePackage)
			packageRoutes.DELETE("/:id", middleware.RequireRole("SUPER_ADMIN"), packageHandler.DeletePackage)
		}

		// --- Customers & Provisioning routes (authenticated staff) ---
		customerRoutes := v1.Group("/customers")
		customerRoutes.Use(authMiddleware)
		{
			customerRoutes.GET("", customerHandler.ListCustomers)
			customerRoutes.POST("", middleware.RequireRole("SUPER_ADMIN", "RESELLER", "SUPPORT"), customerHandler.CreateCustomer)
			customerRoutes.GET("/:id", customerHandler.GetCustomer)
			customerRoutes.PUT("/:id", middleware.RequireRole("SUPER_ADMIN", "SUPPORT"), customerHandler.UpdateCustomer)
			customerRoutes.DELETE("/:id", middleware.RequireRole("SUPER_ADMIN"), customerHandler.DeleteCustomer)
			customerRoutes.GET("/radius/:username", middleware.RequireRole("SUPER_ADMIN", "SUPPORT"), customerHandler.GetRadiusAttributes)
		}

		// --- Billing, Invoicing, bKash/Nagad & Promise to Pay ---
		billingRoutes := v1.Group("/billing")
		{
			// Public / Customer Portal endpoints
			billingRoutes.GET("/customer/overview", billingHandler.GetCustomerPortalOverview)
			billingRoutes.POST("/promise-to-pay", billingHandler.RequestPromiseToPay)
			billingRoutes.POST("/pay/bkash/create", billingHandler.CreateBkashPayment)
			billingRoutes.POST("/pay/bkash/execute", billingHandler.ExecuteBkashPayment)
			billingRoutes.POST("/pay/nagad/initialize", billingHandler.InitializeNagadPayment)
			billingRoutes.POST("/pay/nagad/verify", billingHandler.VerifyNagadPayment)

			// Authenticated Admin / Staff endpoints
			billingRoutes.GET("/invoices", authMiddleware, billingHandler.ListInvoices)
			billingRoutes.GET("/invoices/:id", authMiddleware, billingHandler.GetInvoice)
			billingRoutes.POST("/invoices/generate", authMiddleware, middleware.RequireRole("SUPER_ADMIN"), billingHandler.GenerateInvoices)
			billingRoutes.POST("/pay/manual", authMiddleware, middleware.RequireRole("SUPER_ADMIN", "SUPPORT"), billingHandler.RecordManualPayment)
			billingRoutes.GET("/payments", authMiddleware, billingHandler.ListPayments)
			billingRoutes.POST("/customer/expire", authMiddleware, middleware.RequireRole("SUPER_ADMIN", "SUPPORT"), billingHandler.ArtificiallyExpireCustomer)
		}

		// --- OLT Telemetry & PON Optical Management ---
		oltRoutes := v1.Group("/olt")
		oltRoutes.Use(authMiddleware)
		{
			oltRoutes.GET("/devices", oltHandler.ListOLTs)
			oltRoutes.POST("/devices", middleware.RequireRole("SUPER_ADMIN"), oltHandler.CreateOLT)
			oltRoutes.GET("/devices/:id", oltHandler.GetOLT)
			oltRoutes.PUT("/devices/:id", middleware.RequireRole("SUPER_ADMIN"), oltHandler.UpdateOLT)
			oltRoutes.DELETE("/devices/:id", middleware.RequireRole("SUPER_ADMIN"), oltHandler.DeleteOLT)
			oltRoutes.POST("/devices/:id/ping", oltHandler.TestConnection)
			oltRoutes.POST("/devices/:id/poll", oltHandler.PollPorts)
			oltRoutes.GET("/devices/:id/detail", oltHandler.GetOLTDetail)
			oltRoutes.GET("/devices/:id/discovered", oltHandler.ListDiscoveredONUs)
			oltRoutes.POST("/devices/:id/onus/:onuId/authorize", middleware.RequireRole("SUPER_ADMIN", "SUPPORT"), oltHandler.AuthorizeONU)
			oltRoutes.PUT("/devices/:id/onus/:onuId", middleware.RequireRole("SUPER_ADMIN", "SUPPORT"), oltHandler.UpdateONU)
		}

		// --- Reseller Portal & Double-Entry Wallet Ledger ---
		resellerRoutes := v1.Group("/reseller")
		resellerRoutes.Use(authMiddleware)
		resellerRoutes.Use(middleware.RequireRole("RESELLER", "SUB_RESELLER", "SUPER_ADMIN"))
		{
			resellerRoutes.GET("/dashboard", resellerHandler.GetMyDashboardOverview)
			resellerRoutes.POST("/renew/batch", resellerHandler.BatchRenewCustomers)
			resellerRoutes.POST("/wallet/topup", resellerHandler.TopupWallet)
			resellerRoutes.GET("/ledger", resellerHandler.ListMyLedger)
			resellerRoutes.GET("/customers", resellerHandler.ListMyCustomers)
		}

		// --- Admin Reseller Management ---
		adminResellerRoutes := v1.Group("/admin/resellers")
		adminResellerRoutes.Use(authMiddleware)
		adminResellerRoutes.Use(middleware.RequireRole("SUPER_ADMIN"))
		{
			adminResellerRoutes.GET("", resellerHandler.AdminListResellers)
			adminResellerRoutes.POST("/adjust", resellerHandler.AdminAdjustWallet)
		}
	}

	return r
}
