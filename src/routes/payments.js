const paymentService = require('../services/payment-service');

async function paymentRoutes(app) {
  app.post('/v1/payments/authorise', async (request, reply) => {
    const { merchantId, amountCents, currency = 'USD' } = request.body || {};
    const idempotencyKey = request.headers['idempotency-key'];

    if (!merchantId || !Number.isInteger(amountCents) || amountCents < 1 || !idempotencyKey) {
      return reply.code(400).send({ error: 'merchantId, amountCents, and Idempotency-Key are required' });
    }

    const payment = { merchantId, amountCents, currency, idempotencyKey };
    const result = await paymentService.authorise(payment);
    return reply.code(result.replayed ? 200 : 201).send(result);
  });
}

module.exports = paymentRoutes;
