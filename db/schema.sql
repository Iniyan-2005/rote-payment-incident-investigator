CREATE TABLE payment_attempts (
  id BIGSERIAL PRIMARY KEY,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  merchant_id VARCHAR(64) NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency CHAR(3) NOT NULL,
  status VARCHAR(24) NOT NULL,
  gateway_reference VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_attempts_merchant_created_idx
  ON payment_attempts (merchant_id, created_at DESC);
