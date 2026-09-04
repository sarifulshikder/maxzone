# 08 — Phased Agent Implementation Roadmap (Agent-Proof)

This roadmap is the definitive operational guide for **AI Coding Agents** building Maxzone. Every phase is self-contained with explicit inputs, database migrations, files to create, automated verification tests, and a **Browser Verification Walkthrough** so the human project owner can open their browser and inspect fully functional UI screens after every phase.

---

## Roadmap Overview

```
Phase 0 ──▶ Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4 ──▶ Phase 5 ──▶ Phase 6 ──▶ Phase 7 ──▶ Phase 8
Docker &    Auth &      MikroTik &  Packages &  Billing &   Reseller    OLT & PON   FTTH GIS    Hotspot &
Scaffold    Admin Shell FreeRADIUS  Customers   bKash/Nagad Hierarchy   Telemetry   & Field App Production
```

---

## Phase 0: Monorepo Foundation & Docker Environment ✅ (COMPLETED & VERIFIED)

### 1. Scope & Deliverables
- Scaffold directories: `backend/`, `frontend/`, `deploy/`.
- Configure `deploy/docker-compose.dev.yml` (PostgreSQL 16 with PostGIS, Redis 7).
- Initialize Go 1.25 backend (`go.mod`) with Gin router and `/api/v1/health` endpoint.
- Initialize Next.js 15 frontend with Tailwind CSS, Shadcn UI setup, and dark/light theme toggle.
- Create master `maxzone.sh` CLI for starting development or production stacks.

### 2. Files to Create:
- `backend/go.mod`, `backend/go.sum`
- `backend/cmd/server/main.go`
- `backend/internal/config/config.go`
- `backend/internal/api/router.go`
- `frontend/package.json`, `frontend/tsconfig.json`, `frontend/tailwind.config.ts`
- `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`
- `deploy/docker-compose.dev.yml`, `maxzone.sh`

### 3. Automated Verification:
```bash
# Start dev database & cache
./maxzone.sh dev-db

# Test Go Backend
cd backend && go run cmd/server/main.go &
curl -s http://localhost:8080/api/v1/health | grep '"status":"UP"'
```

### 🌐 Browser Verification Walkthrough:
1. Open browser to `http://localhost:3000`.
2. Observe the Maxzone Diagnostic Welcome Dashboard:
   - 🟢 Database: `Connected (PostgreSQL 16)`
   - 🟢 Cache: `Connected (Redis 7)`
   - 🟢 Backend Engine: `Online (Go 1.25)`
3. Click the Dark/Light theme toggle in top-right: theme changes instantly with zero layout shifts.

---

## Phase 1: Authentication, RBAC & Super Admin Shell ✅ (COMPLETED & VERIFIED)

### 1. Scope & Deliverables
- PostgreSQL migration: `roles`, `users`, `user_tokens`, `system_settings`.
- Seed initial roles (`SUPER_ADMIN`, `RESELLER`, `SUB_RESELLER`, `CUSTOMER`, `FIELD_TECH`, `SUPPORT`) and default super admin user (`admin / Maxzone@2026`).
- Go JWT auth service (Access token 15m + refresh token rotation in DB).
- Next.js 15 Auth flow (`/login`), protected route middleware, and Super Admin Shell (`/admin/dashboard`).
- User profile dropdown and session logout.

### 2. Files to Create:
- `backend/internal/domain/user.go`
- `backend/internal/repository/user_repository.go`
- `backend/internal/service/auth_service.go`
- `backend/internal/api/handler/auth_handler.go`
- `backend/internal/api/middleware/auth_middleware.go`
- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/app/(admin)/layout.tsx`
- `frontend/src/app/(admin)/dashboard/page.tsx`
- `frontend/src/components/shared/Sidebar.tsx`, `Header.tsx`

### 3. Automated Verification:
```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Maxzone@2026"}' | grep '"success":true'
```

### 🌐 Browser Verification Walkthrough:
1. Navigate to `http://localhost:3000/login`.
2. Enter invalid password -> Toast displays `"Invalid username or password"`.
3. Enter `admin` and `Maxzone@2026` -> Redirected to `/admin/dashboard`.
   > **Note (2026-09):** Post-login redirect validates the `?redirect=` parameter against the logged-in role. A `RESELLER` or `CUSTOMER` will never be bounced to `/admin/dashboard`, and vice versa. If the redirect target doesn't match the role, the user is routed to their role's own portal.
