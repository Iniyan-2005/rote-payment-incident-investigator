# Rote Payment Incident Investigator

A reusable **Rote Play workflow** that investigates a production incident using incident handoff notes, production logs, and application source code to produce an evidence-backed root cause analysis.

This repository contains a deliberately flawed Node.js payment API and the reusable investigation workflow used to diagnose its production failure.

## The Problem

Production incidents are often investigated manually:

```text
Alert
  ↓
Read incident handoff
  ↓
Search production logs
  ↓
Inspect application code
  ↓
Test hypotheses
  ↓
Identify root cause
  ↓
Recommend remediation
```

This process is repetitive and depends heavily on individual debugging experience.

This project captures that investigation process as a reusable **Rote Play**.

The Play performs a structured, read-only investigation across:

* Incident handoff documentation
* Production logs
* Database connection lifecycle code
* Repository/database access patterns
* Service execution flow

It then correlates the evidence to identify the application-level root cause.

---

# Production Incident

At 14:03 UTC, the checkout API began returning intermittent HTTP 503 responses during a merchant campaign.

Observed symptoms included:

* Intermittent HTTP 503 responses
* PostgreSQL error `53300`
* Connection acquisition timeouts (`ETIMEDOUT`)
* Some retries succeeding without a deployment
* Restarting an API pod temporarily reducing failures

The payment gateway remained healthy and API pod CPU usage was below 30%.

Relevant incident evidence:

* [On-call handoff](incident/HANDOFF.md)
* [Production logs](incident/production-2026-09-07.log)

---

# Root Cause

The application creates a new PostgreSQL `pg.Pool` for individual repository operations instead of sharing a process-level connection pool.

Under increased traffic:

1. Repository operations create independent connection pools.
2. Connections remain open until the idle timeout.
3. Multiple pools accumulate across API processes.
4. PostgreSQL connection capacity becomes exhausted.
5. New requests either wait for connections or are rejected by PostgreSQL.

This results in:

```text
HTTP 503
     +
ETIMEDOUT
     +
PostgreSQL 53300
     ↓
Database connection saturation
```

The intentionally flawed implementation exists in this repository for investigation purposes.

> **Do not use the database connection lifecycle implementation in this repository as a production example.**

---

# The Rote Play

The reusable investigation workflow is located at:

```text
plays/payment-incident-rca/
├── main.ts
├── deps.toml
└── deno.json
```

The Play executes seven evidence-gathering steps:

| Step                        | Purpose                                               |
| --------------------------- | ----------------------------------------------------- |
| Read Handoff                | Capture incident context and operational observations |
| Read Production Logs        | Identify failure patterns and database saturation     |
| Read Payment Repository     | Inspect database access behavior                      |
| Read Pool Factory           | Inspect connection pool creation and lifecycle        |
| Read Payment Service        | Understand the request execution flow                 |
| Inspect Pool Lifecycle      | Search for pool creation, reuse, and cleanup behavior |
| Inspect Connection Failures | Correlate timeouts and PostgreSQL capacity errors     |

All investigation steps are read-only.

---

# Workflow

```text
                 Production Incident
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
       Handoff        Logs        Source Code
          │             │             │
          └─────────────┼─────────────┘
                        │
                        ▼
              Rote Evidence Gathering
                        │
                        ▼
               Hypothesis Elimination
                        │
                        ▼
              Root Cause Correlation
                        │
                        ▼
            Evidence-Backed RCA Output
```

---

# Running the Play

## Prerequisites

The workflow requires:

* Rote CLI
* `sed`
* `ripgrep (rg)`

On Ubuntu/Debian:

```bash
sudo apt update
sudo apt install ripgrep
```

---

## Validate the Play

```bash
rote play validate plays/payment-incident-rca/main.ts
```

Expected result:

```text
Quality score: Pass
Found 0 error(s)
```

---

## Inspect the Execution Plan

```bash
rote play run plays/payment-incident-rca/main.ts \
repo_path="$(pwd)" \
--dry-run
```

This displays the investigation DAG without executing it.

Expected structure:

```text
DAG: payment-incident-rca

7 steps
1 execution level
7 parallel investigation steps
```

---

## Run the Investigation

From the repository root:

```bash
rote play run plays/payment-incident-rca/main.ts \
repo_path="$(pwd)"
```

Example execution:

