#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const STORAGE_KEYS = {
  os: "studioLasOS_v3",
  exerciseLibrary: "studioLasExerciseLibraryV1",
  guidance: "studioLasGuidance_v1",
  guidancePilot: "studioLasGuidancePilot_v1"
};

const KNOWN_STORAGE_KEYS = new Set([
  STORAGE_KEYS.os,
  STORAGE_KEYS.exerciseLibrary,
  STORAGE_KEYS.guidance,
  STORAGE_KEYS.guidancePilot,
  "studioLasOS_v1"
]);

const TARGET_TABLES = [
  "clients",
  "client_intakes",
  "sessions",
  "pre_session_checks",
  "post_session_observations",
  "client_tasks",
  "body_measurements",
  "training_load_observations",
  "assessment_results",
  "exercises",
  "home_plans",
  "home_plan_items",
  "guidance_events",
  "guidance_pilots",
  "guidance_pilot_feedback",
  "reports",
  "client_documents",
  "legacy_import_batches",
  "legacy_import_records"
];

const CLIENT_FIELDS = new Set([
  "id",
  "name",
  "contact",
  "email",
  "phone",
  "clientAccessCode",
  "clientAccessUpdatedAt",
  "startDate",
  "nextSessionDate",
  "nextReviewDate",
  "motivation",
  "fears",
  "contraindications",
  "redFlags",
  "redFlagsText",
  "package",
  "stage",
  "stageRaw",
  "healthStatus",
  "neuroType",
  "neuroProfile",
  "communicationProfile",
  "goal",
  "nextMilestone",
  "decisionLogic",
  "workingHypothesis",
  "tasks",
  "checkins",
  "documents",
  "measurements",
  "polarSessions",
  "reports",
  "preSessionChecks",
  "postSessionNotes",
  "testResults",
  "intake",
  "homePlan",
  "sessions",
  "status",
  "createdAt",
  "updatedAt"
]);

const TECHNICAL_KEY_PATTERNS = [
  /^studioLasClientPanelUnlocked_/,
  /seed/i,
  /version/i
];

const MEDICAL_FIELD_HINTS = [
  /contra/i,
  /diagnos/i,
  /flags?$/i,
  /health/i,
  /medical/i,
  /pain/i,
  /redflags?/i,
  /risk/i,
  /symptoms?/i,
  /trainernotes?/i
];

const APPLY_TABLES_V1 = new Set([
  "clients",
  "client_intakes",
  "sessions",
  "pre_session_checks",
  "client_tasks",
  "body_measurements",
  "assessment_results",
  "exercises",
  "home_plans",
  "home_plan_items",
  "reports"
]);

const TABLES_WITH_DELETED_AT = new Set([
  "clients",
  "client_intakes",
  "sessions",
  "pre_session_checks",
  "post_session_observations",
  "client_tasks",
  "client_documents",
  "body_measurements",
  "training_load_observations",
  "assessment_results",
  "exercises",
  "home_plans",
  "home_plan_items",
  "guidance_events",
  "guidance_pilots",
  "guidance_pilot_feedback",
  "reports"
]);

const ASSESSMENT_QUALITIES = new Set(["dobrze tolerowane", "ograniczone", "do obserwacji", "przerwać i skonsultować"]);
const ASSESSMENT_DECISIONS = new Set(["obserwuj", "utrzymaj", "regresuj", "progresuj ostrożnie", "skonsultuj"]);
const PROCESS_DECISIONS = new Set(["zwiększ", "utrzymaj", "zmniejsz", "regeneracyjnie", "obserwuj"]);
const REPORT_TYPES = new Set(["startMap", "fourWeeks", "twelveWeeks", "continuation"]);
const EXERCISE_QUALITY_STATUSES = new Set(["reviewed", "needs_review", "draft"]);

const REPORT_SHAPE = {
  summary: {},
  targetCounts: Object.fromEntries(TARGET_TABLES.map((table) => [table, 0])),
  sourceCounts: {},
  needsReview: [],
  warnings: [],
  errors: [],
  skipped: [],
  idempotencyKeys: [],
  mappingPreview: []
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.inputPath) {
    printUsage(args.help ? 0 : 1);
    return;
  }

  const inputPath = path.resolve(args.inputPath);
  const outPath = args.outPath
    ? path.resolve(args.outPath)
    : defaultOutputPath(inputPath);

  const report = createReport(inputPath, outPath);

  let input;
  let sources = {};
  try {
    input = readJsonFile(inputPath);
    sources = parseExport(input, report);
    analyzeSources(sources, report);
  } catch (error) {
    addError(report, "$", "fatal_error", error.message, true);
  }

  updateReportSummary(report);

  if (args.apply) {
    await runApplyMode({ args, sources, report, inputPath });
  }

  finalizeReport(report);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  printConsoleSummary(report);

  if (report.errors.some((error) => error.fatal)) {
    process.exitCode = 1;
  }
}

