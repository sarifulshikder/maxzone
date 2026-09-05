-- Phase 1: Authentication, RBAC & Super Admin Shell
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL, -- 'SUPER_ADMIN', 'RESELLER', 'SUB_RESELLER', 'CUSTOMER', 'FIELD_TECH', 'SUPPORT'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
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
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- User Sessions / Refresh Tokens
CREATE TABLE IF NOT EXISTS user_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_refresh ON user_tokens(refresh_token);

-- System Configuration & Global Settings
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'GENERAL',
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial roles
INSERT INTO roles (id, name, description) VALUES
('11111111-1111-1111-1111-111111111111', 'SUPER_ADMIN', 'Full system control and configuration'),
('22222222-2222-2222-2222-222222222222', 'RESELLER', 'Franchise master reseller management'),
('33333333-3333-3333-3333-333333333333', 'SUB_RESELLER', 'Sub-distributor customer provisioning'),
('44444444-4444-4444-4444-444444444444', 'CUSTOMER', 'End-user subscriber self-care'),
('55555555-5555-5555-5555-555555555555', 'FIELD_TECH', 'Lineman optical splicing and mobile provisioning'),
('66666666-6666-6666-6666-666666666666', 'SUPPORT', 'NOC helpdesk and ticket support')
ON CONFLICT (name) DO NOTHING;

-- Seed demo users (sentinel hash means "apply env password on first app boot").
-- SeedInitialAdmin / SeedFieldTech / SeedSupport hydrate these on startup.
INSERT INTO users (id, role_id, username, email, phone, password_hash, first_name, last_name, is_active) VALUES
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin',  'admin@maxzone.local',  '01700000000', 'mz:seed:pending', 'System', 'Admin',      TRUE),
('55555555-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'field',  'field@maxzone.local',  '01711111111', 'mz:seed:pending', 'Field',  'Technician', TRUE),
('66666666-1111-1111-1111-666666666666', '66666666-6666-6666-6666-666666666666', 'support', 'support@maxzone.local', '01722222222', 'mz:seed:pending', 'NOC',    'Support',    TRUE)
ON CONFLICT (username) DO NOTHING;

-- Seed default system settings
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
