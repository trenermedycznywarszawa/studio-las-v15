import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const CANONICAL_PRODUCTION_REF = "ufcumhbnuyernuwepcij";
export const CANONICAL_STAGING_REF = "ulauyoqjoetjqktegeuq";
export const SYNTHETIC_QA_CLIENT_ID = "c7200000-0000-4000-8000-000000000001";
export const ALLOWED_SYNTHETIC_QA_EMAILS = Object.freeze(["attention.trainer@example.test"]);
export const ALLOWED_ISOLATION_MODES = Object.freeze(["isolated-disposable"]);
export const ALLOWED_CLEANUP_STRATEGIES = Object.freeze(["disposable-environment-teardown"]);
export const RUN_MARKER_PATTERN = /^ATTENTION-[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/;
const PROJECT_REF_PATTERN = /^[a-z][a-z0-9-]{7,39}$/;
const FOREIGN_SEEDED_CLIENT_IDS = Object.freeze([
  "aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1",
  "bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2"
]);
const DEFAULT_REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_AND_E2E_FILES_TO_CHECK = Object.freeze([
  "assets/os/runtime.js",
  "scripts/build_studio_las_os_deploy.mjs",
  "scripts/attention_e2e_helpers.mjs",
  "scripts/e2e_trainer_attention_flow.mjs",
  "scripts/e2e_client_contact_requests.mjs",
  "scripts/e2e_questionnaire_assignment.mjs",
  "scripts/e2e_trainer_attention_staging.mjs"
]);

/**
 * Structured inventory of database and auth writes performed by the Trainer
 * Attention browser E2E suite on the synthetic QA client, with dependency
 * boundaries and immutability constraints that block shared-staging cleanup.
 */
export const QA_MUTATION_INVENTORY = Object.freeze({
  qaClientId: SYNTHETIC_QA_CLIENT_ID,
  qaClientName: "Osoba testowa · dane fikcyjne",
  scripts: Object.freeze([
    "scripts/e2e_mfa_bootstrap.mjs",
    "scripts/e2e_trainer_attention_flow.mjs",
    "scripts/e2e_client_contact_requests.mjs",
    "scripts/e2e_questionnaire_assignment.mjs",
    "scripts/e2e_pwd_first_guidance.mjs",
    "scripts/e2e_process_report.mjs"
  ]),
  entities: Object.freeze([
    Object.freeze({
      table: "auth.mfa_factors",
      operations: Object.freeze(["enroll", "verify", "unenroll"]),
      scripts: Object.freeze(["e2e_mfa_bootstrap.mjs"]),
      dependencies: Object.freeze(["QA trainer auth user"]),
      sharedStagingCleanupStatus: "self-cleaned via if:always(), factor-prefix scoped"
    }),
    Object.freeze({
      table: "public.home_plans",
      operations: Object.freeze(["INSERT(draft)", "RPC(approve_home_plan_guidance)", "RPC(publish_home_plan_guidance)", "SIDE_EFFECT_UPDATE(previous_active->archived)"]),
      scripts: Object.freeze(["e2e_trainer_attention_flow.mjs", "e2e_client_contact_requests.mjs", "e2e_pwd_first_guidance.mjs"]),
      dependencies: Object.freeze(["clients"]),
      sharedStagingCleanupStatus: "unsafe: publishing archives prior active plans without a reversible run-scoped restore"
    }),
    Object.freeze({
      table: "public.home_plan_items",
      operations: Object.freeze(["INSERT"]),
      scripts: Object.freeze(["e2e_trainer_attention_flow.mjs", "e2e_client_contact_requests.mjs", "e2e_pwd_first_guidance.mjs"]),
      dependencies: Object.freeze(["home_plans", "clients"]),
      sharedStagingCleanupStatus: "unsafe: referenced by guidance_events"
    }),
    Object.freeze({
      table: "public.guidance_events",
      operations: Object.freeze(["UI_CHECKIN", "RPC(save_client_guidance_response)"]),
      scripts: Object.freeze(["e2e_trainer_attention_flow.mjs", "e2e_client_contact_requests.mjs"]),
      dependencies: Object.freeze(["clients", "home_plans", "home_plan_items"]),
      sharedStagingCleanupStatus: "unsafe: anchored by reports.evidence_snapshot and trainer_signal_reviews"
    }),
    Object.freeze({
      table: "public.sessions",
      operations: Object.freeze(["INSERT(readiness)", "PATCH(readiness_drift)", "INSERT(pwd_session)"]),
      scripts: Object.freeze(["e2e_trainer_attention_flow.mjs", "e2e_pwd_first_guidance.mjs"]),
      dependencies: Object.freeze(["clients"]),
      sharedStagingCleanupStatus: "unsafe: referenced by trainer_signal_reviews and reports.evidence_snapshot"
    }),
    Object.freeze({
      table: "public.trainer_signal_reviews",
      operations: Object.freeze(["INSERT(noted_no_change|contact_required)", "RPC(resolve_trainer_signal_contact)"]),
      scripts: Object.freeze(["e2e_trainer_attention_flow.mjs", "e2e_client_contact_requests.mjs"]),
      dependencies: Object.freeze(["clients", "profiles", "guidance_events|sessions"]),
      sharedStagingCleanupStatus: "unsafe: mixed with historical questionnaire reviews"
    }),
    Object.freeze({
      table: "public.questionnaire_assignments",
      operations: Object.freeze(["RPC(assign_active_questionnaire)", "UPDATE(status->in_progress->submitted)"]),
      scripts: Object.freeze(["e2e_questionnaire_assignment.mjs"]),
      dependencies: Object.freeze(["clients", "questionnaire_versions"]),
      sharedStagingCleanupStatus: "unsafe: permanently adds unreviewed submitted assignments to questionnaireBacklog()"
    }),
    Object.freeze({
      table: "public.questionnaire_responses",
      operations: Object.freeze(["SAVE_DRAFT", "SUBMIT_IMMUTABLE_RESPONSE"]),
      scripts: Object.freeze(["e2e_questionnaire_assignment.mjs"]),
      dependencies: Object.freeze(["questionnaire_assignments", "clients"]),
      sharedStagingCleanupStatus: "unsafe: immutable submission snapshot linked to assignment history"
    }),
    Object.freeze({
      table: "public.body_measurements",
      operations: Object.freeze(["INSERT"]),
      scripts: Object.freeze(["e2e_process_report.mjs"]),
      dependencies: Object.freeze(["clients"]),
      sharedStagingCleanupStatus: "unsafe: captured into published report evidence_snapshot"
    }),
    Object.freeze({
      table: "public.reports",
      operations: Object.freeze(["RPC(create_evidence_report)", "APPROVE", "PUBLISH"]),
      scripts: Object.freeze(["e2e_process_report.mjs"]),
      dependencies: Object.freeze(["clients", "sessions", "home_plans", "guidance_events", "body_measurements"]),
      sharedStagingCleanupStatus: "hard-blocked: private.guard_report_release() forbids DELETE once approved_at or published_at is set"
    }),
    Object.freeze({
      table: "public.audit_events",
      operations: Object.freeze(["TRIGGER_APPEND"]),
      scripts: Object.freeze(["e2e_mfa_bootstrap.mjs", "e2e_trainer_attention_flow.mjs", "e2e_client_contact_requests.mjs", "e2e_questionnaire_assignment.mjs", "e2e_pwd_first_guidance.mjs", "e2e_process_report.mjs"]),
      dependencies: Object.freeze(["profiles", "clients"]),
      sharedStagingCleanupStatus: "immutable append-only audit trail"
    })
  ])
});

function isAllowedPreviewOrigin(appUrl) {
  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (String(appUrl).includes(CANONICAL_PRODUCTION_REF)) return false;
    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

function isInsideRoot(rootDir, candidatePath) {
  const rel = path.relative(rootDir, candidatePath);
  return Boolean(rel) && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Inspects actual runtime, deploy, and E2E script files on disk so setting
 * VERIFIED env vars alone can never bypass hardcoded canonical Supabase refs.
 *
 * @param {string} repoRoot - Repository root path.
 * @param {string} expectedProjectRef - Candidate non-canonical QA project ref.
 * @returns {string[]} Hardcoded isolation violations found in repository code/config.
 */
function inspectCodebaseIsolation(repoRoot, expectedProjectRef) {
  const findings = [];
  const pinnedFiles = [];

  for (const relPath of RUNTIME_AND_E2E_FILES_TO_CHECK) {
    const absPath = path.join(repoRoot, relPath);
    if (!existsSync(absPath)) {
      findings.push(`isolation/cleanup unverified: required runtime/E2E target file missing (${relPath})`);
      continue;
    }
    const content = readFileSync(absPath, "utf8");
    if (content.includes(CANONICAL_STAGING_REF) || content.includes(CANONICAL_PRODUCTION_REF)) {
      pinnedFiles.push(relPath);
    }
  }

  if (pinnedFiles.length > 0) {
    findings.push(
      `isolation/cleanup unverified: codebase hardcodes canonical Supabase project ref (${pinnedFiles.join(", ")})`
    );
  }

  const deployedConfigPath = path.join(repoRoot, ".deploy", "studio-las-os", "studio-las-config.js");
  if (existsSync(deployedConfigPath)) {
    const deployedConfig = readFileSync(deployedConfigPath, "utf8");
    if (deployedConfig.includes(CANONICAL_PRODUCTION_REF) || deployedConfig.includes(CANONICAL_STAGING_REF)) {
      findings.push("isolation/cleanup unverified: built .deploy/studio-las-os/studio-las-config.js targets canonical production or shared staging");
    } else if (expectedProjectRef && !deployedConfig.includes(expectedProjectRef)) {
      findings.push("isolation/cleanup unverified: built .deploy/studio-las-os/studio-las-config.js does not target STUDIO_LAS_E2E_PROJECT_REF");
    }
  }

  const rootConfigPath = path.join(repoRoot, "studio-las-config.js");
  if (existsSync(rootConfigPath)) {
    const rootConfig = readFileSync(rootConfigPath, "utf8");
    if (rootConfig.includes(CANONICAL_PRODUCTION_REF) || rootConfig.includes(CANONICAL_STAGING_REF)) {
      findings.push("isolation/cleanup unverified: studio-las-config.js pins canonical Supabase project ref");
    }
  }

  return findings;
}

function inspectVerificationEvidence(repoRoot, evidencePathEnv, expected) {
  const relOrAbs = String(evidencePathEnv || "").trim();
  if (!relOrAbs) {
    return ["isolation/cleanup unverified: missing STUDIO_LAS_E2E_VERIFICATION_EVIDENCE artifact; bare VERIFIED env flags are insufficient"];
  }

  const resolvedPath = path.isAbsolute(relOrAbs)
    ? path.resolve(relOrAbs)
    : path.resolve(repoRoot, relOrAbs);

  if (!isInsideRoot(repoRoot, resolvedPath) || !existsSync(resolvedPath)) {
    return ["isolation/cleanup unverified: STUDIO_LAS_E2E_VERIFICATION_EVIDENCE must reference an existing evidence file inside the repository"];
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(resolvedPath, "utf8"));
  } catch {
    return ["isolation/cleanup unverified: malformed STUDIO_LAS_E2E_VERIFICATION_EVIDENCE JSON"];
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return ["isolation/cleanup unverified: invalid verification evidence structure"];
  }
  if (parsed.verified !== true || parsed.interruptedRecoveryTested !== true) {
    return ["isolation/cleanup unverified: verification evidence must confirm verified=true and interruptedRecoveryTested=true"];
  }
  if (parsed.targetProjectRef !== expected.projectRef
    || parsed.isolationMode !== expected.isolationMode
    || parsed.cleanupStrategy !== expected.cleanupStrategy) {
    return ["isolation/cleanup unverified: verification evidence does not match targetProjectRef/isolationMode/cleanupStrategy"];
  }
  if (parsed.marker !== expected.marker) {
    return ["isolation/cleanup unverified: verification evidence marker does not match STUDIO_LAS_E2E_MARKER"];
  }

  try {
    assertSafeCleanupPlan(parsed.cleanupPlan);
  } catch (err) {
    return [`isolation/cleanup unverified: ${err instanceof Error ? err.message : String(err)}`];
  }

  return [];
}

/**
 * Evaluates whether mutating staging browser E2E execution is permitted under
 * strict fail-closed isolation, codebase target, identity, marker, and cleanup
 * evidence verification rules.
 *
 * @param {Record<string, string | undefined>} [env=process.env] - Environment configuration.
 * @param {{ repoRoot?: string }} [options] - Internal test fixture root override.
 * @returns {{ allowed: boolean, status: "READY" | "BLOCKED", code: string, reason: string, failures: readonly string[] }}
 */
export function evaluateE2eSafetyGate(env = process.env, options = {}) {
  const source = env && typeof env === "object" ? env : {};
  const repoRoot = options && typeof options.repoRoot === "string" ? path.resolve(options.repoRoot) : DEFAULT_REPO_ROOT;
  const failures = [];

  const projectRef = String(source.STUDIO_LAS_E2E_PROJECT_REF || source.STAGING_REF || "").trim();
  const supabaseUrl = String(source.STUDIO_LAS_E2E_SUPABASE_URL || source.STAGING_ORIGIN || "").trim();
  const appUrl = String(source.STUDIO_LAS_E2E_URL || "").trim();
  const qaEmail = String(source.STUDIO_LAS_QA_EMAIL || "").trim().toLowerCase();
  const qaClientId = String(source.STUDIO_LAS_QA_CLIENT_ID || SYNTHETIC_QA_CLIENT_ID).trim();
  const marker = String(source.STUDIO_LAS_E2E_MARKER || "").trim();
  const isolationMode = String(source.STUDIO_LAS_E2E_ISOLATION_MODE || "").trim();
  const isolationVerified = String(source.STUDIO_LAS_E2E_ISOLATION_VERIFIED || "").trim();
  const cleanupStrategy = String(source.STUDIO_LAS_E2E_CLEANUP_STRATEGY || "").trim();
  const cleanupVerified = String(source.STUDIO_LAS_E2E_CLEANUP_VERIFIED || "").trim();
  const interrupted = String(source.STUDIO_LAS_E2E_INTERRUPTED || "").trim().toLowerCase();
  const aborted = String(source.STUDIO_LAS_E2E_ABORTED || "").trim().toLowerCase();
  const priorState = String(source.STUDIO_LAS_E2E_PRIOR_STATE || "").trim().toLowerCase();

  if (!projectRef) {
    failures.push("wrong project ref: missing STUDIO_LAS_E2E_PROJECT_REF");
  } else if (projectRef === CANONICAL_PRODUCTION_REF) {
    failures.push("wrong project ref: canonical production ref is strictly forbidden");
  } else if (!PROJECT_REF_PATTERN.test(projectRef)) {
    failures.push("wrong project ref: invalid project ref format");
  }

  if (supabaseUrl) {
    try {
      const parsedBackend = new URL(supabaseUrl);
      if (parsedBackend.protocol !== "https:" || supabaseUrl.includes(CANONICAL_PRODUCTION_REF)) {
        failures.push("wrong backend URL: invalid or production Supabase origin");
      } else if (projectRef && parsedBackend.hostname.endsWith(".supabase.co")
        && parsedBackend.hostname !== `${projectRef}.supabase.co`) {
        failures.push("wrong backend URL: Supabase origin does not match STUDIO_LAS_E2E_PROJECT_REF");
      }
    } catch {
      failures.push("wrong backend URL: malformed STUDIO_LAS_E2E_SUPABASE_URL");
    }
  }

  if (!appUrl || !isAllowedPreviewOrigin(appUrl)) {
    failures.push("wrong app preview URL: isolated local preview origin required");
  }

  if (!qaEmail || !ALLOWED_SYNTHETIC_QA_EMAILS.includes(qaEmail)
    || (!qaEmail.endsWith("@example.test") && !qaEmail.endsWith(".example.test"))) {
    failures.push("non-synthetic QA account: allowlisted .example.test QA trainer email required");
  }

  if (qaClientId !== SYNTHETIC_QA_CLIENT_ID) {
    failures.push("non-synthetic QA client: client ID does not match isolated synthetic QA client");
  }

  if (!RUN_MARKER_PATTERN.test(marker)) {
    failures.push("ambiguous run marker: explicit ATTENTION-<run>-<attempt> marker required");
  }

  if (projectRef === CANONICAL_STAGING_REF) {
    failures.push(`isolation/cleanup unverified: canonical staging ${CANONICAL_STAGING_REF} is shared and lacks safe cleanup`);
  }

  if (!ALLOWED_ISOLATION_MODES.includes(isolationMode) || isolationVerified !== "VERIFIED") {
    failures.push("isolation/cleanup unverified: isolated disposable environment not verified");
  }

  if (!ALLOWED_CLEANUP_STRATEGIES.includes(cleanupStrategy) || cleanupVerified !== "VERIFIED") {
    failures.push("isolation/cleanup unverified: cleanup and recovery strategy not verified");
  }

  failures.push(...inspectCodebaseIsolation(repoRoot, projectRef));
  failures.push(...inspectVerificationEvidence(repoRoot, source.STUDIO_LAS_E2E_VERIFICATION_EVIDENCE, {
    projectRef,
    isolationMode,
    cleanupStrategy,
    marker
  }));

  if (interrupted === "true" || aborted === "true" || priorState === "dirty" || priorState === "unrecovered") {
    failures.push("interrupted execution: prior or active run reported interrupted/unrecovered state");
  }

  if (failures.length === 0) {
    return Object.freeze({
      allowed: true,
      status: "READY",
      code: "READY",
      reason: "Isolated disposable QA environment, parameterized code targets, and recovery evidence verified.",
      failures: Object.freeze([])
    });
  }

  const hasIsolationOrCleanupFailure = failures.some(item => item.startsWith("isolation/cleanup unverified"));
  const code = hasIsolationOrCleanupFailure
    ? "BLOCKED: isolation/cleanup unverified"
    : `BLOCKED: ${failures[0]}`;

  return Object.freeze({
    allowed: false,
    status: "BLOCKED",
    code,
    reason: `${code} (${failures.join("; ")})`,
    failures: Object.freeze(failures)
  });
}

/**
 * Enforces the E2E safety gate fail-closed before any browser launch or mutating call.
 *
 * @param {Record<string, string | undefined>} [env=process.env] - Environment configuration.
 * @returns {{ allowed: true, status: "READY", code: "READY", reason: string, failures: readonly string[] }}
 * @throws {Error} When any isolation, codebase target, cleanup, identity, marker, or evidence check fails.
 */
export function assertE2eSafetyGate(env = process.env) {
  const verdict = evaluateE2eSafetyGate(env);
  if (!verdict.allowed) {
    throw new Error(verdict.reason);
  }
  return verdict;
}

/**
 * Validates that a proposed cleanup operation never deletes foreign clients,
 * historical records, immutable reports/audit trails, or shared-staging data.
 *
 * @param {object} plan - Cleanup plan descriptor.
 * @returns {true} When all safety invariants hold.
 * @throws {Error} With a BLOCKED prefix when any cleanup safety boundary is violated.
 */
export function assertSafeCleanupPlan(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new Error("BLOCKED: cleanup plan object is required");
  }
  if (plan.targetProjectRef === CANONICAL_PRODUCTION_REF || plan.targetProjectRef === CANONICAL_STAGING_REF) {
    throw new Error("BLOCKED: row-level cleanup forbidden on canonical production or shared staging");
  }
  if (plan.scope !== "isolated_disposable_environment") {
    throw new Error("BLOCKED: cleanup requires isolated_disposable_environment scope");
  }
  if (plan.usesServiceRole === true) {
    throw new Error("BLOCKED: cleanup must not use service_role");
  }
  if (plan.bypassesRlsOrTriggers === true) {
    throw new Error("BLOCKED: cleanup must not disable or bypass RLS/triggers");
  }
  if (plan.targetsForeignClients === true) {
    throw new Error("BLOCKED: cleanup must not target foreign clients");
  }
  if (plan.targetsHistoricalRecords === true) {
    throw new Error("BLOCKED: cleanup must not delete historical records");
  }
  if (plan.deletesApprovedReports === true) {
    throw new Error("BLOCKED: cleanup must not attempt to delete approved or published reports");
  }
  if (plan.deletesAuditEvents === true) {
    throw new Error("BLOCKED: cleanup must not delete audit events");
  }
  if (!Array.isArray(plan.clientIds) || plan.clientIds.length !== 1 || plan.clientIds[0] !== SYNTHETIC_QA_CLIENT_ID) {
    throw new Error("BLOCKED: cleanup must be strictly scoped to the single synthetic QA client");
  }
  if (!RUN_MARKER_PATTERN.test(String(plan.marker || ""))) {
    throw new Error("BLOCKED: cleanup requires an unambiguous run marker");
  }

  const rawText = `${String(plan.sql || "")}\n${Array.isArray(plan.actions) ? plan.actions.join("\n") : String(plan.actions || "")}`;
  const forbiddenPatterns = [
    { pattern: /\btruncate\b/i, label: "TRUNCATE forbidden" },
    { pattern: /\bdisable\s+trigger\b/i, label: "DISABLE TRIGGER forbidden" },
    { pattern: /\brow\s+level\s+security\b/i, label: "RLS modification forbidden" },
    { pattern: /\bsession_replication_role\b/i, label: "trigger bypass via session_replication_role forbidden" },
    { pattern: /service[\s_-]?role/i, label: "service_role forbidden" },
    { pattern: /\bdelete\s+from\s+(?:public\.)?[a-z_]+\s*(?:;|$)/i, label: "unscoped global DELETE forbidden" }
  ];
  for (const { pattern, label } of forbiddenPatterns) {
    if (pattern.test(rawText)) {
      throw new Error(`BLOCKED: ${label}`);
    }
  }
  for (const foreignId of FOREIGN_SEEDED_CLIENT_IDS) {
    if (rawText.toLowerCase().includes(foreignId)) {
      throw new Error(`BLOCKED: cleanup references foreign client ${foreignId}`);
    }
  }
  return true;
}

function writeGithubOutput(verdict) {
  const outputPath = String(process.env.GITHUB_OUTPUT || "").trim();
  if (!outputPath) return;
  const lines = [
    `allowed=${verdict.allowed ? "true" : "false"}`,
    `status=${verdict.status}`,
    `code=${verdict.code.replace(/[\r\n]/g, " ")}`,
    `reason=${verdict.reason.replace(/[\r\n]/g, " ")}`
  ];
  appendFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
}

function writeGithubSummary(verdict) {
  const summaryPath = String(process.env.GITHUB_STEP_SUMMARY || "").trim();
  if (!summaryPath) return;
  const markdown = [
    "### Staging Browser E2E Safety Gate",
    "",
    `- **Status:** \`${verdict.code}\``,
    `- **Allowed to execute mutating staging E2E:** \`${verdict.allowed}\``,
    `- **Reason:** ${verdict.reason}`,
    "",
    "_Local Node regression tests run independently in `local-regressions`._",
    ""
  ].join("\n");
  appendFileSync(summaryPath, markdown, "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = new Set(process.argv.slice(2));
  const verdict = evaluateE2eSafetyGate(process.env);
  if (args.has("--github-output")) writeGithubOutput(verdict);
  if (args.has("--github-summary")) writeGithubSummary(verdict);

  if (verdict.allowed) {
    console.log(`E2E_SAFETY_GATE_READY: ${verdict.reason}`);
  } else {
    if (process.env.GITHUB_ACTIONS === "true" && !args.has("--report-only")) {
      console.error(`::error title=${verdict.code}::${verdict.reason}`);
    }
    console.error(verdict.code);
    console.error(verdict.reason);
    if (!args.has("--report-only")) {
      process.exitCode = 1;
    }
  }
}
