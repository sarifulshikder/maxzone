-- ==============================================================================
-- Phase 2 Migration: Network Infrastructure (MikroTik RouterOS & FreeRADIUS)
-- ==============================================================================

-- 1. MikroTik RouterOS / NAS Routers
CREATE TABLE IF NOT EXISTS nas_routers (
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
CREATE INDEX IF NOT EXISTS idx_nas_routers_ip ON nas_routers(ip_address);
CREATE INDEX IF NOT EXISTS idx_nas_routers_status ON nas_routers(last_status);

-- 2. FreeRADIUS Standard Client Table (nas)
CREATE TABLE IF NOT EXISTS nas (
    id SERIAL PRIMARY KEY,
    nasname VARCHAR(128) NOT NULL UNIQUE,      -- Router IP or Hostname
    shortname VARCHAR(32),
    type VARCHAR(30) DEFAULT 'other',
    ports INT,
    secret VARCHAR(60) NOT NULL,
    server VARCHAR(64),
    community VARCHAR(50),
    description VARCHAR(200)
);
CREATE INDEX IF NOT EXISTS idx_nas_nasname ON nas(nasname);

-- 3. FreeRADIUS radcheck Table
CREATE TABLE IF NOT EXISTS radcheck (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '==',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_radcheck_username ON radcheck(username);

-- 4. FreeRADIUS radreply Table
CREATE TABLE IF NOT EXISTS radreply (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_radreply_username ON radreply(username);

-- 5. FreeRADIUS radusergroup Table
CREATE TABLE IF NOT EXISTS radusergroup (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    priority INT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_radusergroup_username ON radusergroup(username);

-- 6. FreeRADIUS radacct Table
CREATE TABLE IF NOT EXISTS radacct (
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
CREATE INDEX IF NOT EXISTS idx_radacct_active ON radacct(username, acctstoptime);
CREATE INDEX IF NOT EXISTS idx_radacct_nasip ON radacct(nasipaddress);
CREATE INDEX IF NOT EXISTS idx_radacct_session ON radacct(acctsessionid);

-- 7. Simulated default router (idempotent) — referenced by Phase 5 service-account seeds
INSERT INTO nas_routers (id, name, ip_address, api_port, api_username, api_password_encrypted, radius_secret, coa_port, router_os_version, is_simulated, is_active)
VALUES (
    'e7dfd60f-896e-4f79-9e14-2b9eec143650',
    'CCR-2004 Core',
    '10.0.0.1',
    8728,
    'admin',
    'simulated:maxzone',
    'maxzone-radius-secret',
    3799,
    'v7',
    TRUE,
    TRUE
)
ON CONFLICT DO NOTHING;