function parseArgs(argv) {
  const args = {
    inputPath: "",
    outPath: "",
    help: false,
    apply: false,
    confirmTestDb: false,
    confirmProjectRef: "",
    trainerProfileId: "",
    sourceAppVersion: "OS 8.0 localStorage",
    backupJsonPath: ""
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--out") {
      args.outPath = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--apply") {
      args.apply = true;
    } else if (arg === "--confirm-test-db") {
      args.confirmTestDb = true;
    } else if (arg === "--confirm-project-ref") {
      args.confirmProjectRef = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--trainer-profile-id") {
      args.trainerProfileId = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--source-app-version") {
      args.sourceAppVersion = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--backup-json-path") {
      args.backupJsonPath = argv[index + 1] || "";
      index += 1;
    } else if (!args.inputPath) {
      args.inputPath = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printUsage(exitCode) {
  const usage = [
    "Studio Las OS 9.0 localStorage importer",
    "",
    "Usage:",
    "  node supabase/importer/dry_run_importer.mjs path/to/export.json",
    "  node supabase/importer/dry_run_importer.mjs path/to/export.json --out path/to/report.json",
    "  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/importer/dry_run_importer.mjs path/to/export.json --apply --confirm-test-db --confirm-project-ref <project-ref> --trainer-profile-id <profile-uuid>",
    "",
    "Default mode is dry-run. Apply-mode is test database only and requires explicit safety flags."
  ].join("\n");
  console.log(usage);
  process.exitCode = exitCode;
}

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function defaultOutputPath(inputPath) {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.dry-run-report.json`);
}

function safeDisplayPath(filePath) {
  return path.basename(filePath || "");
}

function createReport(inputPath, outPath) {
  const report = JSON.parse(JSON.stringify(REPORT_SHAPE));
  report.summary = {
    dryRunOnly: true,
    supabaseConnection: "not_used",
    databaseWrites: false,
    serviceRole: "not_used",
    inputFile: safeDisplayPath(inputPath),
    outputFile: safeDisplayPath(outPath),
    generatedAt: new Date().toISOString()
  };
  report._seenIssues = new Set();
  report._auditPaths = new Set();
  return report;
}

function parseExport(input, report) {
  if (!isPlainObject(input)) {
    addError(report, "$", "invalid_root", "Input JSON must be an object.", true);
    return {};
  }

  const rootLooksLikeState = Array.isArray(input.clients);
  const storageKeys = Object.keys(input);

  const sources = {
    state: rootLooksLikeState ? input : parseStorageValue(input[STORAGE_KEYS.os], STORAGE_KEYS.os, report),
    exercises: parseStorageValue(input[STORAGE_KEYS.exerciseLibrary], STORAGE_KEYS.exerciseLibrary, report),
    guidance: parseStorageValue(input[STORAGE_KEYS.guidance], STORAGE_KEYS.guidance, report),
    guidancePilot: parseStorageValue(input[STORAGE_KEYS.guidancePilot], STORAGE_KEYS.guidancePilot, report),
    storageKeys
  };

  if (!rootLooksLikeState) {
    for (const [keyIndex, key] of storageKeys.entries()) {
      if (KNOWN_STORAGE_KEYS.has(key)) continue;
      if (TECHNICAL_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        addSkipped(report, `technicalStorageKey[${keyIndex}]`, "technical_storage_key", "Technical localStorage key ignored by importer V1.");
      } else {
        addSkipped(report, `unknownStorageKey[${keyIndex}]`, "unknown_storage_key", "Unknown localStorage key ignored by dry-run.");
      }
    }
  }

  if (input.studioLasOS_v1) {
    addSkipped(report, "studioLasOS_v1", "legacy_v1_key", "Importer V1 expects OS 8.0 data migrated to studioLasOS_v3.");
  }

  return sources;
}

function parseStorageValue(value, key, report) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    addError(report, key, "parse_error", `Could not parse JSON stored in ${key}: ${error.message}`, key === STORAGE_KEYS.os);
    return undefined;
  }
}

function analyzeSources(sources, report) {
  const state = sources.state;
  if (!isPlainObject(state) || !Array.isArray(state.clients)) {
    addError(report, STORAGE_KEYS.os, "missing_clients", "studioLasOS_v3 must contain clients[].", true);
    return;
  }

  report.targetCounts.legacy_import_batches = 1;
  recordAudit(report, STORAGE_KEYS.os);

  const clients = state.clients;
  const clientLegacyIds = new Set();
  const duplicateClientIds = duplicateIds(clients);
  for (const id of duplicateClientIds) {
    addWarning(report, "studioLasOS_v3.clients", "duplicate_client_legacy_id", "Duplicate client legacy_id detected.", "high");
  }

  report.sourceCounts.clients = clients.length;
  report.sourceCounts.technicalStorageKeys = (sources.storageKeys || []).filter((key) => TECHNICAL_KEY_PATTERNS.some((pattern) => pattern.test(key))).length;
  report.sourceCounts.unknownStorageKeys = (sources.storageKeys || []).filter((key) => !KNOWN_STORAGE_KEYS.has(key) && !TECHNICAL_KEY_PATTERNS.some((pattern) => pattern.test(key))).length;

  clients.forEach((client, clientIndex) => {
    const sourcePath = `studioLasOS_v3.clients[${clientIndex}]`;
    const clientLegacyId = stableString(client?.id) || sourcePath;
    clientLegacyIds.add(clientLegacyId);
    analyzeClient(client, clientIndex, report);
  });

  analyzeExerciseLibrary(sources.exercises, report);
  analyzeGuidance(sources.guidance, clientLegacyIds, report);
  analyzeGuidancePilot(sources.guidancePilot, clientLegacyIds, report);
}

function analyzeClient(client, clientIndex, report) {
  const sourcePath = `studioLasOS_v3.clients[${clientIndex}]`;
  if (!isPlainObject(client)) {
    addSkipped(report, sourcePath, "invalid_client", "Client entry is not an object.");
    return;
  }

  const clientLegacyId = stableString(client.id);
  const idempotency = addIdempotency(report, "clients", sourcePath, "", clientLegacyId, sourcePath);
  report.targetCounts.clients += 1;
  recordAudit(report, sourcePath);
  addMapping(report, sourcePath, "clients", idempotency, "would upsert client by owner_trainer_id + legacy_id");

  if (!nonEmptyString(client.name)) {
    addNeedsReview(report, `${sourcePath}.name`, "clients", "missing_required_name", "Client has no name; clients.name is required.", "high");
  }

  if (client.clientAccessCode) {
    addWarning(report, `${sourcePath}.clientAccessCode`, "plaintext_client_access_code", "Plaintext clientAccessCode found. Dry-run will not include the value in raw payload.", "high");
    addNeedsReview(report, `${sourcePath}.clientAccessCode`, "client_access_credentials", "plaintext_client_access_code", "Needs approved hashing strategy or replacement by future Auth.", "high");
  }

  if (nonEmptyString(client.stageRaw)) {
    addNeedsReview(report, `${sourcePath}.stageRaw`, "clients", "stage_raw_present", "stageRaw should be preserved but not trusted as primary stage.", "medium");
  }

  if (nonEmptyString(client.neuroProfile)) {
    addNeedsReview(report, `${sourcePath}.neuroProfile`, "clients", "legacy_neuro_profile", "neuroProfile maps only after communication/working hypothesis decision.", "medium");
  }

  validateStage(client.stage, `${sourcePath}.stage`, report);
  validateDateField(client.startDate, `${sourcePath}.startDate`, "clients", "start_date", false, report);
  validateDateField(client.nextSessionDate, `${sourcePath}.nextSessionDate`, "clients", "next_session_date", false, report);
  validateDateField(client.nextReviewDate, `${sourcePath}.nextReviewDate`, "clients", "next_review_date", false, report);

  checkEmptyStrings(client, sourcePath, "clients", [
    "contact",
    "email",
    "phone",
    "motivation",
    "fears",
    "contraindications",
    "redFlags",
    "healthStatus",
    "neuroType",
    "goal",
    "nextMilestone",
    "decisionLogic"
  ], report);

  checkUnknownClientFields(client, sourcePath, report);
  warnSensitiveClientFields(client, sourcePath, report);
  detectChildDuplicates(client, sourcePath, report);

  analyzeIntake(client.intake, sourcePath, report);
  analyzeSessions(arrayOrEmpty(client.sessions), sourcePath, clientLegacyId || sourcePath, report);
  analyzePreSessionChecks(arrayOrEmpty(client.preSessionChecks), sourcePath, clientLegacyId || sourcePath, report);
  analyzePostSessionNotes(arrayOrEmpty(client.postSessionNotes), sourcePath, clientLegacyId || sourcePath, report);
  analyzeClientTasks(arrayOrEmpty(client.tasks), sourcePath, clientLegacyId || sourcePath, report);
  analyzeBodyMeasurements(arrayOrEmpty(client.measurements), sourcePath, clientLegacyId || sourcePath, report);
  analyzePolarSessions(arrayOrEmpty(client.polarSessions), sourcePath, clientLegacyId || sourcePath, report);
  analyzeAssessmentResults(arrayOrEmpty(client.testResults), sourcePath, clientLegacyId || sourcePath, report);
  analyzeHomePlan(client.homePlan, sourcePath, clientLegacyId || sourcePath, report);
  analyzeReports(arrayOrEmpty(client.reports), sourcePath, clientLegacyId || sourcePath, report);
  analyzeClientDocuments(arrayOrEmpty(client.documents), sourcePath, report);
  analyzeCheckins(arrayOrEmpty(client.checkins), sourcePath, report);
}

function analyzeIntake(intake, clientPath, report) {
  if (!isPlainObject(intake) || !hasMeaningfulValue(intake)) return;

  const sourcePath = `${clientPath}.intake`;
  const idempotency = addIdempotency(report, "client_intakes", sourcePath, clientPath, stableString(intake.id), sourcePath);
  report.sourceCounts.clientIntakes = (report.sourceCounts.clientIntakes || 0) + 1;
  report.targetCounts.client_intakes += 1;
  recordAudit(report, sourcePath);
  addMapping(report, sourcePath, "client_intakes", idempotency, "would import raw intake as trainer-only data");

  validateDateField(intake.importedAt, `${sourcePath}.importedAt`, "client_intakes", "imported_at", false, report);
  if (intake.riskLevel && !["low", "medium", "high"].includes(String(intake.riskLevel))) {
    addNeedsReview(report, `${sourcePath}.riskLevel`, "client_intakes", "invalid_risk_level", "riskLevel must be low, medium, or high.", "medium");
  }
  warnSensitiveObject(intake, sourcePath, "client_intakes", report);
}

function analyzeSessions(sessions, clientPath, clientLegacyId, report) {
  report.sourceCounts.sessions = (report.sourceCounts.sessions || 0) + sessions.length;
  sessions.forEach((session, index) => {
    const sourcePath = `${clientPath}.sessions[${index}]`;
    if (!isPlainObject(session)) return addSkipped(report, sourcePath, "invalid_session", "Session entry is not an object.");

    const idempotency = addIdempotency(report, "sessions", sourcePath, clientLegacyId, stableString(session.id), sourcePath);
    report.targetCounts.sessions += 1;
    recordAudit(report, sourcePath);
    addMapping(report, sourcePath, "sessions", idempotency, "would import session process data");

    validateDateField(session.date, `${sourcePath}.date`, "sessions", "date", true, report);
    checkNumberField(session.readiness, `${sourcePath}.readiness`, "sessions", "readiness", report);
    checkNumberField(session.vasBefore, `${sourcePath}.vasBefore`, "sessions", "vas_before", report);
    checkNumberField(session.vasAfter, `${sourcePath}.vasAfter`, "sessions", "vas_after", report);
    checkNumberField(session.mobilityIndex, `${sourcePath}.mobilityIndex`, "sessions", "mobility_index", report);

    if (session.energy !== undefined) {
      addNeedsReview(report, `${sourcePath}.energy`, "sessions", "legacy_energy_field", "Legacy session energy should map only after trainer review.", "medium");
    }
    if (session.sleep !== undefined) {
      addNeedsReview(report, `${sourcePath}.sleep`, "sessions", "legacy_sleep_field", "Legacy session sleep should map to sleep_quality only after review.", "medium");
    }
  });
}

function analyzePreSessionChecks(checks, clientPath, clientLegacyId, report) {
  report.sourceCounts.preSessionChecks = (report.sourceCounts.preSessionChecks || 0) + checks.length;
  checks.forEach((check, index) => {
    const sourcePath = `${clientPath}.preSessionChecks[${index}]`;
    if (!isPlainObject(check)) return addSkipped(report, sourcePath, "invalid_pre_session_check", "Pre-session check is not an object.");

    const idempotency = addIdempotency(report, "pre_session_checks", sourcePath, clientLegacyId, stableString(check.id), sourcePath);
    report.targetCounts.pre_session_checks += 1;
    recordAudit(report, sourcePath);
    addMapping(report, sourcePath, "pre_session_checks", idempotency, "would import trainer-only pre-session check");
    validateDateField(check.date, `${sourcePath}.date`, "pre_session_checks", "check_date", true, report);
  });
}

function analyzePostSessionNotes(notes, clientPath, clientLegacyId, report) {
  report.sourceCounts.postSessionNotes = (report.sourceCounts.postSessionNotes || 0) + notes.length;
  notes.forEach((note, index) => {
    const sourcePath = `${clientPath}.postSessionNotes[${index}]`;
    if (!isPlainObject(note)) return addSkipped(report, sourcePath, "invalid_post_session_note", "Post-session note is not an object.");

    const idempotency = addIdempotency(report, "post_session_observations", sourcePath, clientLegacyId, stableString(note.id), sourcePath);
    report.targetCounts.post_session_observations += 1;
    recordAudit(report, sourcePath);
    addMapping(report, sourcePath, "post_session_observations", idempotency, "would import post-session observation");
    validateDateField(note.date, `${sourcePath}.date`, "post_session_observations", "date", true, report);

    if (nonEmptyString(note.homeTask)) {
      addNeedsReview(report, `${sourcePath}.homeTask`, "client_tasks", "post_session_home_task_deduplication", "homeTask can become client_tasks only with source-path idempotency and duplicate checks.", "medium");
    }
  });
}

function analyzeClientTasks(tasks, clientPath, clientLegacyId, report) {
  report.sourceCounts.clientTasks = (report.sourceCounts.clientTasks || 0) + tasks.length;
  tasks.forEach((task, index) => {
    const sourcePath = `${clientPath}.tasks[${index}]`;
    if (!isPlainObject(task)) return addSkipped(report, sourcePath, "invalid_client_task", "Client task is not an object.");

    const idempotency = addIdempotency(report, "client_tasks", sourcePath, clientLegacyId, stableString(task.id), sourcePath, false);
    if (!nonEmptyString(task.text)) {
      addNeedsReview(report, `${sourcePath}.text`, "client_tasks", "missing_task_text", "client_tasks.text is required.", "medium");
    }
    report.targetCounts.client_tasks += 1;
    recordAudit(report, sourcePath);
    addMapping(report, sourcePath, "client_tasks", idempotency, "would import trainer-only client task");
  });
}

function analyzeBodyMeasurements(measurements, clientPath, clientLegacyId, report) {
  report.sourceCounts.bodyMeasurements = (report.sourceCounts.bodyMeasurements || 0) + measurements.length;
  measurements.forEach((measurement, index) => {
    const sourcePath = `${clientPath}.measurements[${index}]`;
    if (!isPlainObject(measurement)) return addSkipped(report, sourcePath, "invalid_body_measurement", "Measurement is not an object.");

    const idempotency = addIdempotency(report, "body_measurements", sourcePath, clientLegacyId, stableString(measurement.id), sourcePath);
    report.targetCounts.body_measurements += 1;
    recordAudit(report, sourcePath);
    addMapping(report, sourcePath, "body_measurements", idempotency, "would import Tanita/body measurement");

    validateDateField(measurement.date || measurement.measuredAt, `${sourcePath}.date`, "body_measurements", "measured_at", true, report);
    for (const [field, targetField] of [
      ["weightKg", "weight_kg"],
      ["fatPercent", "fat_percent"],
      ["fatMassKg", "fat_mass_kg"],
      ["fatFreeMassKg", "fat_free_mass_kg"],
      ["muscleMassKg", "muscle_mass_kg"],
      ["bodyWaterPercent", "body_water_percent"],
      ["bodyWaterKg", "body_water_kg"],
      ["visceralFatRating", "visceral_fat_rating"],
      ["bmrKcal", "bmr_kcal"],
      ["metabolicAge", "metabolic_age"],
      ["bmi", "bmi"],
      ["boneMassKg", "bone_mass_kg"],
      ["proteinKg", "protein_kg"]
    ]) {
      checkNumberField(measurement[field], `${sourcePath}.${field}`, "body_measurements", targetField, report);
    }

    if (measurement.sourceMode !== undefined) {
      addNeedsReview(report, `${sourcePath}.sourceMode`, "body_measurements", "legacy_source_mode", "sourceMode should be normalized into input_method or preserved in audit.", "low");
    }
    if (measurement.pdfAutoFilled !== undefined) {
      addNeedsReview(report, `${sourcePath}.pdfAutoFilled`, "body_measurements", "legacy_pdf_auto_filled", "pdfAutoFilled should be normalized into parse_status or preserved in audit.", "low");
    }
    if (nonEmptyString(measurement.pdfDataUrl)) {
      report.targetCounts.client_documents += 1;
      recordAudit(report, `${sourcePath}.pdfDataUrl`);
      addWarning(report, `${sourcePath}.pdfDataUrl`, "raw_pdf_data_url", "Tanita pdfDataUrl found. It must go to Storage, never SQL/raw_payload.", "high");
      addNeedsReview(report, `${sourcePath}.pdfDataUrl`, "client_documents", "tanita_pdf_storage_required", "PDF requires Storage upload flow; dry-run only reports it.", "high");
      addMapping(report, `${sourcePath}.pdfDataUrl`, "client_documents", {
        keyType: "storage_path",
        key: `clients/{client_id}/tanita/${stableString(measurement.id) || "hash"}.pdf`,
        stable: Boolean(stableString(measurement.id)),
        fallbackUsed: !stableString(measurement.id)
      }, "would create trainer-only Tanita PDF document after Storage upload");
    }
  });
}

function analyzePolarSessions(polarSessions, clientPath, clientLegacyId, report) {
  report.sourceCounts.polarSessions = (report.sourceCounts.polarSessions || 0) + polarSessions.length;
  polarSessions.forEach((polar, index) => {
    const sourcePath = `${clientPath}.polarSessions[${index}]`;
    if (!isPlainObject(polar)) return addSkipped(report, sourcePath, "invalid_polar_session", "Polar session is not an object.");

    const idempotency = addIdempotency(report, "training_load_observations", sourcePath, clientLegacyId, stableString(polar.id), sourcePath);
    report.targetCounts.training_load_observations += 1;
    recordAudit(report, sourcePath);
    addMapping(report, sourcePath, "training_load_observations", idempotency, "would import Polar/training load observation");

    validateDateField(polar.date || polar.observedAt, `${sourcePath}.date`, "training_load_observations", "observed_at", true, report);
    for (const [field, targetField] of [
      ["durationMin", "duration_min"],
      ["avgHr", "hr_avg"],
      ["hrAvg", "hr_avg"],
      ["maxHr", "hr_max"],
      ["hrMax", "hr_max"],
      ["zoneLightMin", "zone_light_min"],
      ["zoneModerateMin", "zone_moderate_min"],
      ["zoneHighMin", "zone_high_min"],
      ["rpe", "rpe"]
    ]) {
      checkNumberField(polar[field], `${sourcePath}.${field}`, "training_load_observations", targetField, report);
    }

    for (const field of ["vasBefore", "vasAfter", "readiness", "sleepQuality"]) {
      if (polar[field] !== undefined && polar[field] !== "") {
        addNeedsReview(report, `${sourcePath}.${field}`, "sessions", "legacy_polar_session_field", "Polar legacy VAS/readiness/sleep belongs in sessions/checks only when safely matched.", "medium");
      }
    }
  });
}

function analyzeAssessmentResults(results, clientPath, clientLegacyId, report) {
  report.sourceCounts.assessmentResults = (report.sourceCounts.assessmentResults || 0) + results.length;
  results.forEach((result, index) => {
    const sourcePath = `${clientPath}.testResults[${index}]`;
    if (!isPlainObject(result)) return addSkipped(report, sourcePath, "invalid_assessment_result", "Assessment result is not an object.");

    const idempotency = addIdempotency(report, "assessment_results", sourcePath, clientLegacyId, stableString(result.id), sourcePath);
    report.targetCounts.assessment_results += 1;
    recordAudit(report, sourcePath);
    addMapping(report, sourcePath, "assessment_results", idempotency, "would import diagnostic/assessment result");

    validateDateField(result.date || result.performedAt, `${sourcePath}.date`, "assessment_results", "performed_at", true, report);
    checkNumberField(result.painBefore, `${sourcePath}.painBefore`, "assessment_results", "pain_before", report);
    checkNumberField(result.painAfter, `${sourcePath}.painAfter`, "assessment_results", "pain_after", report);

    for (const field of ["finding", "score", "pain", "decision"]) {
      if (result[field] !== undefined && result[field] !== "") {
        addNeedsReview(report, `${sourcePath}.${field}`, "assessment_results", "legacy_assessment_field", "Legacy assessment field should be normalized before apply-mode.", "medium");
      }
    }
  });
}

function analyzeHomePlan(homePlan, clientPath, clientLegacyId, report) {
  if (!isPlainObject(homePlan) || !hasMeaningfulHomePlan(homePlan)) return;

  const sourcePath = `${clientPath}.homePlan`;
  const idempotency = addIdempotency(report, "home_plans", sourcePath, clientLegacyId, stableString(homePlan.id), sourcePath);
  report.sourceCounts.homePlans = (report.sourceCounts.homePlans || 0) + 1;
  report.targetCounts.home_plans += 1;
  recordAudit(report, sourcePath);
  addMapping(report, sourcePath, "home_plans", idempotency, "would import one home plan for client");

  for (const field of ["frequency", "duration", "instructions"]) {
    if (nonEmptyString(homePlan[field])) {
      addNeedsReview(report, `${sourcePath}.${field}`, "home_plans", "home_plan_optional_text_review", "Review whether this field should be published or kept trainer-only.", "low");
    }
  }

  const items = arrayOrEmpty(homePlan.exercises);
  report.sourceCounts.homePlanItems = (report.sourceCounts.homePlanItems || 0) + items.length;
  items.forEach((item, index) => {
    const itemPath = `${sourcePath}.exercises[${index}]`;
    if (!isPlainObject(item)) return addSkipped(report, itemPath, "invalid_home_plan_item", "Home plan item is not an object.");

    const itemIdempotency = addIdempotency(report, "home_plan_items", itemPath, clientLegacyId, stableString(item.id), itemPath);
    report.targetCounts.home_plan_items += 1;
    recordAudit(report, itemPath);
    addMapping(report, itemPath, "home_plan_items", itemIdempotency, "would import home plan item; exercise_id may remain null");

    if (!nonEmptyString(item.name) && !nonEmptyString(item.exerciseId)) {
      addNeedsReview(report, `${itemPath}.name`, "home_plan_items", "missing_home_plan_item_name", "Home plan item needs name or exerciseId.", "medium");
    }
  });
}

function analyzeReports(reports, clientPath, clientLegacyId, report) {
  report.sourceCounts.reports = (report.sourceCounts.reports || 0) + reports.length;
  reports.forEach((reportRow, index) => {
    const sourcePath = `${clientPath}.reports[${index}]`;
    if (!isPlainObject(reportRow)) return addSkipped(report, sourcePath, "invalid_report", "Report is not an object.");

    const idempotency = addIdempotency(report, "reports", sourcePath, clientLegacyId, stableString(reportRow.id), sourcePath);
    report.targetCounts.reports += 1;
    recordAudit(report, sourcePath);
    addMapping(report, sourcePath, "reports", idempotency, "would import report as trainer/draft unless publish rule is approved");

    validateDateField(reportRow.date, `${sourcePath}.date`, "reports", "legacy_report_date", false, report);
    if (!nonEmptyString(reportRow.audience)) {
      addNeedsReview(report, `${sourcePath}.audience`, "reports", "report_without_audience", "OS 8.0 reports do not reliably store audience; default should be trainer/draft.", "medium");
    }
  });
}

function analyzeClientDocuments(documents, clientPath, report) {
  report.sourceCounts.clientDocuments = (report.sourceCounts.clientDocuments || 0) + documents.length;
  documents.forEach((documentRow, index) => {
    const sourcePath = `${clientPath}.documents[${index}]`;
    recordAudit(report, sourcePath);
    addNeedsReview(report, sourcePath, "client_documents", "unstable_client_document_contract", "client.documents[] has no stable OS 8.0 contract; import only after review.", "medium");
    addSkipped(report, sourcePath, "unstable_document_contract", "Skipped in V1 unless it has a clear Storage-backed file contract.");

    if (isPlainObject(documentRow) && JSON.stringify(documentRow).includes("data:application/pdf")) {
      addWarning(report, sourcePath, "raw_document_data_url", "Raw data URL found in client.documents[]. Do not store it in SQL/raw_payload.", "high");
    }
  });
}

function analyzeCheckins(checkins, clientPath, report) {
  report.sourceCounts.checkins = (report.sourceCounts.checkins || 0) + checkins.length;
  checkins.forEach((checkin, index) => {
    const sourcePath = `${clientPath}.checkins[${index}]`;
    recordAudit(report, sourcePath);
    addNeedsReview(report, sourcePath, "guidance_events", "unstable_checkin_contract", "client.checkins[] has no stable OS 8.0 contract.", "medium");
    addSkipped(report, sourcePath, "unstable_checkin_contract", "Skipped in V1 unless safely classified as guidance_events.");
  });
}

function analyzeExerciseLibrary(exercises, report) {
  const items = arrayOrEmpty(exercises);
  report.sourceCounts.exercises = items.length;
  for (const duplicateId of duplicateIds(items)) {
    addWarning(report, STORAGE_KEYS.exerciseLibrary, "duplicate_exercise_legacy_id", "Duplicate exercise legacy_id detected.", "medium");
  }

  items.forEach((exercise, index) => {
    const sourcePath = `${STORAGE_KEYS.exerciseLibrary}[${index}]`;
    if (!isPlainObject(exercise)) return addSkipped(report, sourcePath, "invalid_exercise", "Exercise library item is not an object.");

    const idempotency = addIdempotency(report, "exercises", sourcePath, "", stableString(exercise.id), sourcePath);
    report.targetCounts.exercises += 1;
    recordAudit(report, sourcePath);
    addMapping(report, sourcePath, "exercises", idempotency, "would import trainer-owned exercise library row");
  });
}

function analyzeGuidance(guidance, clientLegacyIds, report) {
  if (!isPlainObject(guidance)) {
    report.sourceCounts.guidanceEvents = 0;
    return;
  }

  let eventCount = 0;
  for (const [clientIndex, [clientLegacyId, dates]] of Object.entries(guidance).entries()) {
    const clientPath = `${STORAGE_KEYS.guidance}.clientRef[${clientIndex}]`;
    if (!clientLegacyIds.has(clientLegacyId)) {
      addWarning(report, clientPath, "guidance_without_client", "Guidance state references a missing client.", "high");
      addSkipped(report, clientPath, "guidance_without_client", "Cannot map guidance_events without parent client.");
      continue;
    }
    if (!isPlainObject(dates)) continue;
    for (const [date, tasks] of Object.entries(dates)) {
      const datePath = `${clientPath}.${date}`;
      if (!isValidIsoDate(date)) {
        addNeedsReview(report, datePath, "guidance_events", "invalid_guidance_date", "Guidance event date is invalid.", "medium");
      }
      if (!isPlainObject(tasks)) continue;
      for (const [taskIndex, [, completed]] of Object.entries(tasks).entries()) {
        const sourcePath = `${datePath}.taskRef[${taskIndex}]`;
        if (completed !== true) {
          addSkipped(report, sourcePath, "guidance_not_completed", "Only completed daily guidance steps become guidance_events in V1.");
          continue;
        }
        eventCount += 1;
        const idempotency = addIdempotency(report, "guidance_events", sourcePath, clientLegacyId, "", sourcePath, false);
        report.targetCounts.guidance_events += 1;
        recordAudit(report, sourcePath);
        addMapping(report, sourcePath, "guidance_events", idempotency, "would import completed daily guidance step");
      }
    }
  }
  report.sourceCounts.guidanceEvents = eventCount;
}

function analyzeGuidancePilot(guidancePilot, clientLegacyIds, report) {
  if (!isPlainObject(guidancePilot)) {
    report.sourceCounts.guidancePilots = 0;
    report.sourceCounts.guidancePilotFeedback = 0;
    return;
  }

  let feedbackCount = 0;
  for (const [clientIndex, [clientLegacyId, pilot]] of Object.entries(guidancePilot).entries()) {
    const sourcePath = `${STORAGE_KEYS.guidancePilot}.clientRef[${clientIndex}]`;
    if (!clientLegacyIds.has(clientLegacyId)) {
      addWarning(report, sourcePath, "guidance_pilot_without_client", "Guidance pilot references a missing client.", "high");
      addSkipped(report, sourcePath, "guidance_pilot_without_client", "Cannot map guidance_pilots without parent client.");
      continue;
    }
    if (!isPlainObject(pilot)) continue;

    const idempotency = addIdempotency(report, "guidance_pilots", sourcePath, clientLegacyId, "", sourcePath, false);
    report.targetCounts.guidance_pilots += 1;
    recordAudit(report, sourcePath);
    addMapping(report, sourcePath, "guidance_pilots", idempotency, "would import client guidance pilot");

    const feedback = arrayOrEmpty(pilot.weeklyFeedback);
    feedback.forEach((row, index) => {
      const feedbackPath = `${sourcePath}.weeklyFeedback[${index}]`;
      feedbackCount += 1;
      const feedbackIdempotency = addIdempotency(report, "guidance_pilot_feedback", feedbackPath, clientLegacyId, stableString(row?.week), feedbackPath, false);
      report.targetCounts.guidance_pilot_feedback += 1;
      recordAudit(report, feedbackPath);
      addMapping(report, feedbackPath, "guidance_pilot_feedback", feedbackIdempotency, "would import guidance pilot weekly feedback");
    });
  }
  report.sourceCounts.guidancePilots = Object.keys(guidancePilot).length;
  report.sourceCounts.guidancePilotFeedback = feedbackCount;
}

async function runApplyMode({ args, sources, report, inputPath }) {
  report.apply = {
    mode: "test_database_apply_v1",
    startedAt: new Date().toISOString(),
    completedAt: null,
    safety: {
      confirmTestDb: args.confirmTestDb,
      confirmProjectRef: Boolean(args.confirmProjectRef),
      serviceRoleKeyLogged: false,
      storageUploads: false,
      frontendChanges: false
    },
    batchId: null,
    counts: {
      inserted: 0,
      updated: 0,
      skipped: 0,
      needsReview: 0,
      errors: 0,
      auditRecords: 0
    },
    perTable: {},
    skippedTables: {
      client_access_credentials: "plaintext access codes are never imported in V1",
      client_documents: "Storage upload is intentionally out of V1",
      training_load_observations: "import only when polarSessions exist and V1 scope is expanded",
      guidance_events: "import only when source count is non-zero and V1 scope is expanded",
      guidance_pilots: "import only when source count is non-zero and V1 scope is expanded",
      guidance_pilot_feedback: "import only when source count is non-zero and V1 scope is expanded",
      post_session_observations: "import only when source count is non-zero and V1 scope is expanded"
    }
  };

  const validation = validateApplyPreconditions(args, report);
  if (!validation.ok) {
    for (const message of validation.errors) {
      addError(report, "apply", "apply_precondition_failed", message, true);
    }
    report.apply.completedAt = new Date().toISOString();
    return;
  }

  const api = new SupabaseRest(validation.supabaseUrl, validation.serviceRoleKey);
  const ctx = createApplyContext({ api, args, report, inputPath });

  try {
    await assertTrainerProfile(ctx);
    const batch = await createImportBatch(ctx);
    ctx.batchId = batch.id;
    report.apply.batchId = batch.id;

    await applyExercises(ctx, sources.exercises);
    await applyClients(ctx, sources.state);

    await finishImportBatch(ctx, "completed");
  } catch (error) {
    report.apply.counts.errors += 1;
    addError(report, "apply", "apply_failed", sanitizeErrorMessage(error), true);
    if (ctx.batchId) {
      try {
        await finishImportBatch(ctx, "failed");
      } catch {
        // Keep the original failure as the relevant one; do not print remote details.
      }
    }
  } finally {
    report.apply.completedAt = new Date().toISOString();
    updateReportSummary(report);
  }
}

function validateApplyPreconditions(args, report) {
  const errors = [];
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!args.apply) errors.push("Apply flag is missing.");
  if (!args.confirmTestDb) errors.push("Missing --confirm-test-db. Apply-mode is test database only.");
  if (!args.confirmProjectRef) errors.push("Missing --confirm-project-ref <project-ref>.");
  if (!isUuid(args.trainerProfileId)) errors.push("Missing or invalid --trainer-profile-id <profile-uuid>.");
  if (!supabaseUrl) errors.push("Missing SUPABASE_URL.");
  if (!serviceRoleKey) errors.push("Missing SUPABASE_SERVICE_ROLE_KEY.");

  if (report.errors.length > 0) {
    errors.push("Dry-run report contains errors; apply-mode is refused.");
  }
  if (report.errors.some((error) => error.fatal)) {
    errors.push("Dry-run report contains fatal errors; apply-mode is refused.");
  }

  if (supabaseUrl && args.confirmProjectRef) {
    const actualRef = projectRefFromSupabaseUrl(supabaseUrl);
    if (!actualRef || actualRef !== args.confirmProjectRef) {
      errors.push("Project ref does not match SUPABASE_URL.");
    }
  }

  return { ok: errors.length === 0, errors, supabaseUrl, serviceRoleKey };
}

function projectRefFromSupabaseUrl(value) {
  try {
    const url = new URL(value);
    const match = url.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

class SupabaseRest {
  constructor(supabaseUrl, serviceRoleKey) {
    this.baseUrl = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1`;
    this.serviceRoleKey = serviceRoleKey;
  }

  async select(table, filters = {}, options = {}) {
    const params = new URLSearchParams();
    params.set("select", options.select || "*");
    for (const [key, value] of Object.entries(filters)) {
      params.set(key, value);
    }
    if (options.order) params.set("order", options.order);
    if (options.limit) params.set("limit", String(options.limit));
    return this.request("GET", `${table}?${params.toString()}`);
  }

  async insert(table, payload) {
    return this.request("POST", table, payload, "return=representation");
  }

  async patchById(table, id, payload) {
    const params = new URLSearchParams();
    params.set("id", `eq.${id}`);
    return this.request("PATCH", `${table}?${params.toString()}`, payload, "return=representation");
  }

  async request(method, endpoint, body, prefer = "") {
    const headers = {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      "Content-Type": "application/json"
    };
    if (prefer) headers.Prefer = prefer;

    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    const parsed = text ? parseJsonOrText(text) : null;
    if (!response.ok) {
      throw new Error(`Supabase REST ${method} ${endpoint} failed with ${response.status}: ${sanitizeRemotePayload(parsed)}`);
    }
    return parsed || [];
  }
}

function createApplyContext({ api, args, report, inputPath }) {
  return {
    api,
    args,
    report,
    inputPath,
    batchId: null,
    clientIdBySourcePath: new Map(),
    clientIdByLegacyId: new Map(),
    exerciseIdByLegacyId: new Map(),
    homePlanIdBySourcePath: new Map()
  };
}

async function assertTrainerProfile(ctx) {
  const rows = await ctx.api.select("profiles", {
    id: `eq.${ctx.args.trainerProfileId}`
  }, { select: "id,role", limit: 1 });
  if (!rows.length || rows[0].role !== "trainer") {
    throw new Error("Trainer profile id was not found or is not a trainer.");
  }
}

async function createImportBatch(ctx) {
  const payload = {
    trainer_id: ctx.args.trainerProfileId,
    source_app_version: ctx.args.sourceAppVersion || "OS 8.0 localStorage",
    storage_key: STORAGE_KEYS.os,
    backup_json_path: ctx.args.backupJsonPath || `local:${path.basename(ctx.inputPath)}`,
    record_counts: ctx.report.sourceCounts,
    validation_summary: buildValidationSummary(ctx.report),
    status: "running"
  };
  const rows = await ctx.api.insert("legacy_import_batches", payload);
  return rows[0];
}

async function finishImportBatch(ctx, status) {
  await ctx.api.patchById("legacy_import_batches", ctx.batchId, {
    status,
    record_counts: ctx.report.sourceCounts,
    validation_summary: buildValidationSummary(ctx.report)
  });
}

function buildValidationSummary(report) {
  return {
    dryRunOnly: false,
    testApplyMode: true,
    needsReview: report.needsReview.length,
    warnings: report.warnings.length,
    errors: report.errors.length,
    skipped: report.skipped.length,
    applyCounts: report.apply?.counts || null,
    unsupportedV1: [
      "client_access_credentials",
      "client_documents_storage",
      "training_load_observations",
      "guidance",
      "post_session_observations"
    ]
  };
}

async function applyExercises(ctx, exercises) {
  for (const [index, exercise] of arrayOrEmpty(exercises).entries()) {
    const sourcePath = `${STORAGE_KEYS.exerciseLibrary}[${index}]`;
    if (!isPlainObject(exercise)) {
      await writeAudit(ctx, { sourcePath, targetTable: "exercises", rawPayload: exercise, status: "skipped", notes: "invalid_exercise" });
      continue;
    }
    const payload = mapExercise(exercise, ctx.args.trainerProfileId, sourcePath);
    if (!payload.name) {
      await writeAudit(ctx, { sourcePath, targetTable: "exercises", rawPayload: exercise, status: "error", notes: "missing_required_name" });
      incrementApply(ctx, "exercises", "errors");
      continue;
    }
    const row = await upsertTarget(ctx, {
      table: "exercises",
      sourcePath,
      legacyId: payload.legacy_id,
      payload,
      rawPayload: exercise,
      ownerTrainerId: ctx.args.trainerProfileId
    });
    if (row?.id && payload.legacy_id) ctx.exerciseIdByLegacyId.set(payload.legacy_id, row.id);
  }
}

async function applyClients(ctx, state) {
  const clients = arrayOrEmpty(state?.clients);
  for (const [clientIndex, client] of clients.entries()) {
    const sourcePath = `studioLasOS_v3.clients[${clientIndex}]`;
    if (!isPlainObject(client)) {
      await writeAudit(ctx, { sourcePath, targetTable: "clients", rawPayload: client, status: "skipped", notes: "invalid_client" });
      continue;
    }

    const clientPayload = mapClient(client, ctx.args.trainerProfileId, sourcePath);
    if (!clientPayload.name) {
      await writeAudit(ctx, { sourcePath, targetTable: "clients", rawPayload: client, status: "error", notes: "missing_required_name" });
      incrementApply(ctx, "clients", "errors");
      continue;
    }

    const clientRow = await upsertTarget(ctx, {
      table: "clients",
      sourcePath,
      legacyId: clientPayload.legacy_id,
      payload: clientPayload,
      rawPayload: client,
      ownerTrainerId: ctx.args.trainerProfileId
    });
    if (!clientRow?.id) continue;

    ctx.clientIdBySourcePath.set(sourcePath, clientRow.id);
    if (clientPayload.legacy_id) ctx.clientIdByLegacyId.set(clientPayload.legacy_id, clientRow.id);

    await applyClientNeedsReviewAudit(ctx, client, sourcePath, clientRow.id);
    await applyClientIntake(ctx, client, sourcePath, clientRow.id);
    await applySessions(ctx, arrayOrEmpty(client.sessions), sourcePath, clientRow.id);
    await applyPreSessionChecks(ctx, arrayOrEmpty(client.preSessionChecks), sourcePath, clientRow.id);
    await applyClientTasks(ctx, arrayOrEmpty(client.tasks), sourcePath, clientRow.id);
    await applyBodyMeasurements(ctx, arrayOrEmpty(client.measurements), sourcePath, clientRow.id);
    await applyAssessmentResults(ctx, arrayOrEmpty(client.testResults), sourcePath, clientRow.id);
    await applyHomePlan(ctx, client.homePlan, sourcePath, clientRow.id);
    await applyReports(ctx, arrayOrEmpty(client.reports), sourcePath, clientRow.id);
  }
}

async function applyClientNeedsReviewAudit(ctx, client, clientPath, clientId) {
  if (client.clientAccessCode) {
    await writeAudit(ctx, {
      sourcePath: `${clientPath}.clientAccessCode`,
      clientId,
      targetTable: "client_access_credentials",
      rawPayload: { redacted: true, present: true },
      status: "needs_review",
      notes: "plaintext_client_access_code_redacted"
    });
    incrementApply(ctx, "client_access_credentials", "needsReview");
  }
}

async function applyClientIntake(ctx, client, clientPath, clientId) {
  const sourcePath = `${clientPath}.intake`;
  const intake = isPlainObject(client.intake) ? client.intake : {};
  if (!hasMeaningfulValue(intake) && !hasClientSpillover(client)) {
    return;
  }
  const payload = mapClientIntake(client, intake, clientId, sourcePath);
  await upsertTarget(ctx, {
    table: "client_intakes",
    sourcePath,
    clientId,
    legacyId: payload.legacy_id,
    payload,
    rawPayload: payload.raw_payload
  });
}

async function applySessions(ctx, sessions, clientPath, clientId) {
  for (const [index, session] of sessions.entries()) {
    const sourcePath = `${clientPath}.sessions[${index}]`;
    if (!isPlainObject(session)) {
      await writeAudit(ctx, { sourcePath, clientId, targetTable: "sessions", rawPayload: session, status: "skipped", notes: "invalid_session" });
      continue;
    }
    const payload = mapSession(session, clientId, sourcePath);
    if (!payload.date) {
      await writeAudit(ctx, { sourcePath, clientId, targetTable: "sessions", rawPayload: session, status: "error", notes: "missing_or_invalid_required_date" });
      incrementApply(ctx, "sessions", "errors");
      continue;
    }
    await upsertTarget(ctx, { table: "sessions", sourcePath, clientId, legacyId: payload.legacy_id, payload, rawPayload: session });
  }
}

async function applyPreSessionChecks(ctx, checks, clientPath, clientId) {
  for (const [index, check] of checks.entries()) {
    const sourcePath = `${clientPath}.preSessionChecks[${index}]`;
    if (!isPlainObject(check)) {
      await writeAudit(ctx, { sourcePath, clientId, targetTable: "pre_session_checks", rawPayload: check, status: "skipped", notes: "invalid_pre_session_check" });
      continue;
    }
    const payload = mapPreSessionCheck(check, clientId, sourcePath);
    if (!payload.check_date) {
      await writeAudit(ctx, { sourcePath, clientId, targetTable: "pre_session_checks", rawPayload: check, status: "error", notes: "missing_or_invalid_required_date" });
      incrementApply(ctx, "pre_session_checks", "errors");
      continue;
    }
    await upsertTarget(ctx, { table: "pre_session_checks", sourcePath, clientId, legacyId: payload.legacy_id, payload, rawPayload: check });
  }
}

async function applyClientTasks(ctx, tasks, clientPath, clientId) {
  for (const [index, task] of tasks.entries()) {
    const sourcePath = `${clientPath}.tasks[${index}]`;
    if (!isPlainObject(task) || !nonEmptyString(task.text)) {
      await writeAudit(ctx, { sourcePath, clientId, targetTable: "client_tasks", rawPayload: task, status: "skipped", notes: "missing_task_text" });
      continue;
    }
    await upsertTarget(ctx, {
      table: "client_tasks",
      sourcePath,
      clientId,
      legacyId: "",
      payload: mapClientTask(task, clientId),
      rawPayload: task,
      tableHasLegacyId: false
    });
  }
}

async function applyBodyMeasurements(ctx, measurements, clientPath, clientId) {
  for (const [index, measurement] of measurements.entries()) {
    const sourcePath = `${clientPath}.measurements[${index}]`;
    if (!isPlainObject(measurement)) {
      await writeAudit(ctx, { sourcePath, clientId, targetTable: "body_measurements", rawPayload: measurement, status: "skipped", notes: "invalid_body_measurement" });
      continue;
    }
    const payload = mapBodyMeasurement(measurement, clientId, sourcePath);
    if (!payload.measured_at) {
      await writeAudit(ctx, { sourcePath, clientId, targetTable: "body_measurements", rawPayload: measurement, status: "error", notes: "missing_or_invalid_required_date" });
      incrementApply(ctx, "body_measurements", "errors");
      continue;
    }
    await upsertTarget(ctx, { table: "body_measurements", sourcePath, clientId, legacyId: payload.legacy_id, payload, rawPayload: measurement });

    if (measurement.pdfDataUrl) {
      await writeAudit(ctx, {
        sourcePath: `${sourcePath}.pdfDataUrl`,
        clientId,
        targetTable: "client_documents",
        rawPayload: redactedPdfPayload(measurement),
        status: "needs_review",
        notes: "tanita_pdf_storage_required_redacted"
      });
      incrementApply(ctx, "client_documents", "needsReview");
    }
  }
}

async function applyAssessmentResults(ctx, results, clientPath, clientId) {
  for (const [index, result] of results.entries()) {
    const sourcePath = `${clientPath}.testResults[${index}]`;
    if (!isPlainObject(result)) {
      await writeAudit(ctx, { sourcePath, clientId, targetTable: "assessment_results", rawPayload: result, status: "skipped", notes: "invalid_assessment_result" });
      continue;
    }
    const payload = mapAssessmentResult(result, clientId, sourcePath);
    if (!payload.performed_at) {
      await writeAudit(ctx, { sourcePath, clientId, targetTable: "assessment_results", rawPayload: result, status: "error", notes: "missing_or_invalid_required_date" });
      incrementApply(ctx, "assessment_results", "errors");
      continue;
    }
    await upsertTarget(ctx, { table: "assessment_results", sourcePath, clientId, legacyId: payload.legacy_id, payload, rawPayload: result });
  }
}

async function applyHomePlan(ctx, homePlan, clientPath, clientId) {
  if (!isPlainObject(homePlan) || !hasMeaningfulHomePlan(homePlan)) return;
  const sourcePath = `${clientPath}.homePlan`;
  const payload = mapHomePlan(homePlan, clientId, sourcePath);
  const planRow = await upsertTarget(ctx, {
    table: "home_plans",
    sourcePath,
    clientId,
    legacyId: payload.legacy_id,
    payload,
    rawPayload: homePlan
  });
  if (!planRow?.id) return;
  ctx.homePlanIdBySourcePath.set(sourcePath, planRow.id);

  for (const [index, item] of arrayOrEmpty(homePlan.exercises).entries()) {
    const itemPath = `${sourcePath}.exercises[${index}]`;
    if (!isPlainObject(item)) {
      await writeAudit(ctx, { sourcePath: itemPath, clientId, targetTable: "home_plan_items", rawPayload: item, status: "skipped", notes: "invalid_home_plan_item" });
      continue;
    }
    const itemPayload = mapHomePlanItem(item, clientId, planRow.id, index, ctx, itemPath);
    if (!itemPayload.name) {
      await writeAudit(ctx, { sourcePath: itemPath, clientId, targetTable: "home_plan_items", rawPayload: item, status: "skipped", notes: "missing_home_plan_item_name" });
      continue;
    }
    await upsertTarget(ctx, { table: "home_plan_items", sourcePath: itemPath, clientId, legacyId: itemPayload.legacy_id, payload: itemPayload, rawPayload: item });
  }
}

async function applyReports(ctx, reports, clientPath, clientId) {
  for (const [index, reportRow] of reports.entries()) {
    const sourcePath = `${clientPath}.reports[${index}]`;
    if (!isPlainObject(reportRow)) {
      await writeAudit(ctx, { sourcePath, clientId, targetTable: "reports", rawPayload: reportRow, status: "skipped", notes: "invalid_report" });
      continue;
    }
    const payload = mapReport(reportRow, clientId, ctx.args.trainerProfileId, sourcePath);
    if (!payload.content) {
      await writeAudit(ctx, { sourcePath, clientId, targetTable: "reports", rawPayload: reportRow, status: "skipped", notes: "missing_report_content" });
      continue;
    }
    await upsertTarget(ctx, { table: "reports", sourcePath, clientId, legacyId: payload.legacy_id, payload, rawPayload: reportRow });
    if (!reportRow.audience) {
      await writeAudit(ctx, {
        sourcePath: `${sourcePath}.audience`,
        clientId,
        targetTable: "reports",
        rawPayload: { audienceMissing: true },
        status: "needs_review",
        notes: "report_imported_as_trainer_draft"
      });
      incrementApply(ctx, "reports", "needsReview");
    }
  }
}

async function upsertTarget(ctx, options) {
  if (!APPLY_TABLES_V1.has(options.table)) {
    await writeAudit(ctx, { ...options, status: "skipped", notes: "table_not_in_apply_v1" });
    incrementApply(ctx, options.table, "skipped");
    return null;
  }

  const existing = await findExistingTarget(ctx, options);
  if (existing.conflict) {
    await writeAudit(ctx, { ...options, status: "error", notes: "idempotency_conflict" });
    incrementApply(ctx, options.table, "errors");
    return null;
  }

  const sourceHash = hashPayload(sanitizeRawPayload(options.rawPayload));
  const payload = { ...options.payload };
  let row;
  let action;
  if (existing.row?.id) {
    await writeAudit(ctx, {
      sourcePath: options.sourcePath,
      clientId: options.clientId,
      targetTable: options.table,
      targetId: existing.row.id,
      legacyId: options.legacyId,
      rawPayload: options.rawPayload,
      status: "skipped",
      notes: `existing_target_skip_no_overwrite;payload_hash=${sourceHash}`
    });
    incrementApply(ctx, options.table, "skipped");
    return existing.row;
  } else {
    const rows = await ctx.api.insert(options.table, payload);
    row = rows[0];
    action = "inserted";
  }

  await writeAudit(ctx, {
    sourcePath: options.sourcePath,
    clientId: options.clientId,
    targetTable: options.table,
    targetId: row.id,
    legacyId: options.legacyId,
    rawPayload: options.rawPayload,
    status: "imported",
    notes: `${action};payload_hash=${sourceHash}`
  });
  incrementApply(ctx, options.table, action);
  return row;
}

async function findExistingTarget(ctx, options) {
  const legacyRow = await findExistingByLegacyKey(ctx, options);
  if (legacyRow.conflict || legacyRow.row) return legacyRow;

  const auditRow = await findExistingByAudit(ctx, options);
  if (!auditRow?.target_id) return { row: null };

  const rows = await ctx.api.select(options.table, { id: `eq.${auditRow.target_id}` }, { select: "id", limit: 2 });
  if (rows.length > 1) return { conflict: true };
  if (rows.length === 1) return { row: rows[0] };
  return { row: null };
}

async function findExistingByLegacyKey(ctx, options) {
  if (!options.legacyId || options.tableHasLegacyId === false) return { row: null };

  const filters = { legacy_id: `eq.${options.legacyId}` };
  if (options.clientId) filters.client_id = `eq.${options.clientId}`;
  if (options.ownerTrainerId) filters.owner_trainer_id = `eq.${options.ownerTrainerId}`;
  if (TABLES_WITH_DELETED_AT.has(options.table)) filters.deleted_at = "is.null";

  const rows = await ctx.api.select(options.table, filters, { select: "id", limit: 2 });
  if (rows.length > 1) return { conflict: true };
  return { row: rows[0] || null };
}

async function findExistingByAudit(ctx, options) {
  if (!options.clientId) {
    return null;
  }

  const filters = {
    target_table: `eq.${options.table}`,
    source_path: `eq.${options.sourcePath}`
  };
  filters.client_id = `eq.${options.clientId}`;

  const rows = await ctx.api.select("legacy_import_records", filters, { select: "target_id,created_at", order: "created_at.desc", limit: 1 });
  return rows[0] || null;
}

async function writeAudit(ctx, { sourcePath, clientId = null, targetTable = null, targetId = null, legacyId = "", rawPayload = {}, status = "imported", notes = "" }) {
  const payload = {
    import_batch_id: ctx.batchId,
    client_id: clientId,
    source_path: sourcePath,
    legacy_id: stableString(legacyId) || stableString(rawPayload?.id) || null,
    target_table: targetTable,
    target_id: targetId,
    raw_payload: sanitizeRawPayload(rawPayload),
    status,
    notes: safeAuditNotes(notes)
  };
  await ctx.api.insert("legacy_import_records", payload);
  ctx.report.apply.counts.auditRecords += 1;
  if (status === "needs_review") ctx.report.apply.counts.needsReview += 1;
  if (status === "skipped") ctx.report.apply.counts.skipped += 1;
}

function incrementApply(ctx, table, action) {
  ctx.report.apply.perTable[table] = ctx.report.apply.perTable[table] || { inserted: 0, updated: 0, skipped: 0, needsReview: 0, errors: 0 };
  const normalized = action === "inserted" || action === "updated" || action === "skipped" || action === "needsReview" || action === "errors"
    ? action
    : "skipped";
  ctx.report.apply.perTable[table][normalized] += 1;
  ctx.report.apply.counts[normalized] += 1;
}

function mapClient(client, trainerProfileId, sourcePath) {
  const stage = Number(client.stage);
  return compactObject({
    legacy_id: nullIfEmpty(client.id) || sourcePath,
    owner_trainer_id: trainerProfileId,
    name: nullIfEmpty(client.name),
    contact: nullIfEmpty(client.contact),
    email: nullIfEmpty(client.email),
    phone: nullIfEmpty(client.phone),
    package: nullIfEmpty(client.package),
    stage: Number.isInteger(stage) && stage >= 1 && stage <= 4 ? stage : 1,
    stage_raw: nullIfEmpty(client.stageRaw),
    start_date: validDateOrNull(client.startDate),
    next_session_date: validDateOrNull(client.nextSessionDate),
    next_review_date: validDateOrNull(client.nextReviewDate),
    goal: nullIfEmpty(client.goal),
    motivation: nullIfEmpty(client.motivation),
    fears: nullIfEmpty(client.fears),
    health_status: nullIfEmpty(client.healthStatus),
    contraindications: nullIfEmpty(client.contraindications),
    red_flags_text: nullIfEmpty(client.redFlagsText || client.redFlags),
    communication_profile: nullIfEmpty(client.communicationProfile || client.neuroType || client.neuroProfile),
    next_milestone: nullIfEmpty(client.nextMilestone),
    working_hypothesis: nullIfEmpty(client.workingHypothesis || client.decisionLogic),
    status: client.status === "archived" ? "archived" : "active"
  });
}

function mapClientIntake(client, intake, clientId, sourcePath) {
  const rawPayload = buildClientIntakeRawPayload(client, intake);
  return compactObject({
    client_id: clientId,
    legacy_id: sourcePath,
    imported_at: validTimestampOrNull(intake.importedAt),
    source: nullIfEmpty(intake.source) || "CSV",
    raw_payload: rawPayload,
    summary: nullIfEmpty(intake.summary),
    goals: arrayOfText(intake.goals),
    main_goal: nullIfEmpty(intake.mainGoal || client.goal),
    motivation: nullIfEmpty(intake.motivation || client.motivation),
    expectations: nullIfEmpty(intake.expectations || client.expectations),
    readiness_text: nullIfEmpty(intake.readiness || client.readiness),
    pain_areas: nullIfEmpty(intake.painAreas || client.painAreas),
    medical_flags: arrayOfText(intake.medicalFlags),
    movement_limitations: arrayOfText(intake.movementLimitations),
    lifestyle_flags: arrayOfText(intake.lifestyleFlags),
    training_preferences: arrayOfText(intake.trainingPreferences),
    flags: arrayOfText(intake.flags),
    communication_style: nullIfEmpty(intake.communicationStyle),
    compliance_forecast: nullIfEmpty(intake.complianceForecast),
    first_session_focus: nullIfEmpty(intake.firstSessionFocus),
    risk_level: ["low", "medium", "high"].includes(intake.riskLevel) ? intake.riskLevel : "low",
    trainer_notes: nullIfEmpty(intake.trainerNotes)
  });
}

function mapSession(session, clientId, sourcePath) {
  return compactObject({
    client_id: clientId,
    legacy_id: nullIfEmpty(session.id) || sourcePath,
    date: validDateOrNull(session.date),
    readiness: parseSmallInt(session.readiness),
    vas_before: parseSmallInt(session.vasBefore),
    vas_after: parseSmallInt(session.vasAfter),
    mobility_index: parseNumberOrNull(session.mobilityIndex),
    sleep_quality: nullIfEmpty(session.sleepQuality),
    exercises_text: Array.isArray(session.exercises) ? arrayOfText(session.exercises) : arrayOfText(splitText(session.exercisesText)),
    trainer_observation: nullIfEmpty(session.notes || session.trainerObservation),
    trainer_decision: nullIfEmpty(session.decision || session.trainerDecision),
    milestone: nullIfEmpty(session.milestone),
    client_summary: nullIfEmpty(session.clientSummary),
    client_next_step: nullIfEmpty(session.clientNextStep),
    client_visible: false,
    published_at: null
  });
}

function mapPreSessionCheck(check, clientId, sourcePath) {
  return compactObject({
    client_id: clientId,
    legacy_id: nullIfEmpty(check.id) || sourcePath,
    check_date: validDateOrNull(check.date),
    pain_increased: Boolean(check.painIncreased),
    poor_sleep: Boolean(check.poorSleep),
    home_plan_done: Boolean(check.homePlanDone),
    new_symptoms: Boolean(check.newSymptoms),
    red_flag_concern: Boolean(check.redFlagConcern),
    planned_decision: PROCESS_DECISIONS.has(check.plannedDecision) ? check.plannedDecision : "utrzymaj",
    trainer_note: nullIfEmpty(check.note)
  });
}

function mapClientTask(task, clientId) {
  const payload = compactObject({
    client_id: clientId,
    text: nullIfEmpty(task.text),
    completed: task.done === true || task.completed === true,
    source: nullIfEmpty(task.source),
    due_date: validDateOrNull(task.dueDate),
    completed_at: validTimestampOrNull(task.completedAt)
  });
  const createdAt = validTimestampOrNull(task.createdAt);
  if (createdAt) payload.created_at = createdAt;
  return payload;
}

function mapBodyMeasurement(measurement, clientId, sourcePath) {
  return compactObject({
    client_id: clientId,
    legacy_id: nullIfEmpty(measurement.id) || sourcePath,
    measured_at: validDateOrNull(measurement.date || measurement.measuredAt),
    source: nullIfEmpty(measurement.source) || "Tanita",
    input_method: normalizeInputMethod(measurement.inputMethod || measurement.sourceMode),
    parse_status: normalizeParseStatus(measurement.parseStatus),
    parsed_fields: arrayOfText(measurement.parsedFields),
    weight_kg: parseNumberOrNull(measurement.weightKg),
    fat_percent: parseNumberOrNull(measurement.fatPercent),
    fat_mass_kg: parseNumberOrNull(measurement.fatMassKg),
    fat_free_mass_kg: parseNumberOrNull(measurement.fatFreeMassKg),
    muscle_mass_kg: parseNumberOrNull(measurement.muscleMassKg),
    body_water_percent: parseNumberOrNull(measurement.bodyWaterPercent),
    body_water_kg: parseNumberOrNull(measurement.bodyWaterKg),
    visceral_fat_rating: parseNumberOrNull(measurement.visceralFatRating),
    bmr_kcal: parseIntegerOrNull(measurement.bmrKcal),
    metabolic_age: parseIntegerOrNull(measurement.metabolicAge),
    bmi: parseNumberOrNull(measurement.bmi),
    bone_mass_kg: parseNumberOrNull(measurement.boneMassKg),
    protein_kg: parseNumberOrNull(measurement.proteinKg),
    trainer_interpretation: nullIfEmpty(measurement.trainerInterpretation),
    client_summary: nullIfEmpty(measurement.clientSummary),
    document_id: null,
    client_visible: false,
    published_at: null
  });
}

function mapAssessmentResult(result, clientId, sourcePath) {
  return compactObject({
    client_id: clientId,
    legacy_id: nullIfEmpty(result.id) || sourcePath,
    test_id: nullIfEmpty(result.testId),
    test_name: nullIfEmpty(result.testName),
    performed_at: validDateOrNull(result.date || result.performedAt),
    side: normalizeSide(result.side),
    result_text: nullIfEmpty(result.resultText ?? result.result ?? result.score),
    pain_before: parseSmallInt(result.painBefore ?? result.pain),
    pain_after: parseSmallInt(result.painAfter ?? result.pain),
    quality: ASSESSMENT_QUALITIES.has(result.quality) ? result.quality : "do obserwacji",
    interpretation: nullIfEmpty(result.interpretation || result.finding),
    trainer_decision: ASSESSMENT_DECISIONS.has(result.trainerDecision) ? result.trainerDecision : (ASSESSMENT_DECISIONS.has(result.decision) ? result.decision : "obserwuj"),
    next_step: nullIfEmpty(result.nextStep),
    trainer_note: nullIfEmpty(result.notes || result.trainerNote),
    client_summary: nullIfEmpty(result.clientSummary),
    client_visible: false,
    published_at: null
  });
}

function mapExercise(exercise, trainerProfileId, sourcePath) {
  const qualityStatus = String(exercise.qualityStatus || "").trim() === "needs-review" ? "needs_review" : exercise.qualityStatus;
  return compactObject({
    legacy_id: nullIfEmpty(exercise.id) || sourcePath,
    owner_trainer_id: trainerProfileId,
    name: nullIfEmpty(exercise.name || exercise.technicalName || exercise.nazwaTechniczna || exercise.clientName),
    client_name: nullIfEmpty(exercise.clientName),
    category: nullIfEmpty(exercise.category),
    training_block: nullIfEmpty(exercise.trainingBlock),
    subcategory: nullIfEmpty(exercise.subcategory),
    region: nullIfEmpty(exercise.region),
    pattern: nullIfEmpty(exercise.pattern),
    stage: nullIfEmpty(exercise.stage),
    level: nullIfEmpty(exercise.level),
    equipment: nullIfEmpty(exercise.equipment),
    goal: nullIfEmpty(exercise.goal),
    dosage_default: nullIfEmpty(exercise.dosageDefault),
    tempo: nullIfEmpty(exercise.tempo),
    breathing: nullIfEmpty(exercise.breathing),
    client_instruction: nullIfEmpty(exercise.clientInstruction),
    coach_notes: nullIfEmpty(exercise.coachNotes),
    common_mistakes: nullIfEmpty(exercise.commonMistakes),
    stop_criteria: nullIfEmpty(exercise.stopCriteria),
    regressions: nullIfEmpty(exercise.regressions),
    progressions: nullIfEmpty(exercise.progressions),
    contraindications: nullIfEmpty(exercise.contraindications),
    video_url: nullIfEmpty(exercise.videoUrl),
    tags: arrayOfText(exercise.tags),
    linked_tests: arrayOfText(exercise.linkedTests),
    beginner_friendly: exercise.beginnerFriendly === false ? false : true,
    source: nullIfEmpty(exercise.source),
    source_order: parseIntegerOrNull(exercise.sourceOrder),
    quality_status: EXERCISE_QUALITY_STATUSES.has(qualityStatus) ? qualityStatus : "reviewed",
    muscle_map: isPlainObject(exercise.muscleMap) ? exercise.muscleMap : {},
    primary_muscles: arrayOfText(exercise.primaryMuscles),
    secondary_muscles: arrayOfText(exercise.secondaryMuscles),
    support_muscles: arrayOfText(exercise.supportMuscles),
    strength_set: exercise.strengthSet === true
  });
}

function mapHomePlan(homePlan, clientId, sourcePath) {
  const payload = compactObject({
    client_id: clientId,
    legacy_id: nullIfEmpty(homePlan.id) || sourcePath,
    title: nullIfEmpty(homePlan.title),
    focus: nullIfEmpty(homePlan.focus),
    frequency: nullIfEmpty(homePlan.frequency),
    duration: nullIfEmpty(homePlan.duration),
    instructions: nullIfEmpty(homePlan.instructions),
    status: "active",
    published_at: null
  });
  const updatedAt = validTimestampOrNull(homePlan.updatedAt);
  if (updatedAt) payload.updated_at = updatedAt;
  return payload;
}

function mapHomePlanItem(item, clientId, planId, index, ctx, sourcePath) {
  const exerciseLegacyId = nullIfEmpty(item.exerciseId);
  return compactObject({
    home_plan_id: planId,
    client_id: clientId,
    exercise_id: exerciseLegacyId ? ctx.exerciseIdByLegacyId.get(exerciseLegacyId) || null : null,
    legacy_id: nullIfEmpty(item.id) || sourcePath,
    name: nullIfEmpty(item.name || item.exerciseId),
    category: nullIfEmpty(item.category),
    region: nullIfEmpty(item.region),
    dosage: nullIfEmpty(item.dosage),
    frequency: nullIfEmpty(item.frequency),
    client_cue: nullIfEmpty(item.clientCue || item.note),
    stop_criteria: nullIfEmpty(item.stopCriteria),
    video_url: nullIfEmpty(item.videoUrl),
    status: item.status === "archived" ? "archived" : "active",
    sort_order: Number.isInteger(Number(item.sortOrder)) ? Number(item.sortOrder) : index,
    added_at: validDateOrNull(item.addedAt),
    trainer_note: nullIfEmpty(item.note),
    published_at: null
  });
}

function mapReport(reportRow, clientId, trainerProfileId, sourcePath) {
  return compactObject({
    client_id: clientId,
    legacy_id: nullIfEmpty(reportRow.id) || sourcePath,
    type: REPORT_TYPES.has(reportRow.type) ? reportRow.type : "fourWeeks",
    audience: "trainer",
    status: "draft",
    title: nullIfEmpty(reportRow.title),
    content: nullIfEmpty(reportRow.content),
    published_at: null,
    created_by: trainerProfileId
  });
}

function buildClientIntakeRawPayload(client, intake) {
  const spillover = {};
  for (const [key, value] of Object.entries(client)) {
    if (!CLIENT_FIELDS.has(key)) spillover[key] = value;
  }
  return sanitizeRawPayload({
    intake: isPlainObject(intake) ? intake : {},
    client_spillover: spillover
  });
}

function hasClientSpillover(client) {
  return Object.entries(client || {}).some(([key, value]) => !CLIENT_FIELDS.has(key) && hasMeaningfulValue(value));
}

function sanitizeRawPayload(value) {
  if (Array.isArray(value)) return value.map(sanitizeRawPayload);
  if (!isPlainObject(value)) {
    if (typeof value === "string" && value.startsWith("data:application/pdf")) {
      return "[redacted_pdf_data_url]";
    }
    return value;
  }
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (/clientAccessCode|password|secret|token|serviceRole/i.test(key)) {
      output[key] = "[redacted]";
    } else if (/pdfDataUrl|dataUrl/i.test(key) && typeof item === "string") {
      output[key] = "[redacted_data_url]";
    } else {
      output[key] = sanitizeRawPayload(item);
    }
  }
  return output;
}

