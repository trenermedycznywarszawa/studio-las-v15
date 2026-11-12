import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ALLOWED_CLEANUP_STRATEGIES,
  ALLOWED_ISOLATION_MODES,
  ALLOWED_SYNTHETIC_QA_EMAILS,
  CANONICAL_PRODUCTION_REF,
  CANONICAL_STAGING_REF,
  QA_MUTATION_INVENTORY,
  SYNTHETIC_QA_CLIENT_ID,
  assertE2eSafetyGate,
  assertSafeCleanupPlan,
  evaluateE2eSafetyGate
} from "./e2e_safety_gate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function validIsolatedEnv(overrides = {}) {
  return {
    STUDIO_LAS_E2E_PROJECT_REF: "isolatedqa0000000001",
    STUDIO_LAS_E2E_SUPABASE_URL: "https://isolatedqa0000000001.supabase.co",
    STUDIO_LAS_E2E_URL: "http://127.0.0.1:8790/",
    STUDIO_LAS_QA_EMAIL: ALLOWED_SYNTHETIC_QA_EMAILS[0],
    STUDIO_LAS_QA_CLIENT_ID: SYNTHETIC_QA_CLIENT_ID,
    STUDIO_LAS_E2E_MARKER: "ATTENTION-123456789-1",
    STUDIO_LAS_E2E_ISOLATION_MODE: ALLOWED_ISOLATION_MODES[0],
    STUDIO_LAS_E2E_ISOLATION_VERIFIED: "VERIFIED",
    STUDIO_LAS_E2E_CLEANUP_STRATEGY: ALLOWED_CLEANUP_STRATEGIES[0],
    STUDIO_LAS_E2E_CLEANUP_VERIFIED: "VERIFIED",
    ...overrides
  };
}

function validCleanupPlan(overrides = {}) {
  return {
    targetProjectRef: "isolatedqa0000000001",
    scope: "isolated_disposable_environment",
    usesServiceRole: false,
    bypassesRlsOrTriggers: false,
    targetsForeignClients: false,
    targetsHistoricalRecords: false,
    deletesApprovedReports: false,
    deletesAuditEvents: false,
    clientIds: [SYNTHETIC_QA_CLIENT_ID],
    marker: "ATTENTION-123456789-1",
    sql: "DELETE FROM public.sessions WHERE client_id = 'c7200000-0000-4000-8000-000000000001';",
    ...overrides
  };
}

function createSyntheticIsolatedFixture(targetRef = "isolatedqa0000000001") {
  const dir = mkdtempSync(path.join(tmpdir(), "e2e-isolated-fixture-"));
  const files = [
    "assets/os/runtime.js",
    "scripts/build_studio_las_os_deploy.mjs",
    "scripts/attention_e2e_helpers.mjs",
    "scripts/e2e_trainer_attention_flow.mjs",
    "scripts/e2e_client_contact_requests.mjs",
    "scripts/e2e_questionnaire_assignment.mjs",
    "scripts/e2e_trainer_attention_staging.mjs",
    "studio-las-config.js",
    ".deploy/studio-las-os/studio-las-config.js"
  ];
  for (const rel of files) {
    const abs = path.join(dir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `// isolated fixture for ${targetRef}\nexport const projectRef = "${targetRef}";\n`, "utf8");
  }
  const evidenceRel = "artifacts/isolated-recovery-proof.json";
  const evidenceAbs = path.join(dir, evidenceRel);
  mkdirSync(path.dirname(evidenceAbs), { recursive: true });
  writeFileSync(
    evidenceAbs,
    JSON.stringify({
      verified: true,
      interruptedRecoveryTested: true,
      targetProjectRef: targetRef,
      isolationMode: ALLOWED_ISOLATION_MODES[0],
      cleanupStrategy: ALLOWED_CLEANUP_STRATEGIES[0],
      marker: "ATTENTION-123456789-1",
      cleanupPlan: validCleanupPlan({ targetProjectRef: targetRef })
    }),
    "utf8"
  );
  return { dir, evidenceRel };
}

