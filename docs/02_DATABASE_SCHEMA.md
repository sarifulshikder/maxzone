# 02 — Database Schema & Relational Models

## 1. Schema Architecture Overview

Maxzone uses **PostgreSQL 16** as its primary relational datastore. The database is organized into logical domains to handle multi-tenancy, high-speed RADIUS AAA queries, double-entry financial bookkeeping, and FTTH GIS geospatial data.

Required Extensions:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
```

---

## 2. Core Relational Tables & DDL

### 2.1 Identity, Users & RBAC

```sql
-- Roles Table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL, -- 'SUPER_ADMIN', 'RESELLER', 'SUB_RESELLER', 'CUSTOMER', 'FIELD_TECH', 'SUPPORT'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_phone ON users(phone);

-- User Sessions / Refresh Tokens
CREATE TABLE user_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_tokens_user ON user_tokens(user_id);
CREATE INDEX idx_user_tokens_refresh ON user_tokens(refresh_token);
```

### 2.2 Reseller & Sub-Reseller Hierarchy & Wallet Engine

```sql
-- Reseller Profiles
CREATE TABLE resellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_reseller_id UUID REFERENCES resellers(id) ON DELETE RESTRICT, -- NULL for direct Master Resellers
    business_name VARCHAR(150) NOT NULL,
    trade_license VARCHAR(100),
    commission_type VARCHAR(20) DEFAULT 'PERCENTAGE', -- 'PERCENTAGE', 'FLAT'
    commission_value DECIMAL(10, 2) DEFAULT 0.00,
    credit_limit DECIMAL(12, 2) DEFAULT 0.00, -- Allowed negative balance
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_resellers_user ON resellers(user_id);
CREATE INDEX idx_resellers_parent ON resellers(parent_reseller_id);

