# 06 — Multi-Portal UI/UX Design System

## 1. Enterprise UI/UX Design System

Maxzone is designed with an **ultra-premium, modern enterprise visual language**. Outdated, cramped, 1990s-style tables are replaced with responsive, spacious layouts, subtle borders, rich micro-interactions, and real-time live data feeds.

### 1.1 Visual Foundations
- **Color Palette**:
  - **Background**: Deep Zinc Dark (`#09090b` / `bg-zinc-950`) or Crisp Modern Light (`#f8fafc` / `bg-slate-50`).
  - **Surface / Cards**: Raised Zinc (`#18181b` / `bg-zinc-900`) with subtle border (`border-zinc-800`).
  - **Accents**:
    - 🟢 Emerald (`#10b981`): Online PPPoE, Active Subscriptions, Healthy dBm, Paid Invoices.
    - 🟡 Amber (`#f59e0b`): Grace Period, Warning Attenuation, Expiring in 3 Days.
    - 🔴 Rose / Crimson (`#f43f5e`): Suspended, Offline Routers, Fiber Cut (LOS), Overdue.
    - 🔵 Indigo / Sky (`#0ea5e9`): Informational alerts, System bandwidth charts, Invoices.
- **Typography**: Geist Sans / Inter for clear readability; monospace (`font-mono`) with tabular numbers (`tabular-nums`) for IP addresses, MAC addresses, and financial figures.
- **Component Primitives**: Built strictly on **Shadcn UI** (Radix UI primitives wrapped in Tailwind CSS).

---

## 2. Portal Screen Layouts & Functional Specifications