4. Inspect the Admin Shell:
   - Sidebar displays all Maxzone modules (Customers, Routers, OLTs, Packages, Resellers, Billing, GIS, Support, Settings).
   - Topbar displays user avatar, `SUPER_ADMIN` badge, and quick search bar.
   - Click "Logout" -> session cleared and redirected back to `/login`.

---

## Phase 2: Network Infrastructure (MikroTik RouterOS & FreeRADIUS) ✅ (COMPLETED & VERIFIED)

### 1. Scope & Deliverables
- Database tables: `nas_routers`, `nas` (FreeRADIUS client table), `radcheck`, `radreply`, `radacct`.
- Go MikroTik Driver with **Dual-Mode** (`is_simulated = true` for dev, real RouterOS API for production).
- Go FreeRADIUS CoA packet dispatcher (UDP port 3799 Disconnect-Request).
- Admin UI for Router Management (`/admin/mikrotik`): list routers, add router modal, ping test with latency badge, and active session inspection drawer.

### 2. Files to Create:
- `backend/internal/domain/router.go`
- `backend/internal/mikrotik/driver.go` (Real + Simulated implementations)
- `backend/internal/radius/coa.go`
- `backend/internal/api/handler/mikrotik_handler.go`
- `frontend/src/app/(admin)/mikrotik/page.tsx`
- `frontend/src/components/mikrotik/AddRouterDialog.tsx`, `RouterStatsDrawer.tsx`

### 3. Automated Verification:
```bash
# Add a simulated test router via API
curl -s -X POST http://localhost:8080/api/v1/mikrotik/routers \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"name":"CCR-2004 Core","ip_address":"10.0.0.1","is_simulated":true,"radius_secret":"secret123"}'
```

### 🌐 Browser Verification Walkthrough:
1. Navigate to `http://localhost:3000/admin/mikrotik`.
2. Click **"+ Add Router"**, fill in name, IP `10.0.0.1`, check **"Simulation Mode"**, and click Save.
3. Click **"Test Connection"**: A real-time ping badge turns green with latency (e.g. `🟢 1.4 ms`).
4. Click **"View Stats"**: Slide-out drawer renders live CPU load gauge (14%), Memory gauge (312MB / 2048MB), and 5 simulated active PPPoE sessions.
5. Click **"Disconnect Session"**: CoA Disconnect-Request executes and logs success.

---

## Phase 3: Packages, IPAM & Customer Provisioning ✅ (COMPLETED & VERIFIED)

### 1. Scope & Deliverables
- Database tables: `packages`, `ip_pools`, `customers`, `service_accounts`.
- Synchronous sync of new customer PPPoE credentials into FreeRADIUS `radcheck` and `radreply`.
- Admin Package Builder (`/admin/packages`) with burst calculation preview.
- Admin Customer Management (`/admin/customers`): TanStack virtualized table, search, status filtering, and Customer 360 profile drawer.

### 2. Files to Create:
- `backend/internal/domain/package.go`, `customer.go`
- `backend/internal/repository/customer_repository.go`
- `backend/internal/service/customer_service.go`
- `backend/internal/api/handler/customer_handler.go`, `package_handler.go`
- `frontend/src/app/(admin)/packages/page.tsx`, `frontend/src/app/(admin)/customers/page.tsx`
- `frontend/src/components/customers/CustomerDrawer.tsx`, `AddCustomerDialog.tsx`

### 3. Automated Verification:
```bash
# Verify customer sync into radcheck table
psql -U maxzone_user -d maxzone_db -c "SELECT username, attribute, value FROM radcheck;"
```

### 🌐 Browser Verification Walkthrough:
1. Go to `http://localhost:3000/admin/packages` -> Click **"Create Package"** -> Create "30 Mbps Fiber Blast" at `৳ 1000`.
2. Go to `http://localhost:3000/admin/customers` -> Click **"Add Customer"**.
3. Fill in name *"Karim Ahmed"*, phone `01711223344`, username `karim_fiber`, password `pass123`, select the 30 Mbps package, and submit.
4. Customer appears in the table with `ACTIVE` green badge.
5. Click on customer row to open Customer 360 Drawer -> Inspect the **RADIUS AAA Tab**: verify cleartext password and `Mikrotik-Rate-Limit: 30M/30M` are displayed.

---

## Phase 4: Billing, Invoicing, bKash/Nagad & Auto-Provisioning ✅ (COMPLETED & VERIFIED)

### 1. Scope & Deliverables
- Database tables: `invoices`, `payments`, `promise_to_pay`.
- Calendar-month and anniversary invoice generators with pro-rata logic.
- bKash Tokenized Checkout and Nagad API handlers (with sandbox simulator mode for local testing).
- Grace period & self-service "Promise to Pay" emergency 48-hour unblock engine.
- Customer Self-Care Portal (`/customer/dashboard`) and bill payment view (`/customer/pay`).

