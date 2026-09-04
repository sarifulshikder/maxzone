# 07 — API Standards, Security & Type Contracts

## 1. RESTful API Architecture & Conventions

All Maxzone backend services expose consistent, strictly typed RESTful JSON APIs versioned under `/api/v1/`.

### 1.1 Strict Case & Formatting Rules
- **JSON Field Names**: ALWAYS `snake_case` (e.g. `download_speed_kbps`, `first_name`, `customer_code`).
- **Go Struct Tags**: ALWAYS specify `json:"field_name"`.
- **TypeScript Interfaces**: ALWAYS match exact `snake_case` properties.
- **Date & Time**: ISO 8601 strings with timezone (e.g. `2026-09-04T15:00:00Z`).

### 1.2 Unified Response Envelopes

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total_records": 120
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The provided customer phone number is already registered.",
    "details": { "phone": "Phone must be unique" }
  }
}
```

---

## 2. Core API Endpoints & Request/Response Contracts

### 2.1 Authentication Endpoints

#### `POST /api/v1/auth/login`
- **Request**:
```json
{
  "username": "admin",
  "password": "Maxzone@2026"
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "8f1a2b3c4d5e...",
    "user": {
      "id": "11111111-1111-1111-1111-111111111111",
      "username": "admin",
      "email": "admin@maxzone.local",
      "first_name": "System",
      "last_name": "Admin",
      "role": "SUPER_ADMIN"
    }
  }
}
```

#### `POST /api/v1/auth/refresh`
- **Request**: `{ "refresh_token": "8f1a2b3c4d5e..." }`
- **Response**: `{ "success": true, "data": { "token": "...", "refresh_token": "..." } }`

---

### 2.2 Customer & Subscription Endpoints

#### `POST /api/v1/customers`
- **Request**:
```json
{
  "first_name": "Karim",
  "last_name": "Ahmed",
  "phone": "01711223344",
  "email": "karim@example.com",
  "nid_passport": "19901234567890",
  "address_line1": "Flat 4B, House 12, Road 5, Mirpur",
  "zone_area": "Mirpur-10",
  "reseller_id": null,
  "service_account": {
    "username": "karim_fiber",
    "password": "secretpassword",
    "nas_id": "77777777-7777-7777-7777-777777777777",
    "package_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "service_type": "PPPOE",
    "static_ip": null,
    "mac_address": null
  }
}
```
- **Response**: `{ "success": true, "data": { "id": "...", "customer_code": "CUST-2026-0001", "status": "ACTIVE" } }`

---

### 2.3 MikroTik Router & Network Endpoints

#### `POST /api/v1/mikrotik/routers`
- **Request**:
```json
{
  "name": "Core CCR-2004",
  "ip_address": "10.10.10.1",
  "api_port": 8728,
  "api_username": "maxzone_api",
  "api_password": "secure_router_password",
  "radius_secret": "radius_secret_key",
  "coa_port": 3799,
  "router_os_version": "v7",
  "is_simulated": true
}
```

#### `POST /api/v1/mikrotik/routers/:id/ping`
- **Response**:
```json
{
  "success": true,
  "data": {
    "status": "ONLINE",
    "latency_ms": 1.4,
    "cpu_load_percent": 14,
    "memory_used_mb": 312,
    "memory_total_mb": 2048,
    "active_ppp_sessions": 348
  }
}
```

#### `POST /api/v1/mikrotik/sessions/disconnect`
- **Request**:
```json
{
  "nas_id": "77777777-7777-7777-7777-777777777777",
  "username": "karim_fiber"
}
```
- **Response**: `{ "success": true, "message": "Disconnect-Request acknowledged by NAS" }`

---

### 2.4 OLT & Optical Telemetry Endpoints

#### `GET /api/v1/olt/devices/:id/signal?pon=0/1/1&onu_id=4`
- **Response**:
```json
{
  "success": true,
  "data": {
    "rx_power_dbm": -19.45,
    "tx_power_dbm": 2.15,
    "status": "OPTIMAL",
    "distance_meters": 420,
    "last_poll_time": "2026-09-04T15:10:00Z"
  }
}
```

---

### 2.5 Billing, bKash & Promise-to-Pay Endpoints

#### `POST /api/v1/billing/invoices/:id/pay-bkash`
- **Response**:
```json
{
  "success": true,
  "data": {
    "payment_url": "https://tokenized.sandbox.bka.sh/checkout/...",
    "payment_id": "TR0011XYZ"
  }
}
```

#### `POST /api/v1/billing/promise-to-pay`
- **Request**: `{ "service_account_id": "..." }`
- **Response**:
```json
{
  "success": true,
  "data": {
    "granted": true,
    "extension_hours": 48,
    "expires_at": "2026-09-06T15:00:00Z",
    "message": "Emergency 48-hour access granted. Connection unblocked."
  }
}
```

---

## 3. Shared TypeScript Interface Definitions

AI agents building the frontend MUST place these exact TypeScript interfaces in `frontend/src/types/index.ts`:

```typescript
// frontend/src/types/index.ts

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'RESELLER' 
  | 'SUB_RESELLER' 
  | 'CUSTOMER' 
  | 'FIELD_TECH' 
  | 'SUPPORT';

export interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
}

export interface Package {
  id: string;
  name: string;
  service_type: 'PPPOE' | 'HOTSPOT' | 'STATIC';
  download_speed_kbps: number;
  upload_speed_kbps: number;
  rate_limit_string: string;
  validity_days: number;
  price: number;
  wholesale_price: number;
  is_active: boolean;
}

export interface Customer {
  id: string;
  user_id: string;
  customer_code: string;
  billing_type: 'PREPAID' | 'POSTPAID';
  billing_cycle: 'CALENDAR_MONTH' | 'ANNIVERSARY';
  phone: string;
  address_line1: string;
  zone_area: string;
  user: User;
  service_account?: ServiceAccount;
}

export interface ServiceAccount {
  id: string;
  username: string;
  service_type: 'PPPOE' | 'HOTSPOT' | 'STATIC';
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'GRACE';
  expires_at: string;
  grace_expires_at?: string;
  last_online_at?: string;
  package: Package;
}

export interface NASRouter {
  id: string;
  name: string;
  ip_address: string;
  api_port: number;
  router_os_version: 'v6' | 'v7';
  is_simulated: boolean;
  is_active: boolean;
  last_status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  last_ping_at?: string;
}

export interface OLTDevice {
  id: string;
  name: string;
  vendor: 'HUAWEI' | 'ZTE' | 'VSOL' | 'BDCOM' | 'CDATA' | 'FIBERHOME';
  ip_address: string;
  is_simulated: boolean;
  is_active: boolean;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  discount: number;
  total_payable: number;
  status: 'UNPAID' | 'PAID' | 'CANCELLED' | 'OVERDUE';
  due_date: string;
  paid_at?: string;
}

export interface ResellerWallet {
  id: string;
  reseller_id: string;
  balance: number;
  currency: string;
  credit_limit: number;
}
```

---

## 4. Zero Hardcoded Credentials & Cryptographic Security

- **Master Key**: Loaded from `APP_KEY` environment variable.
- **AES-256-GCM**: Applied to all passwords (router passwords, OLT passwords, gateway secrets) before saving to PostgreSQL.
- **HMAC Verification**: Gateway callbacks from bKash and Nagad must verify signature before updating invoice status.