function redactedPdfPayload(measurement) {
  return {
    hasPdfDataUrl: Boolean(measurement.pdfDataUrl),
    pdfNamePresent: Boolean(measurement.pdfName),
    legacyMeasurementId: nullIfEmpty(measurement.id),
    payloadHash: hashPayload({ pdfDataUrl: measurement.pdfDataUrl || "" })
  };
}

function hashPayload(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function safeAuditNotes(value) {
  return String(value || "").replace(/[^\w .:=;-]/g, "_").slice(0, 500);
}

function sanitizeErrorMessage(error) {
  return String(error?.message || error || "Unknown apply error")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")
    .replace(/apikey['": ]+[A-Za-z0-9._-]+/gi, "apikey [redacted]")
    .slice(0, 800);
}

function sanitizeRemotePayload(payload) {
  return sanitizeErrorMessage(typeof payload === "string" ? payload : JSON.stringify(payload));
}

function parseJsonOrText(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function nullIfEmpty(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return String(value);
}

function validDateOrNull(value) {
  if (!value) return null;
  const stringValue = String(value).slice(0, 10);
  return isValidIsoDate(stringValue) ? stringValue : null;
}

function validTimestampOrNull(value) {
  if (!value) return null;
  if (isValidIsoDate(String(value).slice(0, 10))) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
    return `${String(value).slice(0, 10)}T00:00:00.000Z`;
  }
  return null;
}

function parseNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function parseIntegerOrNull(value) {
  const number = parseNumberOrNull(value);
  return Number.isInteger(number) ? number : null;
}

function parseSmallInt(value) {
  const number = parseIntegerOrNull(value);
  return number === null ? null : number;
}

function arrayOfText(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return splitText(value);
  return [];
}

function splitText(value) {
  return String(value || "")
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeInputMethod(value) {
  const normalized = nullIfEmpty(value);
  return ["manual", "pdf", "pdf-autofill", "demo"].includes(normalized) ? normalized : null;
}

function normalizeParseStatus(value) {
  const normalized = nullIfEmpty(value);
  return ["not_attempted", "success", "partial", "failed", "manual_required", "demo"].includes(normalized) ? normalized : null;
}

function normalizeSide(value) {
  const normalized = nullIfEmpty(value);
  return ["", "lewa", "prawa", "obie"].includes(normalized || "") ? normalized : null;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function validateStage(stage, sourcePath, report) {
  if (stage === undefined || stage === null || stage === "") return;
  const number = Number(stage);
  if (!Number.isInteger(number) || number < 1 || number > 4) {
    addNeedsReview(report, sourcePath, "clients", "invalid_stage", "clients.stage must be an integer from 1 to 4.", "high");
  }
}

function validateDateField(value, sourcePath, table, targetField, required, report) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      addNeedsReview(report, sourcePath, table, "missing_required_date", `${table}.${targetField} requires a date.`, "high");
    } else if (value === "") {
      addNeedsReview(report, sourcePath, table, "empty_string_to_null", `${targetField} should become null, not empty string.`, "low");
    }
    return;
  }
  if (!isValidIsoDate(String(value))) {
    addNeedsReview(report, sourcePath, table, "invalid_date", `${targetField} has invalid date value: ${String(value)}`, required ? "high" : "medium");
  }
}

function checkNumberField(value, sourcePath, table, targetField, report) {
  if (value === undefined || value === null) return;
  if (value === "") {
    addNeedsReview(report, sourcePath, table, "empty_string_to_null", `${targetField} should become null, not empty string.`, "low");
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      addNeedsReview(report, sourcePath, table, "number_parsing_issue", `${targetField} is not a finite number.`, "high");
    }
    return;
  }
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (value.includes(",")) {
      addNeedsReview(report, sourcePath, table, "number_comma_decimal", `${targetField} uses comma decimal separator and needs explicit normalization.`, "medium");
    }
    if (!Number.isFinite(Number(normalized))) {
      addNeedsReview(report, sourcePath, table, "number_parsing_issue", `${targetField} cannot be parsed as number.`, "high");
    }
    return;
  }
  addNeedsReview(report, sourcePath, table, "number_parsing_issue", `${targetField} has non-number type ${typeof value}.`, "high");
}

