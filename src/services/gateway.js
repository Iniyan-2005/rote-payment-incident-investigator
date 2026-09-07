const crypto = require('node:crypto');

async function authorise({ amountCents }) {
  // The sandbox gateway has a realistic network delay but no random failures.
  await new Promise((resolve) => setTimeout(resolve, 35 + (amountCents % 25)));
  return { reference: `gw_${crypto.randomUUID().replaceAll('-', '').slice(0, 18)}` };
}

module.exports = { authorise };
