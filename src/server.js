const Fastify = require('fastify');
const config = require('./config');
const paymentRoutes = require('./routes/payments');

const app = Fastify({ logger: { level: config.logLevel } });
app.register(paymentRoutes);

app.get('/health', async () => ({ status: 'ok' }));

app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error, requestId: request.id }, 'payment request failed');
  reply.code(503).send({ error: 'payment service temporarily unavailable', requestId: request.id });
});

app.listen({ port: config.port, host: '0.0.0.0' })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