-- Reseller Wallets (Double-Entry Balance Anchor)
CREATE TABLE reseller_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id UUID UNIQUE NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'BDT',
    locked_balance DECIMAL(12, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reseller_wallets_reseller ON reseller_wallets(reseller_id);

-- Reseller Financial Ledger
CREATE TABLE reseller_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE RESTRICT,
    wallet_id UUID NOT NULL REFERENCES reseller_wallets(id) ON DELETE RESTRICT,
    type VARCHAR(30) NOT NULL, -- 'TOPUP', 'CUSTOMER_RENEWAL', 'COMMISSION_CREDIT', 'ADJUSTMENT'
    amount DECIMAL(12, 2) NOT NULL,
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    reference_id VARCHAR(100), -- Invoice ID or Gateway TrxID
    remarks TEXT,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reseller_transactions_reseller ON reseller_transactions(reseller_id);
CREATE INDEX idx_reseller_transactions_created ON reseller_transactions(created_at);
```

### 2.3 Network NAS, MikroTik & IP Pools

```sql
-- Application Network Access Servers (MikroTik Routers / Gateways)
CREATE TABLE nas_routers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    ip_address INET NOT NULL UNIQUE,
    api_port INT DEFAULT 8728,
    api_ssl_port INT DEFAULT 8729,
    api_username VARCHAR(100) NOT NULL,
    api_password_encrypted TEXT NOT NULL,
    radius_secret VARCHAR(100) NOT NULL,
    coa_port INT DEFAULT 3799,
    router_os_version VARCHAR(20) DEFAULT 'v7', -- 'v6' or 'v7'
    is_simulated BOOLEAN DEFAULT FALSE,        -- If TRUE, uses mock driver in dev/test
    is_active BOOLEAN DEFAULT TRUE,
    last_ping_at TIMESTAMPTZ,
    last_status VARCHAR(20) DEFAULT 'UNKNOWN', -- 'ONLINE', 'OFFLINE', 'ERROR'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FreeRADIUS Standard NAS Client Table (Required by FreeRADIUS sql module)
CREATE TABLE nas (
    id SERIAL PRIMARY KEY,
    nasname VARCHAR(128) NOT NULL,             -- Router IP or Hostname
    shortname VARCHAR(32),
    type VARCHAR(30) DEFAULT 'other',
    ports INT,
    secret VARCHAR(60) NOT NULL,
    server VARCHAR(64),
    community VARCHAR(50),
    description VARCHAR(200)
);
CREATE INDEX idx_nas_nasname ON nas(nasname);

-- IP Pools (IPv4 & IPv6)
CREATE TABLE ip_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nas_id UUID NOT NULL REFERENCES nas_routers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    cidr_range CIDR NOT NULL,
    gateway_ip INET NOT NULL,
    dns_primary INET NOT NULL DEFAULT '8.8.8.8',
    dns_secondary INET NOT NULL DEFAULT '1.1.1.1',
    pool_type VARCHAR(20) DEFAULT 'PPPOE',     -- 'PPPOE', 'HOTSPOT', 'STATIC'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ip_pools_nas ON ip_pools(nas_id);
```

### 2.4 Packages & Bandwidth Profiles

```sql
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    service_type VARCHAR(20) NOT NULL,         -- 'PPPOE', 'HOTSPOT', 'STATIC'
    download_speed_kbps INT NOT NULL,          -- e.g. 20480 for 20 Mbps
    upload_speed_kbps INT NOT NULL,            -- e.g. 20480 for 20 Mbps
    rate_limit_string VARCHAR(100) NOT NULL,   -- e.g. '20M/20M 30M/30M 10M/10M 10/10'
    validity_days INT NOT NULL DEFAULT 30,
    price DECIMAL(10, 2) NOT NULL,
    wholesale_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Reseller cost
    fup_enabled BOOLEAN DEFAULT FALSE,
    fup_quota_bytes BIGINT,
    fup_reduced_rate VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_packages_service ON packages(service_type);
```

### 2.5 Customers & Service Accounts

```sql
-- Customer Profiles
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reseller_id UUID REFERENCES resellers(id) ON DELETE SET NULL, -- NULL if direct ISP retail customer
    customer_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'CUST-2026-0001'
    billing_type VARCHAR(20) DEFAULT 'PREPAID', -- 'PREPAID', 'POSTPAID'
    billing_cycle VARCHAR(20) DEFAULT 'CALENDAR_MONTH', -- 'CALENDAR_MONTH', 'ANNIVERSARY'
    nid_passport VARCHAR(50),
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    zone_area VARCHAR(100),
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_customers_reseller ON customers(reseller_id);
CREATE INDEX idx_customers_code ON customers(customer_code);

-- Service Accounts (PPPoE / Hotspot Login credentials)
CREATE TABLE service_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    nas_id UUID NOT NULL REFERENCES nas_routers(id) ON DELETE RESTRICT,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    username VARCHAR(100) UNIQUE NOT NULL,     -- PPPoE / Hotspot Username
    password VARCHAR(100) NOT NULL,            -- Cleartext or hash depending on auth scheme
    service_type VARCHAR(20) NOT NULL,         -- 'PPPOE', 'HOTSPOT', 'STATIC'
    static_ip INET,
    mac_address MACADDR,
    status VARCHAR(20) DEFAULT 'ACTIVE',       -- 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'GRACE'
    expires_at TIMESTAMPTZ NOT NULL,
    grace_expires_at TIMESTAMPTZ,
    last_online_at TIMESTAMPTZ,
    last_calling_station_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_service_accounts_customer ON service_accounts(customer_id);
CREATE INDEX idx_service_accounts_username ON service_accounts(username);
CREATE INDEX idx_service_accounts_status ON service_accounts(status);
CREATE INDEX idx_service_accounts_expires ON service_accounts(expires_at);
```

### 2.6 FreeRADIUS Standard AAA Tables

These tables adhere directly to the FreeRADIUS 3.x schema specification for high-speed SQL queries:

```sql
-- RADIUS Check Attributes (Username, Password, Cleartext-Password, etc.)
CREATE TABLE radcheck (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '==',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX idx_radcheck_username ON radcheck(username);

-- RADIUS Reply Attributes (Framed-IP-Address, Mikrotik-Rate-Limit, Framed-Pool)
CREATE TABLE radreply (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX idx_radreply_username ON radreply(username);

-- RADIUS User Group Mapping
CREATE TABLE radusergroup (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    priority INT NOT NULL DEFAULT 1
);
CREATE INDEX idx_radusergroup_username ON radusergroup(username);

-- RADIUS Accounting (Live sessions, byte counts, disconnects)
CREATE TABLE radacct (
    radacctid BIGSERIAL PRIMARY KEY,
    acctsessionid VARCHAR(64) NOT NULL DEFAULT '',
    acctuniqueid VARCHAR(32) NOT NULL UNIQUE,
    username VARCHAR(64) NOT NULL DEFAULT '',
    realm VARCHAR(64) DEFAULT '',
    nasipaddress INET NOT NULL,
    nasportid VARCHAR(32),
    nasporttype VARCHAR(32),
    acctstarttime TIMESTAMPTZ,
    acctupdatetime TIMESTAMPTZ,
    acctstoptime TIMESTAMPTZ,
    acctinterval INT,
    acctsessiontime INT,
    acctauthentic VARCHAR(32),
    connectinfo_start VARCHAR(50),
    connectinfo_stop VARCHAR(50),
    acctinputoctets BIGINT,
    acctoutputoctets BIGINT,
    calledstationid VARCHAR(50) DEFAULT '',
    callingstationid VARCHAR(50) DEFAULT '',
    acctterminatecause VARCHAR(32) DEFAULT '',
    servicetype VARCHAR(32),
    framedprotocol VARCHAR(32),
    framedipaddress INET
);
CREATE INDEX idx_radacct_active ON radacct(username, acctstoptime);
CREATE INDEX idx_radacct_nasip ON radacct(nasipaddress);
CREATE INDEX idx_radacct_session ON radacct(acctsessionid);
```

### 2.7 Invoicing, Billing & Payment Gateways

```sql
-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'INV-202609-0001'
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    service_account_id UUID REFERENCES service_accounts(id) ON DELETE SET NULL,
    reseller_id UUID REFERENCES resellers(id) ON DELETE SET NULL,
    package_id UUID REFERENCES packages(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    total_payable DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'UNPAID',        -- 'UNPAID', 'PAID', 'CANCELLED', 'OVERDUE'
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,        -- 'BKASH', 'NAGAD', 'ROCKET', 'SSLCOMMERZ', 'CASH'
    gateway_transaction_id VARCHAR(100),
    gateway_response JSONB,
    status VARCHAR(20) DEFAULT 'COMPLETED',     -- 'COMPLETED', 'FAILED', 'REFUNDED'
    received_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_trx ON payments(gateway_transaction_id);

-- Promise to Pay (Emergency Extension)
CREATE TABLE promise_to_pay (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_account_id UUID NOT NULL REFERENCES service_accounts(id) ON DELETE CASCADE,
    extension_hours INT NOT NULL DEFAULT 48,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',        -- 'ACTIVE', 'SETTLED', 'EXPIRED'
    created_by UUID REFERENCES users(id)
);
CREATE INDEX idx_promise_customer ON promise_to_pay(customer_id);
CREATE INDEX idx_promise_status ON promise_to_pay(status);

-- Hotspot Vouchers Table (Prepaid Scratch Cards / Generated Batches)
CREATE TABLE hotspot_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code VARCHAR(50) NOT NULL,
    voucher_code VARCHAR(50) UNIQUE NOT NULL,   -- Username / Card Code
    pin_code VARCHAR(50) NOT NULL,              -- PIN / Password
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    reseller_id UUID REFERENCES resellers(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'UNUSED',        -- 'UNUSED', 'ACTIVE', 'DEPLETED', 'EXPIRED'
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hotspot_vouchers_code ON hotspot_vouchers(voucher_code);
CREATE INDEX idx_hotspot_vouchers_batch ON hotspot_vouchers(batch_code);
CREATE INDEX idx_hotspot_vouchers_status ON hotspot_vouchers(status);
```

### 2.8 FTTH & Optical GIS Inventory

```sql
-- OLT Master
CREATE TABLE olts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    vendor VARCHAR(50) NOT NULL,                -- 'HUAWEI', 'ZTE', 'VSOL', 'BDCOM', 'CDATA', 'FIBERHOME'
    ip_address INET NOT NULL UNIQUE,
    snmp_community VARCHAR(100) NOT NULL,
    snmp_port INT DEFAULT 161,
    snmp_version VARCHAR(10) DEFAULT '2c',
    telnet_port INT DEFAULT 23,
    telnet_username VARCHAR(100),
    telnet_password_encrypted TEXT,
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    is_simulated BOOLEAN DEFAULT FALSE,        -- If TRUE, uses mock driver in dev/test
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PON Ports on OLT
CREATE TABLE pon_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    olt_id UUID NOT NULL REFERENCES olts(id) ON DELETE CASCADE,
    port_number VARCHAR(20) NOT NULL,           -- e.g. '0/1/1'
    max_onus INT DEFAULT 64,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pon_ports_olt ON pon_ports(olt_id);

-- Optical Splitters (1:2, 1:4, 1:8, 1:16)
CREATE TABLE splitters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    ratio VARCHAR(20) NOT NULL,                 -- '1:2', '1:4', '1:8', '1:16'
    parent_splitter_id UUID REFERENCES splitters(id) ON DELETE SET NULL,
    pon_port_id UUID REFERENCES pon_ports(id) ON DELETE SET NULL,
    gps_lat DECIMAL(10, 8) NOT NULL,
    gps_lng DECIMAL(11, 8) NOT NULL,
    location_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_splitters_pon ON splitters(pon_port_id);

-- TJ (Terminal Junction) Boxes
CREATE TABLE tj_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    box_code VARCHAR(50) UNIQUE NOT NULL,
    splitter_id UUID REFERENCES splitters(id) ON DELETE RESTRICT,
    capacity INT DEFAULT 8,
    gps_lat DECIMAL(10, 8) NOT NULL,
    gps_lng DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tj_boxes_splitter ON tj_boxes(splitter_id);

-- Fiber Cables (Physical GIS Polyline Paths)
CREATE TABLE fiber_cables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    cable_type VARCHAR(30) NOT NULL,            -- 'FEEDER', 'DISTRIBUTION', 'DROP'
    total_cores INT NOT NULL DEFAULT 12,
    from_node_type VARCHAR(30) NOT NULL,        -- 'OLT', 'SPLITTER', 'TJ_BOX'
    from_node_id UUID NOT NULL,
    to_node_type VARCHAR(30) NOT NULL,
    to_node_id UUID NOT NULL,
    path_geojson JSONB,                         -- MultiPoint / LineString coordinates
    length_meters DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'HEALTHY',       -- 'HEALTHY', 'DEGRADED', 'CUT'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_fiber_cables_type ON fiber_cables(cable_type);

-- Fiber Cores (12-Core TIA-598 Optical Fibers)
CREATE TABLE fiber_cores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cable_id UUID NOT NULL REFERENCES fiber_cables(id) ON DELETE CASCADE,
    core_number INT NOT NULL,                   -- 1 to 12
    color_name VARCHAR(30) NOT NULL,            -- 'Blue', 'Orange', 'Green', etc.
    color_hex VARCHAR(10) NOT NULL,             -- '#0000FF', etc.
    status VARCHAR(20) DEFAULT 'IDLE',          -- 'IDLE', 'CONNECTED', 'DAMAGED', 'RESERVED'
    connected_to_type VARCHAR(30),
    connected_to_id UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_fiber_cores_cable ON fiber_cores(cable_id);

-- ONUs (Optical Network Units / Customer Modems)
CREATE TABLE onus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID UNIQUE REFERENCES customers(id) ON DELETE SET NULL,
    pon_port_id UUID NOT NULL REFERENCES pon_ports(id) ON DELETE RESTRICT,
    tj_box_id UUID REFERENCES tj_boxes(id) ON DELETE SET NULL,
    onu_mac MACADDR NOT NULL UNIQUE,
    onu_sn VARCHAR(50) NOT NULL UNIQUE,
    rx_power_dbm DECIMAL(5, 2),                 -- e.g. -19.45
    tx_power_dbm DECIMAL(5, 2),                 -- e.g. 2.10
    distance_meters INT,
    last_signal_poll_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'ONLINE',        -- 'ONLINE', 'LOS', 'POWER_OFF'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_onus_customer ON onus(customer_id);
CREATE INDEX idx_onus_pon ON onus(pon_port_id);
CREATE INDEX idx_onus_sn ON onus(onu_sn);
```

### 2.9 Support Tickets & SLA

```sql
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,  -- 'TCK-2026-0001'
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    category VARCHAR(50) NOT NULL,              -- 'FIBER_CUT', 'SLOW_INTERNET', 'ROUTER_CONFIG', 'BILLING'
    priority VARCHAR(20) DEFAULT 'MEDIUM',      -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    status VARCHAR(20) DEFAULT 'OPEN',          -- 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_status ON tickets(status);

CREATE TABLE ticket_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    attachment_url TEXT,
    is_internal_note BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ticket_replies_ticket ON ticket_replies(ticket_id);
```

### 2.10 System Configuration & Global Settings

```sql
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'GENERAL',     -- 'GENERAL', 'BILLING', 'SMS', 'GATEWAY', 'NETWORK'
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Initial Production Seed Data

AI agents must execute these seed records during database migration to ensure the system is immediately bootable:

```sql
-- 1. Seed Roles
INSERT INTO roles (id, name, description) VALUES
('11111111-1111-1111-1111-111111111111', 'SUPER_ADMIN', 'Full system control and configuration'),
('22222222-2222-2222-2222-222222222222', 'RESELLER', 'Franchise master reseller management'),
('33333333-3333-3333-3333-333333333333', 'SUB_RESELLER', 'Sub-distributor customer provisioning'),
('44444444-4444-4444-4444-444444444444', 'CUSTOMER', 'End-user subscriber self-care'),
('55555555-5555-5555-5555-555555555555', 'FIELD_TECH', 'Lineman optical splicing and mobile provisioning'),
('66666666-6666-6666-6666-666666666666', 'SUPPORT', 'NOC helpdesk and ticket support')
ON CONFLICT (name) DO NOTHING;

-- 2. Seed Default System Settings
INSERT INTO system_settings (key, value, category, description) VALUES
('company_name', 'Maxzone ISP Network', 'GENERAL', 'ISP business brand name'),
('currency', 'BDT', 'BILLING', 'Standard operating currency'),
('currency_symbol', '৳', 'BILLING', 'Currency visual symbol'),
('billing_cycle_type', 'CALENDAR_MONTH', 'BILLING', 'Default billing cycle'),
('billing_due_day', '10', 'BILLING', 'Day of month invoice is due'),
('grace_period_days', '3', 'BILLING', 'Grace days before hard cut'),
('promise_to_pay_hours', '48', 'BILLING', 'Hours allowed for emergency unblock'),
('mikrotik_simulation_mode', 'true', 'NETWORK', 'Allow simulated router for testing'),
('olt_simulation_mode', 'true', 'NETWORK', 'Allow simulated OLT for testing')
ON CONFLICT (key) DO NOTHING;

-- 3. Seed Default Starter Package
INSERT INTO packages (id, name, service_type, download_speed_kbps, upload_speed_kbps, rate_limit_string, validity_days, price, wholesale_price)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '20 Mbps Fiber Starter',
    'PPPOE',
    20480,
    20480,
    '20M/20M 30M/30M 10M/10M 10/10',
    30,
    800.00,
    550.00
) ON CONFLICT DO NOTHING;
```
