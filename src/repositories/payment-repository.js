const { createPaymentPool } = require('../db/pool');

async function findByIdempotencyKey(idempotencyKey) {
  const pool = createPaymentPool();
  const result = await pool.query(
    `SELECT status, gateway_reference
       FROM payment_attempts
      WHERE idempotency_key = $1`,
    [idempotencyKey]
  );
  return result.rows[0] || null;
}

async function createAttempt(payment) {
  const pool = createPaymentPool();
  const result = await pool.query(
    `INSERT INTO payment_attempts
       (idempotency_key, merchant_id, amount_cents, currency, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING id`,
    [payment.idempotencyKey, payment.merchantId, payment.amountCents, payment.currency]
  );
  return result.rows[0];
}

async function markAuthorised(idempotencyKey, gatewayReference) {
  const pool = createPaymentPool();
  await pool.query(
    `UPDATE payment_attempts
        SET status = 'authorised', gateway_reference = $2
      WHERE idempotency_key = $1`,
    [idempotencyKey, gatewayReference]
  );
}

module.exports = { findByIdempotencyKey, createAttempt, markAuthorised };