// 1. Positive case on synthetic isolated parameterized repo fixture with recovery evidence.
const fixture = createSyntheticIsolatedFixture("isolatedqa0000000001");
try {
  const envWithProof = validIsolatedEnv({ STUDIO_LAS_E2E_VERIFICATION_EVIDENCE: fixture.evidenceRel });
  const readyVerdict = evaluateE2eSafetyGate(envWithProof, { repoRoot: fixture.dir });
  assert.equal(readyVerdict.allowed, true);
  assert.equal(readyVerdict.status, "READY");
  assert.equal(readyVerdict.code, "READY");
  assert.deepEqual(readyVerdict.failures, []);

  // Setting VERIFIED env vars WITHOUT evidence file must still be BLOCKED even in a parameterized repo.
  const bareVerifiedBlocked = evaluateE2eSafetyGate(validIsolatedEnv(), { repoRoot: fixture.dir });
  assert.equal(bareVerifiedBlocked.allowed, false);
  assert.equal(bareVerifiedBlocked.code, "BLOCKED: isolation/cleanup unverified");
  assert.ok(bareVerifiedBlocked.reason.includes("STUDIO_LAS_E2E_VERIFICATION_EVIDENCE"));

  // Evidence path outside repo root must be rejected (BLOCKED).
  const externalEvidence = path.join(tmpdir(), "outside-evidence.json");
  writeFileSync(externalEvidence, readFileSync(path.join(fixture.dir, fixture.evidenceRel), "utf8"), "utf8");
  try {
    const outsideBlocked = evaluateE2eSafetyGate(
      validIsolatedEnv({ STUDIO_LAS_E2E_VERIFICATION_EVIDENCE: externalEvidence }),
      { repoRoot: fixture.dir }
    );
    assert.equal(outsideBlocked.allowed, false);
    assert.equal(outsideBlocked.code, "BLOCKED: isolation/cleanup unverified");
  } finally {
    rmSync(externalEvidence, { force: true });
  }

  // Build artifact pointing to canonical staging inside isolated fixture must still block!
  writeFileSync(
    path.join(fixture.dir, ".deploy/studio-las-os/studio-las-config.js"),
    `window.STUDIO_LAS_CONFIG = { mode: "staging", supabase: { projectRef: "${CANONICAL_STAGING_REF}" } };\n`,
    "utf8"
  );
  const contaminatedDeploy = evaluateE2eSafetyGate(envWithProof, { repoRoot: fixture.dir });
  assert.equal(contaminatedDeploy.allowed, false);
  assert.equal(contaminatedDeploy.code, "BLOCKED: isolation/cleanup unverified");
  assert.ok(contaminatedDeploy.reason.includes(".deploy/studio-las-os/studio-las-config.js"));
} finally {
  rmSync(fixture.dir, { recursive: true, force: true });
}

// 2. Anti-bypass check against REAL repo: setting VERIFIED + fake ref cannot bypass hardcoded Supabase addresses!
const spoofedEnvOnRealRepo = validIsolatedEnv();
const realRepoSpoofVerdict = evaluateE2eSafetyGate(spoofedEnvOnRealRepo);
assert.equal(realRepoSpoofVerdict.allowed, false, "Setting VERIFIED env vars on real repo must stay BLOCKED");
assert.equal(realRepoSpoofVerdict.status, "BLOCKED");
assert.equal(realRepoSpoofVerdict.code, "BLOCKED: isolation/cleanup unverified");
assert.ok(realRepoSpoofVerdict.reason.includes("assets/os/runtime.js"), realRepoSpoofVerdict.reason);
assert.ok(realRepoSpoofVerdict.reason.includes("scripts/attention_e2e_helpers.mjs"), realRepoSpoofVerdict.reason);
assert.ok(realRepoSpoofVerdict.reason.includes("scripts/build_studio_las_os_deploy.mjs"), realRepoSpoofVerdict.reason);
assert.throws(
  () => assertE2eSafetyGate(spoofedEnvOnRealRepo),
  err => err instanceof Error && err.message.startsWith("BLOCKED: isolation/cleanup unverified")
);

// Even spawning mutating E2E or CLI with VERIFIED env vars on real repo MUST exit 1 with BLOCKED!
const spoofCli = spawnSync(process.execPath, ["scripts/e2e_safety_gate.mjs"], {
  cwd: repoRoot,
  env: {
    PATH: process.env.PATH,
    ...spoofedEnvOnRealRepo
  },
  encoding: "utf8"
});
assert.equal(spoofCli.status, 1, "CLI must refuse VERIFIED bypass against real repo");
assert.ok(spoofCli.stderr.includes("BLOCKED: isolation/cleanup unverified"));

