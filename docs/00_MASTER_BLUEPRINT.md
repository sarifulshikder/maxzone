# 00 — Master Vision & System Blueprint

## 1. Executive Summary & Vision

**Maxzone** is an enterprise-grade, cloud-native, plug-and-play Internet Service Provider Enterprise Resource Planning (ISP-ERP), Automated Billing, RADIUS Server Management, FTTH GIS Optical Network, and NOC Automation suite.

Designed from the ground up to replace outdated, bloated, monolithic ISP software (such as legacy PHP/Perl scripts or heavy Java systems), Maxzone pairs a **blazing-fast, low-memory Go (Golang) modular backend engine** (<100MB baseline footprint) with an **ultra-modern Next.js 15 (React 19) web dashboard**.

Maxzone is engineered to be built, expanded, and maintained exclusively by **AI Coding Agents**, ensuring clean code, comprehensive tests, and modular architecture. After each development phase, the human project creator can open their web browser, log into the admin or specialized portals, and visually verify fully functional, interactive capabilities.

---

## 2. Core Architectural Pillars

### 2.1 Ultra-Low Resource Consumption & High Concurrency
- **Backend**: Built in **Go (Golang)**. Single compiled binary or lightweight Docker container.
- **Resource Footprint**: Baseline memory < 100MB RAM; operational peak < 300MB RAM even with 50,000 active subscribers.
- **Concurrency**: Goroutines and non-blocking I/O for concurrent SNMP polling of OLTs, RouterOS API communication, RADIUS authentication/accounting, and webhook processing.

### 2.2 Enterprise-Grade Security & Zero-Hardcoded Secrets
- Strict separation of credentials. All secrets (database credentials, JWT private keys, RADIUS shared secrets, MikroTik API passwords, payment gateway merchant keys) are injected through environment variables or encrypted in PostgreSQL using AES-256-GCM.
- Zero credentials stored in source code or Git.
- Fine-grained Role-Based Access Control (RBAC) enforced at both HTTP middleware and database query scopes.

### 2.3 Plug-and-Play Single-Command Deployment
- Deployable in any clean Linux environment (Ubuntu 22.04/24.04 LTS, Debian 12, Rocky Linux) via Docker Compose:
  ```bash
  docker compose up -d
  ```
- Bundles Caddy as the automated reverse proxy with automatic SSL certificate issuance via Let's Encrypt / ZeroSSL, or automatic local certificates in development.

### 2.4 Browser-Verifiable Phased Engineering
- Development is structured into sequential phases. Every phase must terminate with:
  1. A runnable backend and database migration.
  2. A rendered, responsive web UI accessible from a browser.
  3. Interactive test flows that the creator can test immediately without writing code.

---

## 3. User Personas & Dedicated Portals

Maxzone provides 6 distinct, customized user portals designed for distinct operational roles:

```
                                  ┌────────────────────────┐
                                  │   Maxzone Core Engine   │
                                  │   (Go + PostgreSQL)    │
                                  └───────────┬────────────┘
         ┌──────────────────┬─────────────────┼─────────────────┬──────────────────┐
         │                  │                 │                 │                  │
         ▼                  ▼                 ▼                 ▼                  ▼
┌─────────────────┐ ┌──────────────┐ ┌────────────────┐ ┌──────────────┐ ┌──────────────────┐
│  Super Admin    │ │ Reseller &   │ │ Customer Self- │ │ Field Tech   │ │ Support / NOC    │
│  & NOC Portal   │ │ Sub-Reseller │ │ Care Portal    │ │ Mobile App   │ │ Helpdesk Portal  │
└─────────────────┘ └──────────────┘ └────────────────┘ └──────────────┘ └──────────────────┘
```

### 3.1 Super Admin & ISP Management Portal
- **Users**: ISP Owners, General Managers, Chief Financial Officers, Chief Network Engineers.
- **Capabilities**:
  - Global dashboard with real-time revenue, active subscriber counts, online/offline PPPoE sessions, bandwidth graphs.
  - MikroTik Router management (RouterOS v6 & v7 API/REST, queues, address-lists, reboot, traffic monitor).
  - RADIUS Server management (Radcheck, Radreply, Radacct live sessions, Disconnect-Request/CoA port 3799).
  - OLT & PON management (Huawei, ZTE, VSOL, BDCOM, C-Data, Fiberhome ONU discovery, optical power dBm monitoring).
  - Packages & Bandwidth profiles (download/upload speed, burst, day/night policies, FUP limits).
  - Reseller wallet & credit limits, commission policies, billing automation cron scheduler.
  - Full system settings, audit logs, SMS templates, payment gateway credentials.