```text
Running DAG play 'payment-incident-rca' (7 steps)...

✔ Read Handoff
✔ Read Production Logs
✔ Read Payment Repository
✔ Read Pool Factory
✔ Read Payment Service
✔ Inspect Pool Lifecycle
✔ Inspect Connection Failures

Summary: 7/7 completed, 0 failed, 0 blocked
```

The Play then produces a structured root cause analysis covering:

* Symptoms
* Evidence collected
* Investigation steps
* Eliminated hypotheses
* Root cause
* Recommended remediation

---

# Validation Results

The Play was validated and executed successfully.

| Check                     | Result        |
| ------------------------- | ------------- |
| Dependency preflight      | Passed        |
| Play validation           | Passed        |
| Play lint                 | Passed        |
| Dry-run DAG generation    | Passed        |
| Full execution            | Passed        |
| Investigation steps       | 7/7 completed |
| Failed steps              | 0             |
| Application code modified | No            |

Example execution duration:

```text
7/7 completed
0 failed
0 blocked
```

---

# Health and Quality

The generated Play successfully passes Rote validation.

The workflow was also executed against this repository and successfully reproduced the original evidence-gathering process and root cause analysis.

The Play package was made portable by removing machine-specific paths and replacing them with repository parameters.

Example:

```bash
rote play run plays/payment-incident-rca/main.ts \
repo_path="/path/to/repository"
```

---

# Why This Play Is Reusable

This workflow is not limited to this specific incident.

The reusable pattern is:

```text
Incident Context
      +
Production Evidence
      +
Relevant Source Code
      ↓
Structured Investigation
      ↓
Hypothesis Elimination
      ↓
Evidence-Based Root Cause Analysis
```

The Play separates repository-specific inputs from the investigation workflow through configurable paths:

```text
repo_path
handoff_path
logs_path
repository_path
pool_path
service_path
```

This makes the workflow adaptable to repositories with similar incident investigation requirements.

The core idea is reusable:

> Capture a successful debugging investigation as an executable workflow so future incidents can be investigated systematically instead of relying entirely on ad-hoc manual debugging.

---

# The Intentionally Flawed Payment API

The repository also contains a small, realistic payment-authorisation service.

It:

* Accepts idempotent payment requests
* Records payment attempts
* Calls a simulated payment gateway
* Returns authorisation results

## Run Locally

```bash
npm install
cp .env.example .env
npm start
```

PostgreSQL requires a `payment_attempts` table.

The development schema is available in:

```text
db/schema.sql
```

A smoke test can be run with:

```bash
npm run smoke
```

---

# Repository Structure

```text
.
├── incident/
│   ├── HANDOFF.md
│   └── production-2026-09-07.log
│
├── plays/
│   └── payment-incident-rca/
│       ├── main.ts
│       ├── deps.toml
│       └── deno.json
│
├── src/
│   ├── db/
│   │   └── pool.js
│   ├── repositories/
│   │   └── payment-repository.js
│   └── services/
│       └── payment-service.js
│
├── db/
│   └── schema.sql
│
└── README.md
```

---

# Recommended Remediation

The investigation identifies the following production remediation:

1. Create one shared PostgreSQL pool per API process.
2. Reuse that pool across repository operations.
3. Close the pool only during graceful application shutdown.
4. Size connection pools based on the total database connection budget across all replicas.
5. Monitor:

   * Active connections
   * Idle connections
   * Waiting clients
   * Connection acquisition latency
   * PostgreSQL connection saturation
6. Add sustained concurrency tests to verify connection counts remain bounded under load.

These recommendations describe how the intentionally introduced defect should be fixed, but the application code is intentionally left unchanged in this repository.

---

# Key Takeaway

This project demonstrates more than finding a bug.

It demonstrates how a production debugging process can be captured and converted into a reusable executable workflow.

Instead of:

```text
Engineer manually investigates incident
```

the workflow becomes:

```text
Incident Evidence
      ↓
Reusable Rote Play
      ↓
Structured Investigation
      ↓
Evidence-Backed Root Cause Analysis
```

---

## Tech Stack

* Node.js
* PostgreSQL
* Rote
* TypeScript / Deno
* Ripgrep
* Shell-based evidence gathering

---

## License

This project is intended for experimentation, learning, and demonstrating reusable incident investigation workflows.