function checkEmptyStrings(object, sourcePath, table, fields, report) {
  for (const field of fields) {
    if (object[field] === "") {
      addNeedsReview(report, `${sourcePath}.${field}`, table, "empty_string_to_null", `${field} should become null or be omitted, not empty string.`, "low");
    }
  }
}

function checkUnknownClientFields(client, sourcePath, report) {
  for (const key of Object.keys(client)) {
    if (!CLIENT_FIELDS.has(key)) {
      addNeedsReview(report, `${sourcePath}.${key}`, "client_intakes", "csv_spillover_or_unknown_client_field", "Unknown client-level field should be reviewed as CSV spillover or legacy payload.", "medium");
    }
  }
}

function warnSensitiveClientFields(client, sourcePath, report) {
  const sensitiveFields = ["contraindications", "redFlags", "redFlagsText", "healthStatus", "fears"];
  if (sensitiveFields.some((field) => nonEmptyString(client[field]))) {
    addWarning(report, sourcePath, "sensitive_client_process_data", "Client contains medical/process-sensitive fields. Keep out of client-safe raw views.", "medium");
  }
}

function warnSensitiveObject(object, sourcePath, table, report) {
  for (const key of Object.keys(object || {})) {
    if (MEDICAL_FIELD_HINTS.some((pattern) => pattern.test(key)) && hasMeaningfulValue(object[key])) {
      addWarning(report, `${sourcePath}.${key}`, "sensitive_raw_payload_field", `Sensitive-looking field should remain trainer-only in ${table}.`, "medium");
    }
  }
}

