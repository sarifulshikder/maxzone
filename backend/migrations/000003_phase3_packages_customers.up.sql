-- ==============================================================================
-- Phase 3 Migration: Packages, IPAM & Customer Provisioning
-- ==============================================================================

-- 1. Resellers (Required for customer reseller foreign key relation)
CREATE TABLE IF NOT EXISTS resellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_reseller_id UUID REFERENCES resellers(id) ON DELETE RESTRICT,
    business_name VARCHAR(150) NOT NULL,
    trade_license VARCHAR(100),
    commission_type VARCHAR(20) DEFAULT 'PERCENTAGE', -- 'PERCENTAGE', 'FLAT'
    commission_value DECIMAL(10, 2) DEFAULT 0.00,
    credit_limit DECIMAL(12, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resellers_user ON resellers(user_id);
CREATE INDEX IF NOT EXISTS idx_resellers_parent ON resellers(parent_reseller_id);

-- 2. Packages & Bandwidth Profiles
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    service_type VARCHAR(20) NOT NULL DEFAULT 'PPPOE', -- 'PPPOE', 'HOTSPOT', 'STATIC'
    download_speed_kbps INT NOT NULL,                 -- e.g. 30720 for 30 Mbps
    upload_speed_kbps INT NOT NULL,                   -- e.g. 30720 for 30 Mbps
    rate_limit_string VARCHAR(100) NOT NULL,          -- e.g. '30M/30M' or with burst
    validity_days INT NOT NULL DEFAULT 30,
    price DECIMAL(10, 2) NOT NULL,                    -- Retail Price in BDT
    wholesale_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Reseller Price
    fup_enabled BOOLEAN DEFAULT FALSE,
    fup_quota_bytes BIGINT,
    fup_reduced_rate VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_packages_service ON packages(service_type);
CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(is_active);

-- 3. IP Pools (IPv4 & IPv6 IPAM)
CREATE TABLE IF NOT EXISTS ip_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nas_id UUID NOT NULL REFERENCES nas_routers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    cidr_range CIDR NOT NULL,
    gateway_ip INET NOT NULL,
    dns_primary INET NOT NULL DEFAULT '8.8.8.8',
    dns_secondary INET NOT NULL DEFAULT '1.1.1.1',
    pool_type VARCHAR(20) DEFAULT 'PPPOE', -- 'PPPOE', 'HOTSPOT', 'STATIC'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ip_pools_nas ON ip_pools(nas_id);

-- 4. Customer Profiles
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reseller_id UUID REFERENCES resellers(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_reseller ON customers(reseller_id);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);

-- 5. Service Accounts (PPPoE & Hotspot Credentials and RADIUS Bindings)
CREATE TABLE IF NOT EXISTS service_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    nas_id UUID NOT NULL REFERENCES nas_routers(id) ON DELETE RESTRICT,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    username VARCHAR(100) UNIQUE NOT NULL,     -- PPPoE / Hotspot Username
    password VARCHAR(100) NOT NULL,            -- Cleartext password for FreeRADIUS PAP/CHAP
    service_type VARCHAR(20) NOT NULL DEFAULT 'PPPOE', -- 'PPPOE', 'HOTSPOT', 'STATIC'
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
CREATE INDEX IF NOT EXISTS idx_service_accounts_customer ON service_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_accounts_username ON service_accounts(username);
CREATE INDEX IF NOT EXISTS idx_service_accounts_status ON service_accounts(status);
CREATE INDEX IF NOT EXISTS idx_service_accounts_expires ON service_accounts(expires_at);