// 3. Negative fail-closed cases on synthetic parameterized fixture (zero network calls).
const negFixture = createSyntheticIsolatedFixture("isolatedqa0000000001");
try {
  const baseEnv = validIsolatedEnv({ STUDIO_LAS_E2E_VERIFICATION_EVIDENCE: negFixture.evidenceRel });
  const blockedCases = [
    {
      name: "empty env",
      env: {},
      expectedCode: "BLOCKED: isolation/cleanup unverified",
      expectedFragment: "missing STUDIO_LAS_E2E_PROJECT_REF"
    },
    {
      name: "canonical production project ref",
      env: { ...baseEnv, STUDIO_LAS_E2E_PROJECT_REF: CANONICAL_PRODUCTION_REF, STUDIO_LAS_E2E_SUPABASE_URL: `https://${CANONICAL_PRODUCTION_REF}.supabase.co` },
      expectedCode: "BLOCKED: isolation/cleanup unverified",
      expectedFragment: "canonical production ref is strictly forbidden"
    },
    {
      name: "canonical shared staging project ref",
      env: { ...baseEnv, STUDIO_LAS_E2E_PROJECT_REF: CANONICAL_STAGING_REF, STUDIO_LAS_E2E_SUPABASE_URL: `https://${CANONICAL_STAGING_REF}.supabase.co` },
      expectedCode: "BLOCKED: isolation/cleanup unverified",
      expectedFragment: CANONICAL_STAGING_REF
    },
    {
      name: "malformed project ref",
      env: { ...baseEnv, STUDIO_LAS_E2E_PROJECT_REF: "bad!" },
      expectedCode: "BLOCKED: isolation/cleanup unverified",
      expectedFragment: "invalid project ref format"
    },
    {
      name: "mismatched backend Supabase URL",
      env: { ...baseEnv, STUDIO_LAS_E2E_SUPABASE_URL: `https://${CANONICAL_STAGING_REF}.supabase.co` },
      expectedCode: "BLOCKED: wrong backend URL: Supabase origin does not match STUDIO_LAS_E2E_PROJECT_REF",
      expectedFragment: "does not match STUDIO_LAS_E2E_PROJECT_REF"
    },
    {
      name: "malformed backend URL",
      env: { ...baseEnv, STUDIO_LAS_E2E_SUPABASE_URL: "not-a-url" },
      expectedCode: "BLOCKED: wrong backend URL: malformed STUDIO_LAS_E2E_SUPABASE_URL",
      expectedFragment: "malformed STUDIO_LAS_E2E_SUPABASE_URL"
    },
    {
      name: "non-local unsafe app preview URL",
      env: { ...baseEnv, STUDIO_LAS_E2E_URL: "https://studiolas.pl/" },
      expectedCode: "BLOCKED: wrong app preview URL: isolated local preview origin required",
      expectedFragment: "isolated local preview origin required"
    },
    {
      name: "missing app preview URL",
      env: { ...baseEnv, STUDIO_LAS_E2E_URL: "" },
      expectedCode: "BLOCKED: wrong app preview URL: isolated local preview origin required",
      expectedFragment: "isolated local preview origin required"
    },
    {
      name: "non-synthetic trainer email",
      env: { ...baseEnv, STUDIO_LAS_QA_EMAIL: "trenermedycznywarszawa@gmail.com" },
      expectedCode: "BLOCKED: non-synthetic QA account: allowlisted .example.test QA trainer email required",
      expectedFragment: "allowlisted .example.test QA trainer email required"
    },
    {
      name: "wrong QA client ID",
      env: { ...baseEnv, STUDIO_LAS_QA_CLIENT_ID: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1" },
      expectedCode: "BLOCKED: non-synthetic QA client: client ID does not match isolated synthetic QA client",
      expectedFragment: "does not match isolated synthetic QA client"
    },
    {
      name: "empty run marker",
      env: { ...baseEnv, STUDIO_LAS_E2E_MARKER: "" },
      expectedCode: "BLOCKED: isolation/cleanup unverified",
      expectedFragment: "explicit ATTENTION-<run>-<attempt> marker required"
    },
    {
      name: "ambiguous run marker",
      env: { ...baseEnv, STUDIO_LAS_E2E_MARKER: "test" },
      expectedCode: "BLOCKED: isolation/cleanup unverified",
      expectedFragment: "explicit ATTENTION-<run>-<attempt> marker required"
    },
    {
      name: "legacy PWD marker instead of ATTENTION marker",
      env: { ...baseEnv, STUDIO_LAS_E2E_MARKER: "E2E-GHA-12345678" },
      expectedCode: "BLOCKED: isolation/cleanup unverified",
      expectedFragment: "explicit ATTENTION-<run>-<attempt> marker required"
    },
    {
      name: "missing isolation verification",
      env: { ...baseEnv, STUDIO_LAS_E2E_ISOLATION_VERIFIED: "false" },
      expectedCode: "BLOCKED: isolation/cleanup unverified",
      expectedFragment: "isolated disposable environment not verified"
    },
    {
      name: "wrong isolation mode",
      env: { ...baseEnv, STUDIO_LAS_E2E_ISOLATION_MODE: "shared-staging" },
      expectedCode: "BLOCKED: isolation/cleanup unverified",
      expectedFragment: "isolated disposable environment not verified"
    },
    {
      name: "missing cleanup proof",
      env: { ...baseEnv, STUDIO_LAS_E2E_CLEANUP_VERIFIED: "" },
      expectedCode: "BLOCKED: isolation/cleanup unverified",
      expectedFragment: "cleanup and recovery strategy not verified"
    },
    {
      name: "interrupted execution flag",
      env: { ...baseEnv, STUDIO_LAS_E2E_INTERRUPTED: "true" },
      expectedCode: "BLOCKED: interrupted execution: prior or active run reported interrupted/unrecovered state",
      expectedFragment: "interrupted/unrecovered state"
    },
    {
      name: "aborted execution flag",
      env: { ...baseEnv, STUDIO_LAS_E2E_ABORTED: "true" },
      expectedCode: "BLOCKED: interrupted execution: prior or active run reported interrupted/unrecovered state",
      expectedFragment: "interrupted/unrecovered state"
    },
    {
      name: "dirty prior state flag",
      env: { ...baseEnv, STUDIO_LAS_E2E_PRIOR_STATE: "dirty" },
      expectedCode: "BLOCKED: interrupted execution: prior or active run reported interrupted/unrecovered state",
      expectedFragment: "interrupted/unrecovered state"
    }
  ];

  for (const testCase of blockedCases) {
    const verdict = evaluateE2eSafetyGate(testCase.env, { repoRoot: negFixture.dir });
    assert.equal(verdict.allowed, false, `${testCase.name} must be blocked`);
    assert.equal(verdict.status, "BLOCKED", `${testCase.name} status`);
    assert.equal(verdict.code, testCase.expectedCode, `${testCase.name} code`);
    assert.ok(verdict.reason.includes(testCase.expectedFragment), `${testCase.name} reason: ${verdict.reason}`);
  }
} finally {
  rmSync(negFixture.dir, { recursive: true, force: true });
}

// 4. Cleanup plan invariants: block destructive, privileged, unscoped, or immutable-table operations.
assert.equal(assertSafeCleanupPlan(validCleanupPlan()), true);

const unsafeCleanupPlans = [
  { name: "null plan", plan: null, fragment: "cleanup plan object is required" },
  { name: "canonical production target", plan: validCleanupPlan({ targetProjectRef: CANONICAL_PRODUCTION_REF }), fragment: "canonical production or shared staging" },
  { name: "canonical shared staging target", plan: validCleanupPlan({ targetProjectRef: CANONICAL_STAGING_REF }), fragment: "canonical production or shared staging" },
  { name: "non-isolated scope", plan: validCleanupPlan({ scope: "shared_staging" }), fragment: "isolated_disposable_environment scope" },
  { name: "uses service_role flag", plan: validCleanupPlan({ usesServiceRole: true }), fragment: "service_role" },
  { name: "bypasses RLS/triggers flag", plan: validCleanupPlan({ bypassesRlsOrTriggers: true }), fragment: "RLS/triggers" },
  { name: "targets foreign clients flag", plan: validCleanupPlan({ targetsForeignClients: true }), fragment: "foreign clients" },
  { name: "targets historical records flag", plan: validCleanupPlan({ targetsHistoricalRecords: true }), fragment: "historical records" },
  { name: "deletes approved reports flag", plan: validCleanupPlan({ deletesApprovedReports: true }), fragment: "approved or published reports" },
  { name: "deletes audit events flag", plan: validCleanupPlan({ deletesAuditEvents: true }), fragment: "audit events" },
  { name: "multiple client IDs", plan: validCleanupPlan({ clientIds: [SYNTHETIC_QA_CLIENT_ID, "aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1"] }), fragment: "single synthetic QA client" },
  { name: "ambiguous marker", plan: validCleanupPlan({ marker: "bad" }), fragment: "unambiguous run marker" },
  { name: "global unscoped DELETE SQL", plan: validCleanupPlan({ sql: "DELETE FROM public.home_plans;" }), fragment: "unscoped global DELETE forbidden" },
  { name: "TRUNCATE SQL", plan: validCleanupPlan({ sql: "TRUNCATE TABLE public.sessions;" }), fragment: "TRUNCATE forbidden" },
  { name: "DISABLE TRIGGER SQL", plan: validCleanupPlan({ sql: "ALTER TABLE public.reports DISABLE TRIGGER ALL;" }), fragment: "DISABLE TRIGGER forbidden" },
  { name: "session_replication_role bypass", plan: validCleanupPlan({ sql: "SET session_replication_role = replica;" }), fragment: "session_replication_role forbidden" },
  { name: "RLS alteration SQL", plan: validCleanupPlan({ sql: "ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;" }), fragment: "RLS modification forbidden" },
  { name: "service_role token in actions", plan: validCleanupPlan({ actions: ["use SUPABASE_SERVICE_ROLE key"] }), fragment: "service_role forbidden" },
  { name: "foreign seeded client UUID in SQL", plan: validCleanupPlan({ sql: "DELETE FROM public.sessions WHERE client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';" }), fragment: "foreign client aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1" }
];

for (const testCase of unsafeCleanupPlans) {
  assert.throws(
    () => assertSafeCleanupPlan(testCase.plan),
    err => err instanceof Error && err.message.startsWith("BLOCKED:") && err.message.includes(testCase.fragment),
    `${testCase.name} must throw BLOCKED`
  );
}

// 5. QA mutation inventory coverage check.
assert.equal(QA_MUTATION_INVENTORY.qaClientId, SYNTHETIC_QA_CLIENT_ID);
assert.equal(QA_MUTATION_INVENTORY.scripts.length, 6);
assert.deepEqual([...QA_MUTATION_INVENTORY.scripts], [
  "scripts/e2e_mfa_bootstrap.mjs",
  "scripts/e2e_trainer_attention_flow.mjs",
  "scripts/e2e_client_contact_requests.mjs",
  "scripts/e2e_questionnaire_assignment.mjs",
  "scripts/e2e_pwd_first_guidance.mjs",
  "scripts/e2e_process_report.mjs"
]);
const inventoriedTables = new Set(QA_MUTATION_INVENTORY.entities.map(entity => entity.table));
for (const table of [
  "auth.mfa_factors",
  "public.home_plans",
  "public.home_plan_items",
  "public.guidance_events",
  "public.sessions",
  "public.trainer_signal_reviews",
  "public.questionnaire_assignments",
  "public.questionnaire_responses",
  "public.body_measurements",
  "public.reports",
  "public.audit_events"
]) {
  assert.ok(inventoriedTables.has(table), `Inventory must cover ${table}`);
}

// 6. GitHub Actions CI step behavior: must exit 1 (NOT green/passing!), emit ::error annotation, and write summary.
const tmpDir = mkdtempSync(path.join(tmpdir(), "e2e-safety-gate-"));
try {
  const githubOutputFile = path.join(tmpDir, "github_output.txt");
  const githubSummaryFile = path.join(tmpDir, "github_summary.md");
  const ciGateRun = spawnSync(
    process.execPath,
    ["scripts/e2e_safety_gate.mjs", "--github-output", "--github-summary"],
    {
      cwd: repoRoot,
      env: {
        PATH: process.env.PATH,
        GITHUB_ACTIONS: "true",
        STUDIO_LAS_E2E_PROJECT_REF: CANONICAL_STAGING_REF,
        STUDIO_LAS_E2E_SUPABASE_URL: `https://${CANONICAL_STAGING_REF}.supabase.co`,
        STUDIO_LAS_E2E_URL: "http://127.0.0.1:8790/",
        STUDIO_LAS_QA_EMAIL: ALLOWED_SYNTHETIC_QA_EMAILS[0],
        STUDIO_LAS_E2E_MARKER: "ATTENTION-123456789-1",
        GITHUB_OUTPUT: githubOutputFile,
        GITHUB_STEP_SUMMARY: githubSummaryFile
      },
      encoding: "utf8"
    }
  );
  assert.equal(ciGateRun.status, 1, `GitHub Actions gate must fail (exit 1), got ${ciGateRun.status}: ${ciGateRun.stderr}`);
  assert.ok(ciGateRun.stderr.includes("::error title=BLOCKED: isolation/cleanup unverified::"), ciGateRun.stderr);
  const outputText = readFileSync(githubOutputFile, "utf8");
  assert.ok(outputText.includes("allowed=false\n"));
  assert.ok(outputText.includes("status=BLOCKED\n"));
  assert.ok(outputText.includes("code=BLOCKED: isolation/cleanup unverified\n"));
  const summaryText = readFileSync(githubSummaryFile, "utf8");
  assert.ok(summaryText.includes("BLOCKED: isolation/cleanup unverified"));
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

// Verify workflow structure: local-regressions is independent; staging-browser-e2e enforces gate without --report-only.
const workflowText = readFileSync(path.join(repoRoot, ".github", "workflows", "trainer-attention-production.yml"), "utf8");
assert.ok(!workflowText.includes("--report-only"), "Workflow must not mask BLOCKED status with exit-0 --report-only");
assert.ok(workflowText.includes("local-regressions:"), "Workflow must keep independent local-regressions job");
assert.ok(workflowText.includes("staging-browser-e2e:"), "Workflow must define staging-browser-e2e job");
assert.ok(workflowText.includes("node scripts/e2e_safety_gate.mjs --github-output --github-summary"));
assert.ok(workflowText.includes("steps.gate.outputs.allowed == 'true' && github.event_name == 'workflow_dispatch'"));

// 7. All mutating browser E2E scripts must refuse immediately (exit 1, BLOCKED:) even if VERIFIED flags are set.
for (const scriptPath of [
  "scripts/e2e_trainer_attention_flow.mjs",
  "scripts/e2e_client_contact_requests.mjs",
  "scripts/e2e_questionnaire_assignment.mjs",
  "scripts/e2e_pwd_first_guidance.mjs",
  "scripts/e2e_process_report.mjs"
]) {
  const blockedSpawn = spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    env: {
      PATH: process.env.PATH,
      ...spoofedEnvOnRealRepo,
      STUDIO_LAS_E2E_ARTIFACT_DIR: path.join(tmpdir(), "should-not-launch")
    },
    encoding: "utf8"
  });
  assert.equal(blockedSpawn.status, 1, `${scriptPath} should fail closed with exit 1`);
  assert.ok(
    blockedSpawn.stderr.includes("BLOCKED: isolation/cleanup unverified"),
    `${scriptPath} stderr should include BLOCKED: isolation/cleanup unverified, got: ${blockedSpawn.stderr}`
  );
}

