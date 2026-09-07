const { Pool } = require('pg');
const config = require('../config');

// Provides a database pool for a payment operation.
// Each pool is configured conservatively for the managed database tier.
function createPaymentPool() {
  return new Pool({
    connectionString: config.databaseUrl,
    max: config.dbPoolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
    application_name: 'ledgerline-payments-api'
  });
}

module.exports = { createPaymentPool };