function detectChildDuplicates(client, clientPath, report) {
  for (const [field, table] of [
    ["sessions", "sessions"],
    ["measurements", "body_measurements"],
    ["polarSessions", "training_load_observations"],
    ["reports", "reports"],
    ["preSessionChecks", "pre_session_checks"],
    ["postSessionNotes", "post_session_observations"],
    ["testResults", "assessment_results"]
  ]) {
    for (const id of duplicateIds(arrayOrEmpty(client[field]))) {
      addWarning(report, `${clientPath}.${field}`, "duplicate_legacy_id", `Duplicate legacy_id detected for target ${table}.`, "high");
    }
  }
}

function duplicateIds(items) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of arrayOrEmpty(items)) {
    const id = stableString(item?.id);
    if (!id) continue;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
}

function addIdempotency(report, targetTable, sourcePath, clientLegacyId, legacyId, fallbackPath, tableHasLegacyId = true) {
  const hasLegacyId = nonEmptyString(legacyId);
  const keyType = hasLegacyId && tableHasLegacyId ? "legacy_id" : "legacy_path";
  const rawKey = hasLegacyId && tableHasLegacyId
    ? `${targetTable}:${clientLegacyId || "global"}:${legacyId}`
    : `${targetTable}:${clientLegacyId || "global"}:${fallbackPath}`;
  const keyHash = hashPayload(rawKey).slice(0, 24);
  const entry = {
    targetTable,
    sourcePath,
    keyType,
    keyHash,
    stable: hasLegacyId && tableHasLegacyId,
    fallbackUsed: !(hasLegacyId && tableHasLegacyId)
  };
  report.idempotencyKeys.push(entry);
  if (!hasLegacyId) {
    addNeedsReview(report, sourcePath, targetTable, "missing_id", `No stable legacy id; importer must use legacy_path fallback: ${fallbackPath}`, "medium");
  }
  return entry;
}