### 2. Files to Create:
- `backend/internal/domain/billing.go`
- `backend/internal/billing/engine.go`, `bkash.go`, `nagad.go`
- `backend/internal/api/handler/billing_handler.go`
- `frontend/src/app/(customer)/layout.tsx`
- `frontend/src/app/(customer)/dashboard/page.tsx`, `frontend/src/app/(customer)/pay/page.tsx`
- `frontend/src/app/(admin)/billing/page.tsx`

### 🌐 Browser Verification Walkthrough:
1. Go to `http://localhost:3000/admin/billing` -> Click **"Generate Invoices"**. An invoice `INV-202609-0001` for `৳ 1000` is generated for `karim_fiber`.
2. Open `http://localhost:3000/customer/pay` (Customer View).
3. Click **"Pay with bKash"** -> bKash checkout simulator modal appears -> Click **"Confirm Sandbox Payment"**.
4. Toast shows `"Payment Successful! Connection Active"`.
5. Invoice status turns green `PAID`.
6. Test **"Promise to Pay"**: Expire the account artificially from admin -> Switch to customer portal -> Click "Request 48-Hour Promise to Pay" -> System unblocks account and displays 48-hour countdown timer.

---

## Phase 5: Reseller Hierarchy & Double-Entry Wallet System ✅ (COMPLETED & VERIFIED)

### 1. Scope & Deliverables
- Database tables: `resellers`, `reseller_wallets`, `reseller_transactions`.
- Atomic wallet transactions using `SELECT FOR UPDATE` to prevent double-spending.
- Reseller Portal (`/reseller/dashboard`): top wallet bar, customer renewal table with batch selection, and financial ledger statement.
- Reseller self-topup via payment gateway.
- Admin Resellers overview and wallet adjustment panel (`/admin/resellers`).

### 2. Files Created & Verified:
- `backend/migrations/000005_phase5_resellers_wallets.up.sql`
- `backend/internal/domain/reseller.go`
- `backend/internal/repository/reseller_repository.go`
- `backend/internal/service/reseller_service.go`, `backend/internal/service/reseller_service_test.go`
- `backend/internal/api/handler/reseller_handler.go`
- `frontend/src/app/(reseller)/layout.tsx`
- `frontend/src/app/(reseller)/reseller/dashboard/page.tsx`
- `frontend/src/app/(reseller)/reseller/ledger/page.tsx`
- `frontend/src/app/(admin)/admin/resellers/page.tsx`

### 🌐 Browser Verification Walkthrough:
1. Log into `/login` with seeded reseller credentials (`reseller_demo / Pass@123`).
2. Reseller topbar displays: Wallet Balance `৳ 10,000`, Credit Limit `৳ 5,000`.
3. Select 3 customers in the table -> Click **"⚡ Batch Renew Selected"**.
4. System executes atomic wallet deduction (`3 * ৳ 550 = ৳ 1650`), balance updates to `৳ 8,350`, and all 3 customers are renewed.
5. Click **"Financial Ledger"**: Inspect transaction statement showing exact before/after balances.

### 📝 Implementation Notes (2026-09)

1. **Invoice Numbering:** Reseller renewals generate invoices using the sequence `INV-RES-YYYYMM-####`, computed by counting all existing `INV-RES-YYYYMM-*` rows at the start of the transaction and incrementing. This prevents collisions with previously seeded/demo invoices.
2. **Error Propagation:** Both `tx.Create(invoice)` and `tx.Create(payment)` must check and propagate errors. Ignoring them causes PostgreSQL to mark the transaction aborted (SQLSTATE 25P02), which masks the real root cause (typically a constraint violation) as a confusing `current transaction is aborted` error.
3. **Atomicity:** The wallet is locked with `SELECT FOR UPDATE` inside the transaction. If any step fails (insufficient funds, constraint violation, foreign key error), the entire transaction rolls back cleanly — no partial charges, no partial renewals.
4. **Wholesale Pricing:** Renewal cost uses `packages.wholesale_price` when set, falling back to `packages.price`. Both the admin billing engine (`INV-YYYYMM-####`) and reseller renewal engine (`INV-RES-YYYYMM-####`) share the same sequence logic (`billing_repository.GetNextInvoiceSequence` / equivalent in `reseller_repository`).

---

## Phase 6: OLT Telemetry & PON Optical Management

