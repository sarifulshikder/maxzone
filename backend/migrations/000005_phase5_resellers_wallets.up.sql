-- ==============================================================================
-- Phase 5 Migration: Reseller Hierarchy & Double-Entry Wallet System
-- ==============================================================================

-- 1. Ensure columns on resellers table
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS reseller_type VARCHAR(20) DEFAULT 'RESELLER';

-- 2. Reseller Wallets (Double-Entry Balance Anchor)
CREATE TABLE IF NOT EXISTS reseller_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id UUID UNIQUE NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    locked_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'BDT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reseller_wallets_reseller ON reseller_wallets(reseller_id);

-- 3. Reseller Transactions (Financial Audit Ledger)
CREATE TABLE IF NOT EXISTS reseller_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE RESTRICT,
    wallet_id UUID NOT NULL REFERENCES reseller_wallets(id) ON DELETE RESTRICT,
    type VARCHAR(30) NOT NULL, -- 'TOPUP', 'CUSTOMER_RENEWAL', 'COMMISSION_CREDIT', 'ADJUSTMENT'
    amount DECIMAL(12, 2) NOT NULL,
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    reference_id VARCHAR(100),
    remarks TEXT,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reseller_transactions_reseller ON reseller_transactions(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_transactions_created ON reseller_transactions(created_at);

-- 4. Seed Package: 15 Mbps Reseller Starter (৳ 550.00)
INSERT INTO packages (id, name, service_type, download_speed_kbps, upload_speed_kbps, rate_limit_string, validity_days, price, wholesale_price, is_active)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '15 Mbps Reseller Starter',
    'PPPOE',
    15360,
    15360,
    '15M/15M',
    30,
    550.00,
    550.00,
    TRUE
) ON CONFLICT (id) DO UPDATE SET price = 550.00, wholesale_price = 550.00, name = '15 Mbps Reseller Starter';

-- 5. Seed Reseller User: reseller_demo (Password: Pass@123)
INSERT INTO users (id, role_id, username, email, password_hash, first_name, last_name, phone, is_active)
VALUES (
    'a1111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222', -- RESELLER
    'reseller_demo',
    'reseller@maxzone.local',
    crypt('Pass@123', gen_salt('bf')),
    'Shabbir',
    'Ahmed',
    '01811223344',
    TRUE
) ON CONFLICT (username) DO UPDATE SET password_hash = crypt('Pass@123', gen_salt('bf'));

-- 6. Seed Reseller Entity
INSERT INTO resellers (id, user_id, business_name, trade_license, reseller_type, commission_type, commission_value, credit_limit, is_active)
VALUES (
    'b1111111-1111-1111-1111-111111111111',
    (SELECT id FROM users WHERE username = 'reseller_demo'),
    'Demo Reseller Communications',
    'TRAD-DHK-2026-9901',
    'RESELLER',
    'PERCENTAGE',
    10.00,
    5000.00,
    TRUE
) ON CONFLICT (user_id) DO NOTHING;

-- 7. Seed Reseller Wallet: Balance ৳ 10,000, Credit Limit ৳ 5,000
INSERT INTO reseller_wallets (id, reseller_id, balance, credit_limit, currency)
VALUES (
    'c1111111-1111-1111-1111-111111111111',
    (SELECT id FROM resellers WHERE business_name = 'Demo Reseller Communications'),
    10000.00,
    5000.00,
    'BDT'
) ON CONFLICT (reseller_id) DO UPDATE SET balance = 10000.00, credit_limit = 5000.00;

-- 8. Seed Initial Opening Balance Ledger Entry
INSERT INTO reseller_transactions (reseller_id, wallet_id, type, amount, balance_before, balance_after, reference_id, remarks)
SELECT 
    r.id,
    w.id,
    'TOPUP',
    10000.00,
    0.00,
    10000.00,
    'INIT-CREDIT-001',
    'Initial seed credit allocation by Super Admin'
FROM resellers r
JOIN reseller_wallets w ON w.reseller_id = r.id
WHERE r.business_name = 'Demo Reseller Communications'
AND NOT EXISTS (
    SELECT 1 FROM reseller_transactions WHERE reference_id = 'INIT-CREDIT-001'
);

-- 9. Seed 3 Customers under reseller_demo ready for Renewal Test
-- Customer 1: Tanvir Hasan (tanvir_res)
INSERT INTO users (id, role_id, username, email, password_hash, first_name, last_name, phone, is_active)
VALUES (
    'd1111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'tanvir_res',
    'tanvir@example.com',
    crypt('Pass@123', gen_salt('bf')),
    'Tanvir',
    'Hasan',
    '01711000001',
    TRUE
) ON CONFLICT (username) DO NOTHING;

INSERT INTO customers (id, user_id, reseller_id, customer_code, billing_type, billing_cycle, address_line1, zone_area)
VALUES (
    'e1111111-1111-1111-1111-111111111111',
    (SELECT id FROM users WHERE username = 'tanvir_res'),
    (SELECT id FROM resellers WHERE business_name = 'Demo Reseller Communications'),
    'CUST-RES-001',
    'PREPAID',
    'CALENDAR_MONTH',
    'House 14, Road 2, Mirpur 10',
    'Mirpur Zone'
) ON CONFLICT (customer_code) DO NOTHING;

