const SOURCE_KEYS = Object.freeze([
  "clients",
  "sessions",
  "trainingLoad",
  "preSessionChecks",
  "guidanceEvents",
  "signalReviews"
]);

const REQUIRED_VALUE_FIELDS = Object.freeze({
  clients: Object.freeze(["id", "name", "status"]),
  sessions: Object.freeze(["id", "client_id", "date", "updated_at"]),
  trainingLoad: Object.freeze(["id", "client_id", "observed_at", "updated_at"]),
  preSessionChecks: Object.freeze(["id", "client_id", "check_date", "updated_at"]),
  guidanceEvents: Object.freeze(["id", "client_id", "event_date", "created_at"]),
  signalReviews: Object.freeze(["id", "client_id", "signal_key", "outcome"])
});

const READ_CONTRACT = Object.freeze({
  clients: Object.freeze({
    table: "clients",
    order: "id.asc",
    predicates: Object.freeze({ deleted_at: "is.null" }),
    select: "id,name,status,stage,next_session_date,next_review_date",
    transfer: Object.freeze(["id", "name", "status", "stage", "next_session_date", "next_review_date"])
  }),
  sessions: Object.freeze({
    table: "sessions",
    order: "id.asc",
    predicates: Object.freeze({ deleted_at: "is.null" }),
    select: "id,client_id,date,vas_before,vas_after,readiness,sleep_quality,updated_at",
    transfer: Object.freeze(["id", "client_id", "date", "vas_before", "vas_after", "readiness", "sleep_quality", "updated_at"])
  }),
  trainingLoad: Object.freeze({
    table: "training_load_observations",
    order: "id.asc",
    predicates: Object.freeze({ deleted_at: "is.null" }),
    select: "id,client_id,observed_at,rpe,zone_high_min,updated_at",
    transfer: Object.freeze(["id", "client_id", "observed_at", "rpe", "zone_high_min", "updated_at"])
  }),
  preSessionChecks: Object.freeze({
    table: "pre_session_checks",
    order: "id.asc",
    predicates: Object.freeze({ deleted_at: "is.null" }),
    select: "id,client_id,check_date,red_flag_concern,new_symptoms,updated_at",
    transfer: Object.freeze(["id", "client_id", "check_date", "red_flag_concern", "new_symptoms", "updated_at"])
  }),
  guidanceEvents: Object.freeze({
    table: "guidance_events",
    order: "id.asc",
    predicates: Object.freeze({ deleted_at: "is.null", kind: "in.(client_checkin,client_contact_request)" }),
    select: "id,client_id,event_date,created_at,note:payload->>note,contact_requested:payload->>contact_requested",
    transfer: Object.freeze(["id", "client_id", "event_date", "created_at", "note", "contact_requested"])
  }),
  signalReviews: Object.freeze({
    table: "trainer_signal_reviews",
    order: "id.asc",
    predicates: Object.freeze({}),
    select: "id,client_id,signal_key,outcome,contact_resolved_at",
    transfer: Object.freeze(["id", "client_id", "signal_key", "outcome", "contact_resolved_at"])
  })
});

// Keep the cross-client boundary strict enough that serialization/mapping mistakes
// cannot silently become a quiet client or a false urgent alert. These are DB scalar
// shapes, not domain thresholds; threshold semantics remain in decision-support.js.
const TRANSFER_TYPES = Object.freeze({
  clients: Object.freeze({
    id: "string",
    name: "string",
    status: "string",
    stage: "nullable-number",
    next_session_date: "nullable-string",
    next_review_date: "nullable-string"
  }),
  sessions: Object.freeze({
    id: "string",
    client_id: "string",
    date: "string",
    vas_before: "nullable-number",
    vas_after: "nullable-number",
    readiness: "nullable-number",
    sleep_quality: "nullable-string",
    updated_at: "string"
  }),
  trainingLoad: Object.freeze({
    id: "string",
    client_id: "string",
    observed_at: "string",
    rpe: "nullable-number",
    zone_high_min: "nullable-number",
    updated_at: "string"
  }),
  preSessionChecks: Object.freeze({
    id: "string",
    client_id: "string",
    check_date: "string",
    red_flag_concern: "boolean",
    new_symptoms: "boolean",
    updated_at: "string"
  }),
  guidanceEvents: Object.freeze({
    id: "string",
    client_id: "string",
    event_date: "string",
    created_at: "string",
    note: "nullable-string",
    contact_requested: "nullable-string"
  }),
  signalReviews: Object.freeze({
    id: "string",
    client_id: "string",
    signal_key: "string",
    outcome: "string",
    contact_resolved_at: "nullable-string"
  })
});

const REVIEW_OUTCOMES = new Set([
  "noted_no_change",
  "changed_guidance",
  "outdated",
  "contact_required"
]);

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function requireTransferValue(row, field, source, index) {
  if (!hasOwn(row, field)) {
    throw new TypeError(`Trainer Attention snapshot: ${source}[${index}] is missing ${field}`);
  }
  if (row[field] === undefined) {
    throw new TypeError(`Trainer Attention snapshot: ${source}[${index}].${field} is undefined`);
  }
}

