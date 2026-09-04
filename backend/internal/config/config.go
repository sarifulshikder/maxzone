package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppName     string
	AppEnv      string
	Port        int
	AppURL      string
	FrontendURL string

	// Database
	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// Redis
	RedisHost     string
	RedisPort     int
	RedisPassword string
	RedisDB       int

	// Security
	JWTSecret string
	AppKey    string
}

func Load() *Config {
	// Attempt to load .env from root or parent directories
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	port, _ := strconv.Atoi(getEnv("APP_PORT", "8080"))
	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))
	redisPort, _ := strconv.Atoi(getEnv("REDIS_PORT", "6379"))
	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))

	cfg := &Config{
		AppName:       getEnv("APP_NAME", "Maxzone"),
		AppEnv:        getEnv("APP_ENV", "development"),
		Port:          port,
		AppURL:        getEnv("APP_URL", "http://localhost:8080"),
		FrontendURL:   getEnv("FRONTEND_URL", "http://localhost:3000"),
		DBHost:        getEnv("DB_HOST", "localhost"),
		DBPort:        dbPort,
		DBUser:        getEnv("DB_USER", "maxzone_user"),
		DBPassword:    getEnv("DB_PASSWORD", "maxzone_password"),
		DBName:        getEnv("DB_NAME", "maxzone_db"),
		DBSSLMode:     getEnv("DB_SSL_MODE", "disable"),
		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     redisPort,
		RedisPassword: getEnv("REDIS_PASSWORD", "redis_secret"),
		RedisDB:       redisDB,
		JWTSecret:     getEnv("JWT_SECRET", "super_secret_jwt_key_for_maxzone_development_testing_2026"),
		AppKey:        getEnv("APP_KEY", "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU="),
	}

	log.Printf("[CONFIG] Loaded configuration for environment: %s", cfg.AppEnv)
	return cfg
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