// 8. Helper guards must block mutating api() calls and login() even if VERIFIED flags are spoofed on real repo.
const { api, login } = await import("./attention_e2e_helpers.mjs");
const origFetch = globalThis.fetch;
const savedEnv = { ...process.env };
let fetchCount = 0;
globalThis.fetch = async () => {
  fetchCount += 1;
  throw new Error("Unexpected network fetch during blocked helper call");
};
Object.assign(process.env, spoofedEnvOnRealRepo);
try {
  await assert.rejects(
    () => api("/rest/v1/sessions", "synthetic-token", "POST", { client_id: SYNTHETIC_QA_CLIENT_ID }),
    err => err instanceof Error && err.message.startsWith("BLOCKED: isolation/cleanup unverified")
  );
  await assert.rejects(
    () => login({ goto: async () => { throw new Error("Unexpected page.goto"); } }, ALLOWED_SYNTHETIC_QA_EMAILS[0], "pw", true),
    err => err instanceof Error && err.message.startsWith("BLOCKED: isolation/cleanup unverified")
  );
  assert.equal(fetchCount, 0, "Blocked helper calls must never call fetch");
} finally {
  globalThis.fetch = origFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) delete process.env[key];
  }
  Object.assign(process.env, savedEnv);
}

console.log("test_e2e_safety_gate.mjs PASS (anti-bypass VERIFIED + codebase pin checks, CI BLOCKED status, cleanup invariants, helpers, and 5 mutating scripts verified)");
