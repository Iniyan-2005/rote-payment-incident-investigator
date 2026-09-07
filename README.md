# Ledgerline Payments API

A deliberately small, realistic payment-authorisation service. It accepts an
idempotent payment request, records the attempt, calls a simulated gateway, and
returns an authorisation result.

## Run locally

```sh
npm install
cp .env.example .env
npm start
```

Postgres needs a `payment_attempts` table; the development schema is in
[`db/schema.sql`](db/schema.sql). `npm run smoke` sends a single valid request.

## Incident brief

At 14:03 UTC, the checkout API began returning intermittent 503s during a
merchant campaign. The gateway dashboard remained healthy and CPU on the API
pods was below 30%. Some retries succeeded without a deploy.

The relevant production excerpts are in
[`incident/production-2026-09-07.log`](incident/production-2026-09-07.log).
The on-call handoff is in [`incident/HANDOFF.md`](incident/HANDOFF.md).

This repository intentionally contains the production defect. Do not use its
database lifecycle approach as an example for a real service.
