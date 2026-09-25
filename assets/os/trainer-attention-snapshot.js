const SOURCE_KEYS = Object.freeze([
  "clients",
  "sessions",
  "trainingLoad",
  "preSessionChecks",
  "guidanceEvents",
  "signalReviews"
]);

const REQUIRED_FIELDS = Object.freeze({
  clients: Object.freeze(["id", "name", "status"]),
  sessions: Object.freeze(["id", "client_id", "date", "updated_at"]),
  trainingLoad: Object.freeze(["id", "client_id", "observed_at", "updated_at"]),
  preSessionChecks: Object.freeze(["id", "client_id", "check_date", "updated_at"]),
  guidanceEvents: Object.freeze(["id", "client_id", "event_date", "created_at"]),
  signalReviews: Object.freeze(["id", "client_id", "signal_key", "outcome", "contact_resolved_at"])
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

function requireValue(row, field, source, index) {
  if (!hasOwn(row, field)) {
    throw new TypeError(`Trainer Attention snapshot: ${source}[${index}] is missing ${field}`);
  }
  const value = row[field];
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) {
    throw new TypeError(`Trainer Attention snapshot: ${source}[${index}].${field} is empty`);
  }
}

function validateRows(source, rows) {
  const required = REQUIRED_FIELDS[source];
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new TypeError(`Trainer Attention snapshot: ${source}[${index}] is not an object`);
    }
    for (const field of required) {
      if (source === "signalReviews" && field === "contact_resolved_at") {
        if (!hasOwn(row, field)) {
          throw new TypeError(`Trainer Attention snapshot: ${source}[${index}] is missing ${field}`);
        }
        continue;
      }
      requireValue(row, field, source, index);
    }
    if (source === "signalReviews" && !REVIEW_OUTCOMES.has(String(row.outcome))) {
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
