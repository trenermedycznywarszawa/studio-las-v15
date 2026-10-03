import { pathToFileURL } from "node:url";
import { createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import {
  assembleTrainerAttentionSnapshot,
  collectTrainerAttentionPages,
  getTrainerAttentionReadContract,
  getTrainerAttentionSourceKeys
} from "../assets/os/trainer-attention-snapshot.js";
import { buildTrainerAttentionModel } from "../assets/os/trainer-attention-model.js";
import { collectWorkspaceSignals } from "../assets/os/trainer-signals.js";
import { withoutReviewedSignals } from "../assets/os/decision-support.js";

const STAGING_REF = "ulauyoqjoetjqktegeuq";
const STAGING_ORIGIN = `https://${STAGING_REF}.supabase.co`;
const PUBLISHABLE_KEY = String(process.env.STUDIO_LAS_STAGING_PUBLISHABLE_KEY || "").trim();
const QA_EMAIL = String(process.env.STUDIO_LAS_QA_EMAIL || "").trim();
const QA_PASSWORD = String(process.env.STUDIO_LAS_QA_PASSWORD || "");
const QA_TOTP_SECRET = String(process.env.STUDIO_LAS_QA_TOTP_SECRET || "").trim();
const QA_FACTOR_ID = String(process.env.STUDIO_LAS_QA_E2E_FACTOR_ID || "").trim();
const ARTIFACT_DIR = process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/browser-e2e";
const PAGE_SIZE = 200;
const FOREIGN_SEED_CLIENT_IDS = [
  "aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1",
  "bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function decodeJwt(token) {
  const part = String(token || "").split(".")[1];
  if (!part) return {};
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

function decodeBase32(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = String(input || "").trim().toUpperCase().replace(/\s+/g, "").replace(/=+$/g, "");
  assert(normalized.length >= 16, "QA TOTP secret is missing or too short");
  let bits = "";
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    assert(index >= 0, "QA TOTP secret is not valid Base32");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpCode(secret, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export async function freshTotpCode(secret) {
  const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
  if (remaining <= 4) await new Promise(resolve => setTimeout(resolve, (remaining + 1) * 1000));
  return totpCode(secret);
}

export function studioToday() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function headers(token = "") {
  const result = {
    apikey: PUBLISHABLE_KEY,
    Accept: "application/json"
  };
  if (token) result.Authorization = `Bearer ${token}`;
  return result;
}

async function jsonRequest(path, { token = "", method = "GET", body } = {}) {
  const response = await fetch(`${STAGING_ORIGIN}${path}`, {
    method,
    headers: {
      ...headers(token),
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) {
    throw new Error(`Staging ${method} ${path.split("?")[0]} failed with ${response.status}`);
  }
  return payload;
}

async function rawRest(table, query, token = "") {
  const params = new URLSearchParams(query);
  const started = performance.now();
  const response = await fetch(`${STAGING_ORIGIN}/rest/v1/${table}?${params}`, {
    headers: headers(token)
  });
  const text = await response.text();
  const elapsedMs = performance.now() - started;
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  return {
    ok: response.ok,
    status: response.status,
    payload,
    bytes: Buffer.byteLength(text),
    elapsedMs
  };
}

async function passwordSession() {
  const payload = await jsonRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email: QA_EMAIL, password: QA_PASSWORD }
  });
  assert(payload?.access_token, "Password login did not return an access token");
  assert(String(decodeJwt(payload.access_token).aal || "aal1") === "aal1", "Password session is not AAL1");
  return payload;
}

async function aal2Session(passwordToken) {
  const challenge = await jsonRequest(`/auth/v1/factors/${encodeURIComponent(QA_FACTOR_ID)}/challenge`, {
    token: passwordToken,
    method: "POST",
    body: { factorId: QA_FACTOR_ID }
  });
  assert(challenge?.id, "TOTP challenge was not created");
  const verified = await jsonRequest(`/auth/v1/factors/${encodeURIComponent(QA_FACTOR_ID)}/verify`, {
    token: passwordToken,
    method: "POST",
    body: { challenge_id: String(challenge.id), code: await freshTotpCode(QA_TOTP_SECRET) }
  });
  const session = verified?.session || verified;
  assert(session?.access_token, "TOTP verification did not return a token");
  assert(decodeJwt(session.access_token).aal === "aal2", "Trainer session did not reach AAL2");
  return session;
}

function queryForContract(contract, { offset, limit }) {
  return {
    select: contract.select,
    order: contract.order,
    ...contract.predicates,
    offset: String(offset),
    limit: String(limit)
  };
}

async function readContractSource(source, token, metrics) {
  const contract = getTrainerAttentionReadContract()[source];
  const rows = await collectTrainerAttentionPages(async ({ offset, limit, page }) => {
    const response = await rawRest(contract.table, queryForContract(contract, { offset, limit }), token);
    assert(response.ok, `${source} read failed with ${response.status}`);
    assert(Array.isArray(response.payload), `${source} read did not return an array`);
    metrics.push({ source, page, rows: response.payload.length, bytes: response.bytes, ms: response.elapsedMs });
    return response.payload;
  }, { pageSize: PAGE_SIZE });
  return rows;
}

async function readExactSnapshot(token, metrics = []) {
  const readResults = {};
  for (const source of getTrainerAttentionSourceKeys()) {
    readResults[source] = { data: await readContractSource(source, token, metrics), error: null };
  }
  return assembleTrainerAttentionSnapshot(readResults);
}

async function assertAal1Denied(token) {
  const snapshot = await readExactSnapshot(token, []);
  for (const source of getTrainerAttentionSourceKeys()) {
    assert(snapshot[source].length === 0, `AAL1 trainer can read ${source}`);
  }
}

async function assertAnonDenied() {
  const contract = getTrainerAttentionReadContract();
  for (const source of getTrainerAttentionSourceKeys()) {
    const item = contract[source];
    const response = await rawRest(item.table, { select: item.select, limit: "1", ...item.predicates });
    assert([401, 403].includes(response.status), `Anon unexpectedly reached ${source} with HTTP ${response.status}`);
  }
}

async function assertTenantIsolation(token) {
  for (const id of FOREIGN_SEED_CLIENT_IDS) {
    const response = await rawRest("clients", {
      id: `eq.${id}`,
      deleted_at: "is.null",
      select: "id"
    }, token);
    assert(response.ok, `Foreign-client isolation probe failed with ${response.status}`);
    assert(Array.isArray(response.payload) && response.payload.length === 0,
      "QA trainer can see a foreign seeded client");
  }
}

async function assertSoftDeleteBoundary(token) {
  const contract = getTrainerAttentionReadContract();
  for (const source of ["clients", "sessions", "trainingLoad", "preSessionChecks", "guidanceEvents"]) {
    const item = contract[source];
    assert(item.predicates.deleted_at === "is.null", `${source} contract lost deleted_at=is.null`);
    assert(!item.transfer.includes("deleted_at"), `${source} transfers deleted_at unnecessarily`);
    const response = await rawRest(item.table, {
      select: "id",
      deleted_at: "not.is.null",
      limit: "1"
    }, token);
    assert(response.ok, `${source} soft-delete probe failed with ${response.status}`);
    assert(Array.isArray(response.payload) && response.payload.length === 0,
      `${source} exposed a soft-deleted row through trainer RLS`);
  }
}

function semanticSignalKey(signal) {
  if ((signal?.id || signal?.signalId) && (signal?.source || signal?.sourceType) && signal?.sourceId) {
    return [signal.id || signal.signalId, signal.sourceType || signal.source, signal.sourceId].map(String).join("::");
  }
  return String(signal?.signalKey || "");
}

async function perClientOpenSignalSemantics(token, clientId) {
  const byClient = { client_id: `eq.${clientId}`, deleted_at: "is.null" };
  const read = async (table, query) => {
    const response = await rawRest(table, query, token);
    assert(response.ok, `Per-client parity read ${table} failed with ${response.status}`);
    assert(Array.isArray(response.payload), `Per-client parity read ${table} is not an array`);
    return response.payload;
  };
  const [sessions, trainingLoad, preSessionChecks, guidanceEvents, signalReviews] = await Promise.all([
    read("sessions", { ...byClient, select: "*", order: "date.desc" }),
    read("training_load_observations", { ...byClient, select: "*", order: "observed_at.desc" }),
    read("pre_session_checks", { ...byClient, select: "*", order: "check_date.desc" }),
    read("guidance_events", {
      ...byClient,
      kind: "eq.client_checkin",
      select: "id,client_id,event_date,payload,created_at",
      order: "event_date.desc,created_at.desc"
    }),
    read("trainer_signal_reviews", {
      client_id: `eq.${clientId}`,
      select: "*",
      order: "reviewed_at.desc,created_at.desc"
    })
  ]);
  const workspace = { sessions, trainingLoad, preSessionChecks, guidanceEvents, signalReviews };
  const generated = collectWorkspaceSignals(workspace);
  const open = withoutReviewedSignals(generated, signalReviews);
  return new Set(open.signals
    .filter(signal => signal.level !== "information" || signal.contactReviewId)
    .map(semanticSignalKey));
}

async function assertPerClientParity(token, snapshot, model) {
  for (const client of snapshot.clients) {
    const expected = await perClientOpenSignalSemantics(token, client.id);
    const actual = new Set(model.attention
      .filter(item => String(item.clientId) === String(client.id) && item.kind !== "review")
      .map(semanticSignalKey));
    assert(JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort()),
      `Attention parity mismatch for client ${client.id}`);
  }
}

async function run() {
  assert(PUBLISHABLE_KEY.length >= 40, "Missing staging publishable key");
  assert(QA_EMAIL && QA_PASSWORD && QA_TOTP_SECRET && QA_FACTOR_ID,
    "QA credentials or ephemeral MFA handoff are missing");

  const password = await passwordSession();
  await assertAal1Denied(password.access_token);
  await assertAnonDenied();

  const aal2 = await aal2Session(password.access_token);
  await assertTenantIsolation(aal2.access_token);
  await assertSoftDeleteBoundary(aal2.access_token);

  const metrics = [];
  const snapshot = await readExactSnapshot(aal2.access_token, metrics);
  assert(snapshot.clients.length > 0, "AAL2 QA trainer sees no clients on canonical staging");
  const sourceRows = snapshot.sessions.length + snapshot.trainingLoad.length
    + snapshot.preSessionChecks.length + snapshot.guidanceEvents.length;
  assert(sourceRows > 0, "Canonical staging has no non-client source rows to validate real-data serialization");

  const model = buildTrainerAttentionModel(snapshot, { today: studioToday(), reviewSoonDays: 7 });
  await assertPerClientParity(aal2.access_token, snapshot, model);

  const sourceSummary = Object.fromEntries(getTrainerAttentionSourceKeys().map(source => [source, snapshot[source].length]));
  const metricSummary = {};
  for (const item of metrics) {
    const current = metricSummary[item.source] || { pages: 0, rows: 0, bytes: 0, ms: 0 };
    current.pages += 1;
    current.rows += item.rows;
    current.bytes += item.bytes;
    current.ms += item.ms;
    metricSummary[item.source] = current;
  }
  for (const value of Object.values(metricSummary)) value.ms = Number(value.ms.toFixed(1));

  const evidence = {
    status: "PASS",
    projectRef: STAGING_REF,
    headSafety: "read-only application data verification",
    auth: { anon: "DENIED", trainerAal1: "DENIED", trainerAal2: "ALLOWED" },
    tenantIsolation: "PASS",
    softDeleteBoundary: "PASS",
    perClientSignalParity: "PASS",
    businessDate: studioToday(),
    sourceRows: sourceSummary,
    attentionCounts: model.counts,
    transport: metricSummary
  };

  await mkdir(ARTIFACT_DIR, { recursive: true });
  await writeFile(`${ARTIFACT_DIR}/trainer-attention-staging-read.json`, JSON.stringify(evidence, null, 2));
  console.log("TRAINER_ATTENTION_STAGING_READ_PASS", JSON.stringify(evidence));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
