package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"maxzone/internal/config"
	"maxzone/internal/repository"
	"maxzone/internal/service"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// worker runs scheduled maintenance jobs that the API must not block on:
//   - heartbeat + uptime bookkeeping
//   - optional end-of-month invoice generation (WORKER_ENABLE_INVOICES=true)
//
// In production deploy this image via `deploy/docker-compose.yml` (Dockerfile.worker).
func main() {
	cfg := config.Load()

	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)

	var db *gorm.DB
	var err error
	for attempts := 1; attempts <= 10; attempts++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err == nil {
			sqlDB, dbErr := db.DB()
			if dbErr == nil && sqlDB.Ping() == nil {
				sqlDB.SetMaxIdleConns(5)
				sqlDB.SetMaxOpenConns(10)
				break
			}
		}
		log.Printf("[WORKER] Waiting for PostgreSQL (attempt %d/10): %v", attempts, err)
		time.Sleep(3 * time.Second)
	}
	if err != nil {
		log.Fatalf("[WORKER] Failed to connect to PostgreSQL: %v", err)
	}
	log.Println("[WORKER] Connected to PostgreSQL")

	customerRepo := repository.NewCustomerRepository(db)
	pkgRepo := repository.NewPackageRepository(db)
	routerRepo := repository.NewRouterRepository(db)
	billingRepo := repository.NewBillingRepository(db)
	billingSvc := service.NewBillingService(billingRepo, customerRepo, pkgRepo, routerRepo)

	enableInvoices := os.Getenv("WORKER_ENABLE_INVOICES") == "true"

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	interval := 1 * time.Minute
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Printf("[WORKER] Started. Tick every %v (invoices enabled: %v)", interval, enableInvoices)
	for {
		select {
		case <-ctx.Done():
			log.Println("[WORKER] Shutdown signal received, draining jobs")
			return
		case now := <-ticker.C:
			log.Printf("[WORKER] Heartbeat %s", now.UTC().Format(time.RFC3339))
			if enableInvoices && now.Day() == 1 {
				month := now.Format("2006-01")
				resp, genErr := billingSvc.GenerateMonthlyInvoices(ctx, month)
				if genErr != nil {
					log.Printf("[WORKER] Invoice generation for %s failed: %v", month, genErr)
				} else {
					log.Printf("[WORKER] Invoices generated for %s: %d created (amount %.2f)",
						month, resp.GeneratedCount, resp.TotalAmount)
				}
			}
		}
	}
}