INSERT INTO service_accounts (id, customer_id, nas_id, package_id, username, password, service_type, status, expires_at)
VALUES (
    'f1111111-1111-1111-1111-111111111111',
    (SELECT id FROM customers WHERE customer_code = 'CUST-RES-001'),
    'e7dfd60f-896e-4f79-9e14-2b9eec143650',
    '55555555-5555-5555-5555-555555555555',
    'tanvir_res',
    'pass123',
    'PPPOE',
    'EXPIRED',
    NOW() - INTERVAL '1 day'
) ON CONFLICT (username) DO UPDATE SET status = 'EXPIRED', expires_at = NOW() - INTERVAL '1 day';

-- Customer 2: Nusrat Jahan (nusrat_res)
INSERT INTO users (id, role_id, username, email, password_hash, first_name, last_name, phone, is_active)
VALUES (
    'd2222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'nusrat_res',
    'nusrat@example.com',
    crypt('Pass@123', gen_salt('bf')),
    'Nusrat',
    'Jahan',
    '01711000002',
    TRUE
) ON CONFLICT (username) DO NOTHING;

INSERT INTO customers (id, user_id, reseller_id, customer_code, billing_type, billing_cycle, address_line1, zone_area)
VALUES (
    'e2222222-2222-2222-2222-222222222222',
    (SELECT id FROM users WHERE username = 'nusrat_res'),
    (SELECT id FROM resellers WHERE business_name = 'Demo Reseller Communications'),
    'CUST-RES-002',
    'PREPAID',
    'CALENDAR_MONTH',
    'Flat 3A, House 22, Mirpur 11',
    'Mirpur Zone'
) ON CONFLICT (customer_code) DO NOTHING;

INSERT INTO service_accounts (id, customer_id, nas_id, package_id, username, password, service_type, status, expires_at)
VALUES (
    'f2222222-2222-2222-2222-222222222222',
    (SELECT id FROM customers WHERE customer_code = 'CUST-RES-002'),
    'e7dfd60f-896e-4f79-9e14-2b9eec143650',
    '55555555-5555-5555-5555-555555555555',
    'nusrat_res',
    'pass123',
    'PPPOE',
    'EXPIRED',
    NOW() - INTERVAL '1 day'
) ON CONFLICT (username) DO UPDATE SET status = 'EXPIRED', expires_at = NOW() - INTERVAL '1 day';

-- Customer 3: Rafiqul Islam (rafiq_res)
INSERT INTO users (id, role_id, username, email, password_hash, first_name, last_name, phone, is_active)
VALUES (
    'd3333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    'rafiq_res',
    'rafiq@example.com',
    crypt('Pass@123', gen_salt('bf')),
    'Rafiqul',
    'Islam',
    '01711000003',
    TRUE
) ON CONFLICT (username) DO NOTHING;

INSERT INTO customers (id, user_id, reseller_id, customer_code, billing_type, billing_cycle, address_line1, zone_area)
VALUES (
    'e3333333-3333-3333-3333-333333333333',
    (SELECT id FROM users WHERE username = 'rafiq_res'),
    (SELECT id FROM resellers WHERE business_name = 'Demo Reseller Communications'),
    'CUST-RES-003',
    'PREPAID',
    'CALENDAR_MONTH',
    'House 5, Road 7, Pallabi',
    'Mirpur Zone'
) ON CONFLICT (customer_code) DO NOTHING;

INSERT INTO service_accounts (id, customer_id, nas_id, package_id, username, password, service_type, status, expires_at)
VALUES (
    'f3333333-3333-3333-3333-333333333333',
    (SELECT id FROM customers WHERE customer_code = 'CUST-RES-003'),
    'e7dfd60f-896e-4f79-9e14-2b9eec143650',
    '55555555-5555-5555-5555-555555555555',
    'rafiq_res',
    'pass123',
    'PPPOE',
    'EXPIRED',
    NOW() - INTERVAL '1 day'
) ON CONFLICT (username) DO UPDATE SET status = 'EXPIRED', expires_at = NOW() - INTERVAL '1 day';

-- 10. FreeRADIUS Synchronous radcheck & radreply records
INSERT INTO radcheck (username, attribute, op, value)
VALUES 
    ('tanvir_res', 'Cleartext-Password', ':=', 'pass123'),
    ('nusrat_res', 'Cleartext-Password', ':=', 'pass123'),
    ('rafiq_res', 'Cleartext-Password', ':=', 'pass123')
ON CONFLICT (username, attribute) DO NOTHING;

INSERT INTO radreply (username, attribute, op, value)
VALUES 
    ('tanvir_res', 'Mikrotik-Rate-Limit', ':=', '15M/15M'),
    ('nusrat_res', 'Mikrotik-Rate-Limit', ':=', '15M/15M'),
    ('rafiq_res', 'Mikrotik-Rate-Limit', ':=', '15M/15M')
ON CONFLICT (username, attribute) DO NOTHING;
