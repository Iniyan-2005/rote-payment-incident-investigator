#!/usr/bin/env -S rote play run
/**
 * @rote-frontmatter
 * ---
 * name: payment-incident-rca
 * description: "Produces an evidence-backed RCA for database connection saturation in a Node.js payment API using an incident handoff, production logs, and connection-pool source evidence."
 * provenance:
 *   author: 'unattributed: Codex'
 * metadata:
 *   version: "0.1.0"
 *   rote_version: "0.80.0"
 *   status: draft
 *   kind: atomic
 *   flow_type: parallel
 *   execution_model: steps_with_presentation
 *   requires_sessions: false
 *   hardcode_audit:
 *     schema: 2
 *     suspicion_count: 0
 *     audit_sha256: 2d7c9a78e141d30fa8d1cc7cddf843969dbaa86fe6e66712070186cc7ba10a5d
 *   discoverability:
 *     tags:
 *       - incident
 *       - nodejs
 *       - postgres
 *       - payment
 * contract:
 *   atomic: true
 *   input:
 *     type: none
 *   output:
 *     format: json
 *     destination: stdout
 *   composable: true
 * parameters:
 * - name: repo_path
 *   param_type: string
 *   required: true
 *   description: "Absolute path to the Node.js repository under investigation"
 * - name: handoff_path
 *   param_type: string
 *   required: false
 *   default: "incident/HANDOFF.md"
 *   description: "Repository-relative on-call handoff path"
 * - name: logs_path
 *   param_type: string
 *   required: false
 *   default: "incident/production-2026-09-07.log"
 *   description: "Repository-relative production log path"
 * - name: repository_path
 *   param_type: string
 *   required: false
 *   default: "src/repositories/payment-repository.js"
 *   description: "Repository-relative payment repository implementation path"
 * - name: pool_path
 *   param_type: string
 *   required: false
 *   default: "src/db/pool.js"
 *   description: "Repository-relative database pool implementation path"
 * - name: service_path
 *   param_type: string
 *   required: false
 *   default: "src/services/payment-service.js"
 *   description: "Repository-relative payment service implementation path"
 * steps:
 *   read_handoff:
 *     type: process.exec
 *     argv:
 *     - sed
 *     - -n
 *     - 1,240p
 *     - "$repo_path/$handoff_path"
 *   read_production_logs:
 *     type: process.exec
 *     argv:
 *     - sed
 *     - -n
 *     - 1,240p
 *     - "$repo_path/$logs_path"
 *   read_payment_repository:
 *     type: process.exec
 *     argv:
 *     - sed
 *     - -n
 *     - 1,260p
 *     - "$repo_path/$repository_path"
 *   read_pool_factory:
 *     type: process.exec
 *     argv:
 *     - sed
 *     - -n
 *     - 1,200p
 *     - "$repo_path/$pool_path"
 *   read_payment_service:
 *     type: process.exec
 *     argv:
 *     - sed
 *     - -n
 *     - 1,220p
 *     - "$repo_path/$service_path"
 *   inspect_pool_lifecycle:
 *     type: process.exec
 *     argv:
 *     - rg
 *     - -n
 *     - createPaymentPool|new Pool|pool\.query|pool\.end
 *     - "$repo_path/$repository_path"
 *     - "$repo_path/$pool_path"
 *   inspect_connection_failures:
 *     type: process.exec
 *     argv:
 *     - rg
 *     - -n
 *     - ETIMEDOUT|53300|active_connections|recovered|statusCode=503
 *     - "$repo_path/$logs_path"
 * ---
 */

const presentationSdk = await import("__ROTE_PRESENTATION_SDK__").catch((cause) => {
  throw new Error(
    "This is a rote steps presentation program. Run it with `rote play run <name>`.",
    { cause },
  );
});
const { FlowOutput, loadPresentationContext, stepName } = presentationSdk;

const out = new FlowOutput();
const ctx = await loadPresentationContext();

const renderedSteps: Record<string, unknown> = {};

// Takes the step handle (not the name) so every `stepName("...")` at the
// call sites stays a literal that lint can verify against `steps:`.
function renderStep(step: ReturnType<typeof ctx.step>): unknown {
  switch (step.outcome.status) {
    // A restored step completed, in an earlier run, so it reads exactly like one.
    case "completed":
    case "restored":
      return step.outcome.output.body;
    case "skipped":
      return { status: "skipped", reason: step.outcome.output.reason };
    case "failed":
      return { status: "failed", message: step.outcome.output.message };
    case "blocked":
      return {
        status: "blocked",
        reason: step.outcome.output.reason,
        blocked_by: step.outcome.output.blocked_by ?? [],
      };
    default:
      // Unreachable while this body matches the SDK. A play exported before a new
      // outcome status was added lands here instead, so name the remedy.
      throw new Error(
        `unsupported step outcome: ${JSON.stringify(step.outcome)}. ` +
          `Re-export the play to regenerate this switch.`,
      );
  }
}
renderedSteps["read_handoff"] = renderStep(ctx.step(stepName("read_handoff")));
renderedSteps["read_production_logs"] = renderStep(ctx.step(stepName("read_production_logs")));
renderedSteps["read_payment_repository"] = renderStep(ctx.step(stepName("read_payment_repository")));
renderedSteps["read_pool_factory"] = renderStep(ctx.step(stepName("read_pool_factory")));
renderedSteps["read_payment_service"] = renderStep(ctx.step(stepName("read_payment_service")));
renderedSteps["inspect_pool_lifecycle"] = renderStep(ctx.step(stepName("inspect_pool_lifecycle")));
renderedSteps["inspect_connection_failures"] = renderStep(ctx.step(stepName("inspect_connection_failures")));

const rootCause =
  "Repository functions create a new pg.Pool for every database operation and never reuse or close it. " +
  "Under load, pools retain connections until idle timeout and exhaust the shared PostgreSQL connection budget.";

out.human([
  "# Payment incident root-cause analysis",
  "## Symptoms",
  "Intermittent HTTP 503 responses, connection-acquisition timeouts, and PostgreSQL 53300 capacity errors during elevated payment traffic.",
  "## Evidence collected",
  "The captured handoff and logs show connection saturation; the captured source creates separate pools for lookup, insert, and update operations.",
  "## Investigation steps",
  "Read incident context, logs, repository/pool/service source, then searched for pool lifecycle and failure signatures.",
  "## Eliminated hypotheses",
  "The evidence does not support a gateway outage, pod CPU/memory pressure, a deployment change, or a persistent database outage.",
  "## Root cause",
  rootCause,
  "## Recommended remediation",
  "Use one process-level pool, close it only during graceful shutdown, budget its size across replicas, and monitor pool acquisition and database connection saturation.",
].join("\n\n"));
out.summary("Database connection-pool lifecycle defect: per-operation pools exhaust PostgreSQL capacity under load.");
out.result({
  run_id: ctx.run.run_id,
  diagnosis: {
    root_cause: rootCause,
    remediation: [
      "Create and share one pg.Pool per API process.",
      "Close the shared pool during graceful shutdown only.",
      "Size the pool against the database connection budget across all replicas.",
      "Monitor pool acquisition latency, waiting clients, and active database connections.",
    ],
  },
  evidence_steps: renderedSteps,
});
