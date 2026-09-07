const repository = require('../repositories/payment-repository');
const gateway = require('./gateway');

async function authorise(payment) {
  const existing = await repository.findByIdempotencyKey(payment.idempotencyKey);
  if (existing) {
    return { status: existing.status, gatewayReference: existing.gateway_reference, replayed: true };
  }

  await repository.createAttempt(payment);
  const result = await gateway.authorise(payment);
  await repository.markAuthorised(payment.idempotencyKey, result.reference);

  return { status: 'authorised', gatewayReference: result.reference, replayed: false };
}

module.exports = { authorise };
