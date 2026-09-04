# 01 — System & Software Architecture

## 1. Monorepo Structure

Maxzone utilizes a clean, modular monorepo containing the Go backend engine, the Next.js 15 frontend application, and the Docker orchestration deployment manifests.

```
maxzone/
├── backend/                  # High-performance Go (Golang 1.25+) Core Engine
│   ├── cmd/
│   │   ├── server/           # Main entry point (HTTP API, WebSockets, RADIUS hooks)
│   │   └── worker/           # Background scheduler (billing cron, SNMP poller, SMS)
│   ├── internal/
│   │   ├── api/              # HTTP handlers, routers, middlewares, validators
│   │   │   ├── handler/      # Domain HTTP handlers (auth, customer, router, etc.)
│   │   │   ├── middleware/   # JWT auth, CORS, Rate-limit, RBAC
│   │   │   └── router.go     # Gin router tree
│   │   ├── config/           # Environment variables and config loader
│   │   ├── domain/           # Core domain models, interfaces, DTOs
│   │   ├── repository/       # PostgreSQL data access layer (GORM)
│   │   ├── service/          # Business logic (Customer, Billing, Reseller, Auth)
│   │   ├── mikrotik/         # MikroTik RouterOS v6/v7 driver & simulator
│   │   ├── radius/           # FreeRADIUS database sync & CoA/PoD engine
│   │   ├── olt/              # OLT SNMP & CLI drivers (Huawei, ZTE, VSOL, BDCOM)
│   │   ├── billing/          # Invoicing, payment gateway webhooks, grace periods
│   │   ├── gis/              # Optical network topology & geospatial calculations
│   │   └── sms/              # SMS gateway adapters (Greenweb, BulkSMS, etc.)
│   ├── pkg/                  # Shared utilities (crypto AES-GCM, logger, errors)
│   ├── migrations/           # PostgreSQL SQL migration files
│   ├── go.mod
│   └── go.sum
├── frontend/                 # Ultra-Modern Next.js 15 (React 19) Dashboard
│   ├── src/
│   │   ├── app/              # Next.js App Router (Grouped routes)
│   │   │   ├── (auth)/       # Login, Register, Hotspot Captive Portal
│   │   │   ├── (admin)/      # Super Admin & NOC Management views
│   │   │   ├── (reseller)/   # Reseller & Sub-Reseller views
│   │   │   ├── (customer)/   # Customer Self-Care portal & payments
│   │   │   ├── (field)/      # Field Technician & Lineman mobile GIS views
│   │   │   ├── (support)/    # Helpdesk & Ticketing views
│   │   │   └── layout.tsx    # Root layout & theme providers
│   │   ├── components/       # Shadcn UI primitives, data tables, modal dialogs
│   │   │   ├── ui/           # Button, Card, Dialog, Table, Tabs, Input, etc.
│   │   │   └── shared/       # StatCards, Charts, StatusBadges, TopNav, Sidebar
│   │   ├── hooks/            # Custom React hooks (useAuth, useSocket, useQuery)
│   │   ├── lib/              # API client (Axios with refresh interceptors), utils
│   │   ├── types/            # TypeScript interfaces strictly matching Go DTOs
│   │   └── stores/           # Zustand state stores (global state, user session)
│   ├── public/               # Static assets, logos, captive portal templates
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── deploy/                   # Production & Development Orchestration
│   ├── docker-compose.yml    # Full production stack orchestration
│   ├── docker-compose.dev.yml# Dev stack (PostgreSQL + Redis only for fast local run)
│   ├── Caddyfile             # Reverse proxy config with automated SSL
│   ├── freeradius/           # FreeRADIUS 3 config files and dictionaries
│   └── postgres/             # Initial SQL scripts & extensions (postgis)
├── docs/                     # Full system specifications (this folder)
├── maxzone.sh                # Unified management CLI
└── .env.example              # Master template for all environment variables
```

---

## 2. Backend Architecture & Exact Go Dependencies

The backend is built as a **Go Modular Monolith**, emphasizing:
- **Clean Architecture separation**: Handlers -> Services -> Repositories -> Database/Drivers.
- **Low memory consumption**: Baseline memory < 60MB; operational peak < 150MB.
- **Hardware Abstraction**: All hardware interactions (MikroTik, OLT) go through Go interfaces with both `Real` and `Simulated` implementations.

### 2.1 Standard `go.mod` Dependencies (Pre-Audited)
AI agents MUST use these proven libraries to prevent dependency conflicts:
```go
module maxzone

go 1.25.0

require (
    github.com/gin-gonic/gin v1.10.0
    github.com/gin-contrib/cors v1.7.2
    github.com/google/uuid v1.6.0
    github.com/golang-jwt/jwt/v5 v5.2.1
    golang.org/x/crypto v0.27.0
    gorm.io/gorm v1.25.12
    gorm.io/driver/postgres v1.5.9
    github.com/redis/go-redis/v9 v9.6.1
    github.com/hibiken/asynq v0.24.1
    github.com/gorilla/websocket v1.5.3
    layeh.com/radius v0.0.0-20231213012653-1006ff2d64f0
    github.com/go-routeros/routeros/v3 v3.0.0
    github.com/gosnmp/gosnmp v1.38.0
    github.com/joho/godotenv v1.5.1
)
```

---

## 3. Frontend Architecture & Client-Server Contract

### 3.1 Next.js 15 & React 19 Client Strategy
- All data-fetching interactive pages (Tables, Modals, Forms, Charts, GIS Maps) use `"use client"` at the top of the file.
- State is managed via **TanStack React Query v5** for server-state caching and **Zustand** for local UI state.

### 3.2 Standard Axios API Client (`src/lib/api.ts`)
To prevent token expiration bugs, the API client automatically handles JWT refresh tokens:

```typescript
// src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('maxzone_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response Interceptor: Handle 401 & Refresh Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('maxzone_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        
        const { token, refresh_token } = res.data.data;
        localStorage.setItem('maxzone_access_token', token);
        localStorage.setItem('maxzone_refresh_token', refresh_token);
        
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        localStorage.removeItem('maxzone_access_token');
        localStorage.removeItem('maxzone_refresh_token');
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 4. Communication & Protocol Flow

### 4.1 Real-Time Network Control Flow (CoA / Disconnect)
When a customer pays or an admin resets a connection:

```
[ Customer Pays via bKash ]
             │
             ▼
[ Payment Gateway Webhook ] ──▶ [ Go Backend Invoicing Engine ]
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
    [ Update DB Subscription ]                                [ Send RADIUS CoA / PoD ]
    (Status: Active, Expiry: +30d)                            (RFC 3576 Packet to NAS)
               │                                                         │
               ▼                                                         ▼
    [ Emit Event to Redis PubSub ]                            [ MikroTik Terminates Session ]
               │                                                         │
               ▼                                                         ▼
    [ Push WS Alert to UI ]                                  [ PPPoE Reconnects Immediately ]
    ("Payment Confirmed: 20Mbps")                            (Assigned to High-Speed Queue)
```

---

## 5. Development vs Production Environments

Maxzone supports two smooth operation modes:

1. **Fast Local Development Mode**:
   - PostgreSQL and Redis run via `docker compose -f deploy/docker-compose.dev.yml up -d`.
   - Go backend runs locally via `go run cmd/server/main.go` (instant compilation, zero container build delay).
   - Next.js runs locally via `npm run dev` (Fast HMR hot-module reload on `http://localhost:3000`).

2. **Plug-and-Play Production Mode**:
   - Everything runs fully containerized via `docker compose -f deploy/docker-compose.yml up -d` with automated Caddy SSL reverse proxy.