function addMapping(report, sourcePath, targetTable, idempotency, note) {
  report.mappingPreview.push({
    sourcePath,
    targetTable,
    action: "would_import_or_upsert",
    idempotencyKeyHash: idempotency.keyHash,
    idempotencyKeyType: idempotency.keyType,
    fallbackUsed: idempotency.fallbackUsed,
    note
  });
}

function addNeedsReview(report, sourcePath, targetTable, code, message, severity = "medium") {
  addIssue(report, "needsReview", { sourcePath, targetTable, code, severity, message });
}

function addWarning(report, sourcePath, code, message, severity = "medium") {
  addIssue(report, "warnings", { sourcePath, code, severity, message });
}

function addError(report, sourcePath, code, message, fatal = false) {
  addIssue(report, "errors", { sourcePath, code, fatal, message });
}

function addSkipped(report, sourcePath, code, message) {
  addIssue(report, "skipped", { sourcePath, code, message });
  recordAudit(report, sourcePath);
}

function addIssue(report, collection, issue) {
  const key = `${collection}:${issue.sourcePath}:${issue.code}:${issue.targetTable || ""}`;
  if (report._seenIssues.has(key)) return;
  report._seenIssues.add(key);
  report[collection].push(issue);
}

function recordAudit(report, sourcePath) {
  report._auditPaths.add(sourcePath);
}