function requireValue(row, field, source, index) {
  requireTransferValue(row, field, source, index);
  const value = row[field];
  if (value === null || (typeof value === "string" && !value.trim())) {
    throw new TypeError(`Trainer Attention snapshot: ${source}[${index}].${field} is empty`);
  }
}

function typeMatches(value, expected) {
  if (expected === "string") return typeof value === "string";
  if (expected === "number") return typeof value === "number" && Number.isFinite(value);
  if (expected === "boolean") return typeof value === "boolean";
  if (expected === "nullable-string") return value === null || typeof value === "string";
  if (expected === "nullable-number") return value === null || (typeof value === "number" && Number.isFinite(value));
  if (expected === "nullable-boolean") return value === null || typeof value === "boolean";
  return false;
}

function expectedTypeLabel(expected) {
  if (expected.startsWith("nullable-")) return `${expected.slice("nullable-".length)} or null`;
  return expected;
}

function validateTransferTypes(source, row, index) {
  const fieldTypes = TRANSFER_TYPES[source] || {};
  for (const [field, expected] of Object.entries(fieldTypes)) {
    const value = row[field];
    if (!typeMatches(value, expected)) {
      throw new TypeError(
        `Trainer Attention snapshot: ${source}[${index}].${field} must be ${expectedTypeLabel(expected)}`
      );
    }
  }
}

function validateRows(source, rows) {
  const contract = READ_CONTRACT[source];
  const requiredValues = REQUIRED_VALUE_FIELDS[source];
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new TypeError(`Trainer Attention snapshot: ${source}[${index}] is not an object`);
    }

    // Every transferred field must be present and must not be undefined so a
    // projection/mapping regression cannot silently turn a signal-bearing value
    // into "no signal". Explicit null remains valid only for schema-nullable fields.
    for (const field of contract.transfer) {
      requireTransferValue(row, field, source, index);
    }
    for (const field of requiredValues) {
      requireValue(row, field, source, index);
    }
    validateTransferTypes(source, row, index);

    if (source === "signalReviews" && !REVIEW_OUTCOMES.has(row.outcome)) {
      throw new TypeError(`Trainer Attention snapshot: ${source}[${index}].outcome is invalid`);
    }
  });
}

function validateClientReferences(snapshot) {
  const clientIds = new Set(snapshot.clients.map(client => String(client.id)));
  for (const source of SOURCE_KEYS.slice(1)) {
    snapshot[source].forEach((row, index) => {
      if (!clientIds.has(String(row.client_id))) {
        throw new TypeError(`Trainer Attention snapshot: ${source}[${index}] references a client outside the snapshot`);
      }
    });
  }
}

export function assertTrainerAttentionSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("Trainer Attention snapshot: snapshot must be an object");
  }

  for (const source of SOURCE_KEYS) {
    if (!hasOwn(snapshot, source)) {
      throw new TypeError(`Trainer Attention snapshot: missing required source ${source}`);
    }
    if (!Array.isArray(snapshot[source])) {
      throw new TypeError(`Trainer Attention snapshot: ${source} must be an array`);
    }
    validateRows(source, snapshot[source]);
  }

  validateClientReferences(snapshot);
  return snapshot;
}

export function assembleTrainerAttentionSnapshot(readResults) {
  if (!readResults || typeof readResults !== "object" || Array.isArray(readResults)) {
    throw new TypeError("Trainer Attention snapshot: read results must be an object");
  }

  const snapshot = {};
  for (const source of SOURCE_KEYS) {
    const result = readResults[source];
    if (!result || typeof result !== "object" || !hasOwn(result, "data")) {
      throw new TypeError(`Trainer Attention snapshot: missing read result ${source}`);
    }
    if (result.error) {
      const message = String(result.error?.message || result.error || "read failed");
      throw new Error(`Trainer Attention snapshot: ${source} read failed: ${message}`);
    }
    snapshot[source] = result.data;
  }

  return Object.freeze(assertTrainerAttentionSnapshot(snapshot));
}

export async function collectTrainerAttentionPages(readPage, {
  pageSize = 200,
  maxPages = 10000
} = {}) {
  if (typeof readPage !== "function") {
    throw new TypeError("Trainer Attention pagination: readPage must be a function");
  }
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new TypeError("Trainer Attention pagination: pageSize must be a positive integer");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new TypeError("Trainer Attention pagination: maxPages must be a positive integer");
  }

  const rows = [];
  let offset = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const chunk = await readPage({ offset, limit: pageSize, page });
    if (!Array.isArray(chunk)) {
      throw new TypeError("Trainer Attention pagination: page result must be an array");
    }
    if (chunk.length === 0) return Object.freeze(rows);
    rows.push(...chunk);
    offset += chunk.length;
  }

  throw new Error("Trainer Attention pagination: maxPages reached before an empty page");
}

export function getTrainerAttentionSourceKeys() {
  return SOURCE_KEYS;
}

export function getTrainerAttentionReadContract() {
  return READ_CONTRACT;
}
