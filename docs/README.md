# Maxzone ISP-ERP — Enterprise AI Implementation Documentation

Welcome to the **Maxzone** project documentation suite. Maxzone is a next-generation, high-performance, ultra-modern Internet Service Provider Enterprise Resource Planning (ISP-ERP), Billing, RADIUS, FTTH GIS, and Network Automation platform.

This documentation suite is engineered specifically as a definitive, zero-ambiguity blueprint for **AI Coding Agents** and human administrators to build, verify, deploy, and maintain the entire platform from scratch to production.

---

## 📚 Document Index & Reading Sequence

Every AI coding agent MUST read and adhere to these documents in sequential order before and during implementation:

| Document | Title | Description |
| :--- | :--- | :--- |
| [00_MASTER_BLUEPRINT.md](file:///home/server/maxzone/docs/00_MASTER_BLUEPRINT.md) | **Master Vision & System Blueprint** | Core philosophy, enterprise standards, target performance metrics (<100MB RAM), role-based workflows, and user personas. |
| [01_SYSTEM_ARCHITECTURE.md](file:///home/server/maxzone/docs/01_SYSTEM_ARCHITECTURE.md) | **System & Software Architecture** | Monorepo structure, Go backend modular architecture, Next.js 15 frontend architecture, communication protocols, and events. |
| [02_DATABASE_SCHEMA.md](file:///home/server/maxzone/docs/02_DATABASE_SCHEMA.md) | **Database Schema & Relational Models** | Complete PostgreSQL schema, foreign keys, indexes, RADIUS mapping tables, double-entry wallet accounting, and FTTH inventory models. |
| [03_NETWORK_RADIUS_MIKROTIK_OLT.md](file:///home/server/maxzone/docs/03_NETWORK_RADIUS_MIKROTIK_OLT.md) | **Network, RADIUS, MikroTik & OLT** | RouterOS v6/v7 integration, FreeRADIUS 3.x AAA & CoA, OLT SNMP/CLI telemetry (Huawei, ZTE, VSOL, BDCOM, C-Data, Fiberhome). |
| [04_BILLING_PAYMENTS_AUTOMATION.md](file:///home/server/maxzone/docs/04_BILLING_PAYMENTS_AUTOMATION.md) | **Billing, Payments & Lifecycle Engines** | Calendar-month & dynamic billing, grace periods, Promise-to-Pay, bKash, Nagad, Rocket, SSLCommerz, and automated provisioning. |
| [05_GIS_FIBER_FIELD_OPERATIONS.md](file:///home/server/maxzone/docs/05_GIS_FIBER_FIELD_OPERATIONS.md) | **FTTH GIS Mapping & Field Technician Operations** | Interactive GIS fiber maps, PON/Splitter/TJ Box modeling, optical power dBm monitoring, and mobile field technician workflows. |
| [06_PORTALS_AND_UI_UX_SPEC.md](file:///home/server/maxzone/docs/06_PORTALS_AND_UI_UX_SPEC.md) | **Multi-Portal UI/UX Design System** | Detailed specifications for Super Admin, Reseller, Sub-Reseller, Customer Self-Care, Field Tech, and Support Helpdesk portals. |
| [07_API_AND_SECURITY_SPEC.md](file:///home/server/maxzone/docs/07_API_AND_SECURITY_SPEC.md) | **API Standards & Security Framework** | REST API conventions, JWT auth rotation, RBAC Casbin matrix, webhook HMAC validation, and zero-hardcoded secrets policy. |
| [08_PHASED_IMPLEMENTATION_ROADMAP.md](file:///home/server/maxzone/docs/08_PHASED_IMPLEMENTATION_ROADMAP.md) | **Phased Agent Implementation Roadmap** | Step-by-step development phases with explicit browser-verification checkpoints for the product owner after each phase. |
| [09_DOCKER_DEVOPS_DEPLOYMENT.md](file:///home/server/maxzone/docs/09_DOCKER_DEVOPS_DEPLOYMENT.md) | **Docker, DevOps & Deployment** | Plug-and-play Docker Compose setup, Caddy reverse proxy with automatic SSL, backup strategies, and production readiness scripts. |

---

## 🎯 Ground Rules for AI Agents Working on Maxzone

1. **Zero Hardcoded Credentials**: Every secret, API key, password, and token MUST come from environment variables or encrypted database configuration tables.
2. **Phase-by-Phase Browser Verifiability**: After completing each phase specified in [08_PHASED_IMPLEMENTATION_ROADMAP.md](file:///home/server/maxzone/docs/08_PHASED_IMPLEMENTATION_ROADMAP.md), the system must be fully runnable so the user can open their browser and inspect working, interactive UI screens.
3. **Ultra-Low Resource Footprint**: The backend Go engine must be compiled, clean, and run within minimal memory (<100MB idle/baseline), avoiding unnecessary heavy dependencies.
4. **Resilient Network I/O**: Network communications with MikroTik routers, RADIUS servers, and OLTs must implement timeouts, exponential retries, and asynchronous worker queues (Redis-backed) so network hiccups never lock the UI or HTTP API.
5. **Modern Design System**: All web interfaces must follow modern enterprise aesthetic standards using Next.js 15, Tailwind CSS, Lucide Icons, Tremor, and Shadcn UI (consistent dark/light mode, mobile responsive, clean typography).
