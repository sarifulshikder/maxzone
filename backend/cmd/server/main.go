package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"maxzone/internal/api"
	"maxzone/internal/config"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	cfg := config.Load()

	// Connect to PostgreSQL
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)

	var db *gorm.DB
	var err error
	for attempts := 1; attempts <= 5; attempts++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		if err == nil {
			sqlDB, err := db.DB()
			if err == nil && sqlDB.Ping() == nil {
				sqlDB.SetMaxIdleConns(10)
				sqlDB.SetMaxOpenConns(50)
				sqlDB.SetConnMaxLifetime(30 * time.Minute)
				log.Println("🐘 Connected to PostgreSQL successfully")
				break
			}
		}
		log.Printf("⚠️ Waiting for PostgreSQL (attempt %d/5): %v", attempts, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatalf("❌ Failed to connect to PostgreSQL: %v", err)
	}

	// Connect to Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("⚠️ Redis warning: %v", err)
	} else {
		log.Println("⚡ Connected to Redis successfully")
	}

	// Initialize API Router
	router := api.SetupRouter(cfg, db, rdb)

	addr := fmt.Sprintf("0.0.0.0:%d", cfg.Port)
	log.Printf("🚀 Maxzone Backend API starting on http://%s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("❌ Server failed: %v", err)
	}
}
