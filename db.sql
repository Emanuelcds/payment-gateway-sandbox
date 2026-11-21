CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL CHECK (status in ('requires_payment_method', 'succeeded', 'failed', 'refunded')) DEFAULT 'requires_payment_method',
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    customer TEXT NOT NULL,
    items TEXT NOT NULL,
    created TEXT NOT NULL,
    card TEXT NULL,
    failure TEXT NULL,
    paid_at TEXT NULL,
    refunded_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);