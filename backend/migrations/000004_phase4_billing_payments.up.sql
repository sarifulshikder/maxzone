-- ==============================================================================
-- Phase 4 Migration: Billing, Invoicing, bKash/Nagad & Auto-Provisioning
-- ==============================================================================

-- 1. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- 2. Payments Table
CREATE TABLE IF NOT EXISTS payments (
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

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_trx ON payments(gateway_transaction_id);

-- 3. Promise to Pay Table (Emergency 48-Hour Unblock)
CREATE TABLE IF NOT EXISTS promise_to_pay (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_account_id UUID NOT NULL REFERENCES service_accounts(id) ON DELETE CASCADE,
    extension_hours INT NOT NULL DEFAULT 48,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',        -- 'ACTIVE', 'SETTLED', 'EXPIRED'
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promise_customer ON promise_to_pay(customer_id);
CREATE INDEX IF NOT EXISTS idx_promise_status ON promise_to_pay(status);