function updateReportSummary(report) {
  report.targetCounts.legacy_import_records = report._auditPaths.size;
  report.summary.targetRecordTotal = Object.entries(report.targetCounts)
    .filter(([table]) => !["legacy_import_records"].includes(table))
    .reduce((sum, [, count]) => sum + count, 0);
  report.summary.mappingPreviewCount = report.mappingPreview.length;
  report.summary.idempotencyKeyCount = report.idempotencyKeys.length;
  report.summary.needsReviewCount = report.needsReview.length;
  report.summary.warningCount = report.warnings.length;
  report.summary.errorCount = report.errors.length;
  report.summary.skippedCount = report.skipped.length;
}

function finalizeReport(report) {
  updateReportSummary(report);
  delete report._seenIssues;
  delete report._auditPaths;
}

function printConsoleSummary(report) {
  console.log("Studio Las OS 9.0 dry-run importer");
  if (report.apply?.batchId) {
    console.log("Test apply-mode completed. Supabase service role was used but never logged.");
  } else if (report.apply) {
    console.log("Apply-mode was requested but refused before Supabase writes.");
  } else {
    console.log("No Supabase connection. No database writes. No service role.");
  }
  console.log("");
  console.log(`Input:  ${report.summary.inputFile}`);
  console.log(`Output: ${report.summary.outputFile}`);
  console.log("");
  console.log("Target counts:");
  for (const table of TARGET_TABLES) {
    console.log(`  ${table}: ${report.targetCounts[table]}`);
  }
  console.log("");
  console.log(`needs_review: ${report.needsReview.length}`);
  console.log(`warnings:     ${report.warnings.length}`);
  console.log(`errors:       ${report.errors.length}`);
  console.log(`skipped:      ${report.skipped.length}`);
  if (report.warnings.length) {
    console.log("");
    console.log("Top warnings:");
    for (const warning of report.warnings.slice(0, 5)) {
      console.log(`  [${warning.severity}] ${warning.code} at ${warning.sourcePath}`);
    }
  }
  if (report.errors.length) {
    console.log("");
    console.log("Errors:");
    for (const error of report.errors) {
      console.log(`  ${error.fatal ? "[fatal] " : ""}${error.code} at ${error.sourcePath}: ${error.message}`);
    }
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function stableString(value) {
  if (value === undefined || value === null) return "";
  const stringValue = String(value).trim();
  return stringValue;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function hasMeaningfulValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.values(value).some(hasMeaningfulValue);
  return true;
}

function hasMeaningfulHomePlan(plan) {
  if (!isPlainObject(plan)) return false;
  return ["title", "focus", "frequency", "duration", "instructions"].some((field) => nonEmptyString(plan[field]))
    || arrayOrEmpty(plan.exercises).length > 0;
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}

main().catch((error) => {
  console.error(`Importer failed: ${sanitizeErrorMessage(error)}`);
  process.exitCode = 1;
});