### 2.1 Super Admin & NOC Portal
The central command dashboard for ISP management:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ MAXZONE ISP-ERP   [🔍 Global Search: User, IP, MAC, Phone]   🔔 (3)  👤 Admin │
├───────────────┬──────────────────────────────────────────────────────────┤
│ 📊 Dashboard  │  [ Active Subs ]  [ Online PPPoE ]  [ Monthly Rev ]  [ NOC Alert ]│
│ 👥 Customers  │     4,250             3,890           ৳ 2,450,000        1 LOS   │
│ 🌐 Routers    ├──────────────────────────────────────────────────────────┤
│ ⚡ OLT & PON  │  REAL-TIME BANDWIDTH THROUGHPUT (Last 24 Hours)          │
│ 📦 Packages   │  [~~~~~~~~~~~~~~~~~~ Area Chart: 4.8 Gbps In / 1.2 Gbps Out ~~~]│
│ 💼 Resellers  ├──────────────────────────────────────────────────────────┤
│ 💳 Billing    │  RECENT SUBSCRIBERS           │  ROUTER HEALTH & NAS STATUS   │
│ 🗺️ GIS Map    │  - Karim Ahmed (20M) - Active │  - CCR-1072 Core 1: 🟢 1.2ms  │
│ 🎫 Helpdesk   │  - Hasan Ali   (10M) - Grace  │  - CCR-2004 Core 2: 🟢 0.8ms  │
│ ⚙️ Settings   │  - Apex Ltd    (50M) - Active │  - OLT-Huawei-01 : 🟢 2.1ms  │
└───────────────┴───────────────────────────────┴──────────────────────────┘
```

#### Key Capabilities:
- **Global Search Bar**: Instant Cmd+K search that locates customers by Phone, Username, IP, MAC, or Optical Box Code.
- **MikroTik Manager**: Real-time CPU, RAM, active PPPoE count, ping latency chart, and one-click session disconnect.
- **OLT Management**: Visual PON port capacity gauge (e.g. `PON 1/1: 48/64 ONUs`), unassigned ONU table with one-click authorization.
- **Dynamic Package Builder**: Configure download/upload speeds, burst limits, day/night schedules, and wholesale reseller pricing.

---

### 2.2 Reseller & Sub-Reseller Portal

```
┌──────────────────────────────────────────────────────────────────────────┐
│ MAXZONE RESELLER   Wallet: ৳ 45,200  |  Credit Limit: ৳ 10,000   [+ Top Up] │
├───────────────┬──────────────────────────────────────────────────────────┤
│ 📊 Overview   │  [ My Customers ]  [ Expiring 3 Days ]  [ Expired / Due ]        │
│ 👥 Customers  │        320                 18                  7                 │
│ ➕ Add User   ├──────────────────────────────────────────────────────────┤
│ 💳 Ledger     │  QUICK RENEWAL TABLE                      [⚡ Batch Renew Selected]│
│ 🏢 Sub-Resellers│ [x] user_01  Karim  20 Mbps  ৳ 600  Due: Today   [ Renew ]    │
│ 📈 Analytics  │ [x] user_02  Sumon  15 Mbps  ৳ 500  Due: Today   [ Renew ]    │
└───────────────┴──────────────────────────────────────────────────────────┘
```

#### Key Capabilities:
- **Reseller Self-Topup**: Resellers can top up their wallet balance instantly using bKash/Nagad checkout without calling the ISP owner.
- **Batch Renewal**: Select 20 customers with checkboxes and click "Batch Renew" to renew all accounts in one atomic database operation.
- **Sub-Reseller Management**: Master resellers can create sub-resellers, set custom pricing margins, and allocate credit lines.

---

### 2.3 Customer Self-Care Portal & Mobile PWA

Optimized for end-user subscribers accessing on mobile browsers:

```
┌────────────────────────────────────────┐
│ 📱 My Maxzone Internet                 │
│ Welcome back, Karim Ahmed              │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 🚀 20 Mbps Ultra Fiber Plan        │ │
│ │ Status: ACTIVE 🟢                  │ │
│ │ Days Left: 14 Days (Oct 18, 2026)  │ │
│ │                                    │ │
│ │ [ 💳 RECHARGE NOW WITH bKASH ]    │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ⚡ Optical Signal Health                │
│ Rx Power: -19.4 dBm (Excellent Signal) │
│                                        │
│ 🆘 In an Emergency?                    │
│ [ Request 48-Hour Promise to Pay ]     │
│                                        │
│ 🎫 Support Tickets                     │
│ [ + Create New Support Ticket ]        │
└────────────────────────────────────────┘
```

#### Key Capabilities:
- **1-Click bKash/Nagad Payment**: Opens tokenized checkout; unblocks connection in < 2 seconds upon payment completion.
- **Transparent Signal Indicator**: Shows user their fiber signal strength in plain human language to prevent unnecessary support tickets.
- **Promise-to-Pay**: Self-service emergency unblock when bank apps are down or after midnight.

---

### 2.4 Field Technician Mobile Portal (PWA)

```
┌────────────────────────────────────────┐
│ 🛠️ Maxzone Field Crew                  │
│                                        │
│ [ 🗺️ Open Optical GIS Map ]             │
│                                        │
│ [ 🔍 Find Nearest Splitter / Box ]     │
│   Box #08 (32m away) - 2 Free Ports    │
│                                        │
│ [ ⚡ Live Signal Meter ]                │
│   Enter ONU MAC / Username: [_______]  │
│   Rx: -18.9 dBm | Distance: 350m 🟢   │
│                                        │
│ [ 📷 Scan & Provision New ONU ]        │
│                                        │
│ 📋 Assigned Work Orders (2 Pending)    │
│ - Fiber Splicing at Road 12 [Start]   │
│ - New Link at Flat 4B [Start]         │
└────────────────────────────────────────┘
```

#### Key Capabilities:
- **Outdoor High-Contrast UI**: Crisp dark mode or high-contrast light mode for outdoor sunlight visibility.
- **Live Optical Signal Meter**: Direct SNMP reading with real-time refresh every 3 seconds during fiber splicing.
- **Touch-Friendly Work Orders**: Photo attachment and digital sign-off.

---

### 2.5 Hotspot Captive Portal

Built as a lightweight, lightning-fast static page hosted directly by Caddy / Next.js:

```
┌────────────────────────────────────────┐
│      ⚡ MAXZONE HIGH-SPEED WI-FI        │
│                                        │
│   [ Voucher PIN ]  [ SMS OTP ]  [ Buy ] │
│                                        │
│   Enter Voucher Card PIN:              │
│   ┌────────────────────────────────┐   │
│   │  XXXX - XXXX - XXXX            │   │
│   └────────────────────────────────┘   │
│                                        │
│   [     CONNECT TO INTERNET     ]      │
│                                        │
│   Need a Voucher?                      │
│   Buy 1 Hour (৳ 10) or 1 Day (৳ 30)    │
│   Instantly with bKash / Nagad         │
└────────────────────────────────────────┘
```
