# On-call handoff — intermittent payment authorisation failures

**Start:** 2026-09-07 14:03 UTC  
**Customer effect:** checkout authorisation requests intermittently return HTTP 503. Retrying is
often successful; no elevated gateway decline rate is visible.

## Environment

- Three `payments-api` pods, Node 20.
- Managed Postgres: `max_connections=25`; five are reserved for administrative work.
- `DB_POOL_MAX=5` is set on every application pod.
- Traffic rose from roughly 12 to 75 authorisations/sec after the `mrc_884` campaign began.
- No deployment or configuration rollout occurred between 13:00 and the first alert.

## Evidence collected

- API pods remain healthy and have normal CPU/memory.
- Postgres exporter briefly reports 20 active application connections.
- Failures alternate between client connection timeouts and PostgreSQL's `53300` capacity error.
- The simulated gateway has no error entries for failed request IDs.
- Restarting one API pod reduced failures for several minutes, then they returned under load.

## Scope

Find the application-level cause. The incident is intentionally unresolved in this repository;
do not apply a fix as part of the exercise.