### 3.2 Reseller & Sub-Reseller Portal
- **Users**: Franchise partners, master resellers, sub-resellers, and zone distributors.
- **Capabilities**:
  - Prepaid wallet balance & credit limit indicator.
  - One-click customer creation and instant PPPoE/Hotspot provisioning.
  - Package renewal, auto-recharge, and batch account renewals.
  - Reseller commission ledger and transaction statement with PDF/Excel export.
  - Dedicated sub-reseller management (master resellers creating and funding sub-resellers).
  - Customer status overview: Online, Offline, Expired, In-Grace-Period.

### 3.3 Customer Self-Care Portal & Mobile PWA
- **Users**: Residential and commercial broadband / hotspot subscribers.
- **Capabilities**:
  - Live subscription status: Active package, expiration date, daily/monthly data consumption.
  - One-click online payment via **bKash, Nagad, Rocket, SSLCommerz, Shurjopay**.
  - Instant auto-unblock upon successful payment.
  - Self-service "Promise to Pay" (emergency 24/48-hour bandwidth extension request).
  - Live optical signal test (displays their ONU Rx/Tx power in clear English/Bengali).
  - Support ticket submission and real-time chat with NOC.
  - Wi-Fi password change request / Router remote management (where supported).

### 3.4 Field Technician & Lineman Mobile Portal
- **Users**: Optical fiber splicers, outdoor installation technicians, field support crew.
- **Capabilities**:
  - Mobile-first, touchscreen-optimized responsive UI / PWA.
  - Optical network GIS map with GPS location tracking (locates nearest Splitter, TJ box, and drop cable path).
  - Live ONU optical power meter: displays instant signal (e.g. `-19.4 dBm - Excellent`) directly from OLT SNMP.
  - Fast ONU activation: scan QR code/MAC address or input PON/ONU ID to authorize and link to a customer account.
  - Installation and repair task queue with status checklist and photo upload (e.g., photo of installed optical box).

### 3.5 Support & Helpdesk Portal
- **Users**: Customer care agents, NOC tier-1 and tier-2 staff.
- **Capabilities**:
  - Kanban ticket board and prioritized SLA queue.
  - Quick customer lookup by phone number, username, IP address, MAC, or optical box tag.
  - One-click network diagnostics: Ping router, check RADIUS session, query live OLT signal dBm, send CoA disconnect to bounce session.
  - SMS & WhatsApp quick message templates.

### 3.6 Hotspot Captive Portal & Voucher Engine
- **Users**: Public Wi-Fi users, campus, hotel, and cafe patrons.
- **Capabilities**:
  - Responsive, branded captive portal landing page (MikroTik Hotspot compatible).
  - Voucher card PIN login (printed scratch card / QR code).
  - SMS OTP verification for free or premium trial access.
  - Direct digital purchase: pay via bKash/Nagad and immediately receive login credentials via SMS.

---

## 4. Key Functional Metrics & SLAs

| Domain | Target Metric / SLA | Architectural Enforcement |
| :--- | :--- | :--- |
| **API Response Time** | `< 30ms` (p95) for database queries | Go Gin/Fiber engine, indexed PostgreSQL queries, Redis caching |
| **Session Disconnect (CoA)** | `< 1.5s` from payment to unblock | UDP Packet of Disconnect (RFC 3576 / RFC 5176) to NAS |
| **MicroTik Sync Latency** | `< 2.0s` across API socket | Non-blocking connection pooling via Go RouterOS client |
| **OLT Signal Polling** | `< 1.0s` per ONU on demand | Direct SNMP UDP v2c/v3 request without shell execution |
| **System Memory Footprint** | `< 100MB` base RAM | Compiled Go binary, no heavy runtime interpreter |
| **Web Load Time** | `< 1.2s` First Contentful Paint | Next.js 15 Server Components, Tailwind CSS, TanStack Query |

---

## 5. Security & Data Integrity Principles

1. **Double-Entry Financial Accounting**: Reseller wallets, customer balances, and invoice payments are strictly recorded in balanced debit/credit ledger entries. No balances are mutated without an audit-trail transaction record.
2. **Idempotent Network Provisioning**: Provisioning operations (create user, change speed, suspend, resume) must be idempotent. Re-running a task produces the same desired state on the MikroTik router or RADIUS database.
3. **Graceful Degradation**: If an external router or OLT is offline, Maxzone marks the device as `UNREACHABLE`, queues synchronization tasks in Redis, and continues serving all other customers and portals uninterrupted.
4. **Data Isolation**: Multi-tenant data segregation guarantees that a reseller can only view and mutate customers, vouchers, and transactions within their assigned sub-hierarchy.
