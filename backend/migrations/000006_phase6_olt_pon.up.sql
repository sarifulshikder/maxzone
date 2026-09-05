-- ==============================================================================
-- Phase 6 Migration: OLT Telemetry & PON Optical Management (SNMP v2c/v3)
-- ==============================================================================

-- 1. Optical Line Terminals (OLTs)
CREATE TABLE IF NOT EXISTS olts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    vendor VARCHAR(20) NOT NULL,                 -- 'HUAWEI', 'ZTE', 'VSOL', 'BDCOM'
    model VARCHAR(50),                           -- e.g. 'MA5800-X7', 'C320', 'OLT3610-08'
    ip_address INET NOT NULL UNIQUE,
    snmp_version VARCHAR(5) DEFAULT 'v2c',       -- 'v2c' or 'v3'
    snmp_port INT DEFAULT 161,
    snmp_community VARCHAR(100),                 -- v2c community string
    snmp_username VARCHAR(100),                  -- v3 user
    snmp_auth_protocol VARCHAR(20),              -- v3 auth: 'MD5' | 'SHA'
    snmp_auth_password_encrypted TEXT,           -- v3 auth passphrase
    snmp_priv_protocol VARCHAR(20),              -- v3 priv: 'DES' | 'AES'
    snmp_priv_password_encrypted TEXT,           -- v3 priv passphrase
    oid_profile VARCHAR(30) DEFAULT 'default',   -- vendor OID profile key
    is_simulated BOOLEAN DEFAULT FALSE,          -- If TRUE, uses simulator driver
    is_active BOOLEAN DEFAULT TRUE,
    last_polled_at TIMESTAMPTZ,
    last_status VARCHAR(20) DEFAULT 'UNKNOWN',   -- 'ONLINE', 'OFFLINE', 'ERROR'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_olts_ip ON olts(ip_address);
CREATE INDEX IF NOT EXISTS idx_olts_vendor ON olts(vendor);
CREATE INDEX IF NOT EXISTS idx_olts_status ON olts(last_status);

-- 2. PON Ports (one row per OLT frame/slot/port — e.g. PON 0/1/1)
CREATE TABLE IF NOT EXISTS pon_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    olt_id UUID NOT NULL REFERENCES olts(id) ON DELETE CASCADE,
    frame INT NOT NULL DEFAULT 0,
    slot INT NOT NULL,
    port INT NOT NULL,
    name VARCHAR(40) NOT NULL,                   -- computed label e.g. 'PON 0/1/1'
    onboarded_onts INT NOT NULL DEFAULT 0,       -- currently active / discovered ONTs
    max_onts INT NOT NULL DEFAULT 64,            -- PON split ratio (64 / 128)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(olt_id, frame, slot, port)
);
CREATE INDEX IF NOT EXISTS idx_pon_ports_olt ON pon_ports(olt_id);
CREATE INDEX IF NOT EXISTS idx_pon_ports_name ON pon_ports(name);

-- 3. Optical Network Units (ONUs / ONTs)
CREATE TABLE IF NOT EXISTS onus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    olt_id UUID NOT NULL REFERENCES olts(id) ON DELETE CASCADE,
    pon_port_id UUID NOT NULL REFERENCES pon_ports(id) ON DELETE CASCADE,
    serial_number VARCHAR(64) NOT NULL,          -- e.g. 'HWTC99887766'
    name VARCHAR(100),                           -- friendly name / customer ticket
    mac_address VARCHAR(17),
    rx_power_db DOUBLE PRECISION,                -- last optical receive power (dBm)
    tx_power_db DOUBLE PRECISION,                -- last optical transmit power (dBm)
    temperature_c DOUBLE PRECISION,              -- ONU temperature (Celsius)
    distance_m DOUBLE PRECISION,                 -- optical distance (m)
    status VARCHAR(20) DEFAULT 'UNKNOWN',        -- 'ONLINE', 'OFFLINE', 'LOS', 'UNKNOWN'
    health VARCHAR(20) DEFAULT 'UNKNOWN',        -- 'OPTIMAL', 'GOOD', 'WARNING', 'CRITICAL', 'UNKNOWN'
    registered BOOLEAN DEFAULT FALSE,            -- TRUE once authorized / linked to a subscriber
    last_discovered_at TIMESTAMPTZ,
    last_polled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(olt_id, pon_port_id, serial_number)
);
CREATE INDEX IF NOT EXISTS idx_onus_olt ON onus(olt_id);
CREATE INDEX IF NOT EXISTS idx_onus_port ON onus(pon_port_id);
CREATE INDEX IF NOT EXISTS idx_onus_serial ON onus(serial_number);
CREATE INDEX IF NOT EXISTS idx_onus_unregistered ON onus(olt_id, registered) WHERE registered = FALSE;