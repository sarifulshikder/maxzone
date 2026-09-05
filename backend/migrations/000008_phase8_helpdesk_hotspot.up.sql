-- ==============================================================================
-- Phase 8 Migration: Support Helpdesk, Hotspot Captive Portal & Vouchers
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Support Helpdesk Tickets (Kanban board)
-- ------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS ticket_no_seq START WITH 100;

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_no VARCHAR(20) NOT NULL UNIQUE,                 -- 'TKT-0001'
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(30) NOT NULL DEFAULT 'OTHER',         -- BILLING|CONNECTIVITY|EQUIPMENT|INSTALLATION|OTHER
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',        -- LOW|MEDIUM|HIGH|URGENT
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',            -- OPEN|IN_PROGRESS|RESOLVED|CLOSED
    created_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);

CREATE TABLE IF NOT EXISTS ticket_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,                     -- internal NOC note (hidden from customer)
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON ticket_replies(ticket_id);

-- ------------------------------------------------------------------------------
-- 2. Hotspot Captive Portal
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hotspot_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin VARCHAR(30) NOT NULL UNIQUE,                       -- e.g. 'MAXZ-8899'
    plan_name VARCHAR(100) NOT NULL,                       -- e.g. 'Popular Unlimited 15 Days'
    data_limit VARCHAR(30) NOT NULL DEFAULT 'UNLIMITED',   -- 'UNLIMITED' | '20 GB' | ...
    validity_days INT NOT NULL DEFAULT 15,
    price_bdt NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_by_phone VARCHAR(20),
    used_mac VARCHAR(20),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hotspot_vouchers_pin ON hotspot_vouchers(pin);

-- Simulated SMS OTP codes (real SMS gateway would push via bKash NOC; dev echoes the code back)
CREATE TABLE IF NOT EXISTS hotspot_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hotspot_otps_phone ON hotspot_otps(phone);

-- ==============================================================================
-- 3. SEED DEMO DATA
-- ==============================================================================

-- Tickets spanning all Kanban columns
INSERT INTO tickets (id, ticket_no, customer_id, subject, description, category, priority, status, created_by, assigned_to, created_at, updated_at)
SELECT
    'a8000000-0000-0000-0000-000000000001', 'TKT-0001',
    (SELECT id FROM customers ORDER BY created_at LIMIT 1),
    'No internet since last night', 'Subscriber reports PPPoE link is established but internet is dead. RADIUS session active, ping fails from the NAS.',
    'CONNECTIVITY', 'HIGH', 'OPEN',
    '11111111-1111-1111-1111-111111111111', NULL,
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
WHERE EXISTS (SELECT 1 FROM customers LIMIT 1);

INSERT INTO tickets (id, ticket_no, customer_id, subject, description, category, priority, status, created_by, assigned_to, created_at, updated_at)
SELECT
    'a8000000-0000-0000-0000-000000000002', 'TKT-0002',
    (SELECT id FROM customers ORDER BY created_at LIMIT 1),
    'Invoice paid but not credited', 'Customer paid the monthly invoice via bKash but the payment was not auto-credited to the account.',
    'BILLING', 'MEDIUM', 'IN_PROGRESS',
    '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'
WHERE EXISTS (SELECT 1 FROM customers LIMIT 1);

INSERT INTO tickets (id, ticket_no, customer_id, subject, description, category, priority, status, created_by, assigned_to, created_at, updated_at)
SELECT
    'a8000000-0000-0000-0000-000000000003', 'TKT-0003',
    (SELECT id FROM customers ORDER BY created_at LIMIT 1),
    'WiFi router replacement', 'Replaced the customer CPE router under warranty. Configuration re-applied and verified.',
    'EQUIPMENT', 'LOW', 'RESOLVED',
    '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
WHERE EXISTS (SELECT 1 FROM customers LIMIT 1);

-- Replies on the in-progress billing ticket
INSERT INTO ticket_replies (id, ticket_id, author_id, message, is_internal) VALUES
    ('b8000000-0000-0000-0000-000000000001', 'a8000000-0000-0000-0000-000000000002',
     '11111111-1111-1111-1111-111111111111',
     'Checked bKash transaction log — payment was received but the webhook call failed. Crediting manually.', FALSE),
    ('b8000000-0000-0000-0000-000000000002', 'a8000000-0000-0000-0000-000000000002',
     '11111111-1111-1111-1111-111111111111',
     'NOTE: verify webhook retry logic after crediting. Add idempotency key if missing.', TRUE);

-- Hotspot vouchers (one active for the walkthrough, one already consumed)
INSERT INTO hotspot_vouchers (id, pin, plan_name, data_limit, validity_days, price_bdt, is_used) VALUES
    ('c8000000-0000-0000-0000-000000000001', 'MAXZ-8899', 'Popular Unlimited 15 Days', 'UNLIMITED', 15, 600.00, FALSE),
    ('c8000000-0000-0000-0000-000000000002', 'MAXZ-0001', 'Daily Pass 1 Day', 'UNLIMITED', 1, 40.00, TRUE);