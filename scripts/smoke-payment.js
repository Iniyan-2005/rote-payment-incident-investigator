const crypto = require('node:crypto');

fetch('http://localhost:3000/v1/payments/authorise', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
  body: JSON.stringify({ merchantId: 'mrc_demo_204', amountCents: 2599, currency: 'USD' })
})
  .then(async (response) => console.log(response.status, await response.text()))
  .catch((error) => { console.error(error); process.exitCode = 1; });