### 1. Scope & Deliverables
- Database tables: `olts`, `pon_ports`, `onus`.
- Go OLT driver with SNMP v2c/v3 and **Simulation Mode** (`is_simulated = true`) for Huawei, ZTE, VSOL, BDCOM.
- Optical power dBm polling engine and health status badge evaluator.
- Unassigned ONU auto-discovery queue.
- Admin OLT Management UI (`/admin/olt`).

### 2. Files to Create:
- `backend/internal/domain/olt.go`
- `backend/internal/olt/driver.go`, `huawei.go`, `zte.go`, `simulator.go`
- `backend/internal/api/handler/olt_handler.go`
- `frontend/src/app/(admin)/olt/page.tsx`
- `frontend/src/components/olt/AddOLTDialog.tsx`, `PONPortCard.tsx`

### 🌐 Browser Verification Walkthrough:
1. Navigate to `http://localhost:3000/admin/olt`.
2. Click **"+ Add OLT"**, select `Huawei MA5800`, IP `10.20.0.1`, check **"Simulation Mode"**, Save.
3. View the OLT card: PON ports render with visual capacity indicators (`PON 0/1/1: 42/64 ONUs`).
4. Click **"Poll Optical Power"**: Table updates with color-coded signal badges:
   - 🟢 `-18.9 dBm (Optimal)`
   - 🟡 `-25.1 dBm (Warning)`
5. Click **"Discovered ONUs"**: Simulated unassigned ONU `HWTC-99887766` is listed with an **"Authorize"** button.

---

## Phase 7: FTTH GIS Fiber Map & Field Technician Mobile Portal

### 1. Scope & Deliverables
- Database tables: `splitters`, `tj_boxes`, `fiber_cables`, `fiber_cores`.
- PostGIS spatial endpoints for optical nodes and colored fiber polylines (TIA-598).
- Admin GIS Full-Screen Map (`/admin/gis`) using Leaflet.
- Field Technician Mobile PWA (`/field/dashboard`): GPS nearest-box radar, live optical meter, and task queue.

### 2. Files to Create:
- `backend/internal/domain/gis.go`
- `backend/internal/service/gis_service.go`
- `backend/internal/api/handler/gis_handler.go`
- `frontend/src/app/(admin)/gis/page.tsx`
- `frontend/src/app/(field)/layout.tsx`, `frontend/src/app/(field)/dashboard/page.tsx`
- `frontend/src/components/gis/LeafletMap.tsx`

### 🌐 Browser Verification Walkthrough:
1. Navigate to `http://localhost:3000/admin/gis`.
2. Interactive Map displays Central Office OLT, primary splitters, TJ boxes, and color-coded fiber paths.
3. Click any TJ Box marker: popup displays `TJ Box #04 (6/8 ports used, 2 available)`.
4. Switch browser to Mobile View (iPhone/Android preset) and navigate to `http://localhost:3000/field`.
5. Click **"Find Nearest Box"**: PostGIS calculates distance and shows `Box #04 (48 meters away)`.
6. Click **"Live Signal Meter"**: Enter ONU MAC, displays live optical reading dial.

---

## Phase 8: Support Helpdesk, Hotspot Captive Portal & Production Docker Stack

### 1. Scope & Deliverables
- Database tables: `tickets`, `ticket_replies`, `hotspot_vouchers`.
- Kanban Support Helpdesk (`/support` / `/admin/support`).
- Responsive Hotspot Captive Portal (`/hotspot`) with PIN voucher and SMS OTP login.
- Production multi-stage `Dockerfile` and `deploy/docker-compose.yml` with Caddy automatic SSL.
- Production management script `maxzone.sh`.

### 2. Files to Create:
- `backend/internal/domain/ticket.go`, `voucher.go`
- `backend/internal/api/handler/ticket_handler.go`, `hotspot_handler.go`
- `frontend/src/app/(support)/tickets/page.tsx`
- `frontend/src/app/(auth)/hotspot/page.tsx`
- `backend/Dockerfile.api`, `backend/Dockerfile.worker`, `frontend/Dockerfile`
- `deploy/docker-compose.yml`, `deploy/Caddyfile`

### 🌐 Browser Verification Walkthrough:
1. Navigate to `http://localhost:3000/support`: Kanban board displays tickets in columns (`OPEN`, `IN_PROGRESS`, `RESOLVED`). Drag and drop a ticket to update status.
2. Navigate to `http://localhost:3000/hotspot` in mobile viewport: Enter voucher PIN `MAXZ-8899` -> Displays success screen and redirects.
3. Run `./maxzone.sh test`: All automated unit tests and integration endpoints return 100% PASS.
