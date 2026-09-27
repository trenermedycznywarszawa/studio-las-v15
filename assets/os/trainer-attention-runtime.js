import {
  assembleTrainerAttentionSnapshot,
  collectTrainerAttentionPages,
  getTrainerAttentionReadContract,
  getTrainerAttentionSourceKeys
} from "./trainer-attention-snapshot.js";
import { buildTrainerAttentionModel } from "./trainer-attention-model.js";

const STUDIO_TIME_ZONE = "Europe/Warsaw";
const PREVIEW_PARAM = "trainer-ui";
const PREVIEW_VALUE = "attention-v1";
const PAGE_SIZE = 200;

export function studioBusinessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: STUDIO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function trainerAttentionPreviewEnabled(config, locationLike = globalThis.location) {
  if (config?.mode !== "staging") return false;
  const search = String(locationLike?.search || "");
  return new URLSearchParams(search).get(PREVIEW_PARAM) === PREVIEW_VALUE;
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

async function readSource(repository, source) {
  const contract = getTrainerAttentionReadContract()[source];
  return collectTrainerAttentionPages(
    ({ offset, limit }) => repository.rest(contract.table, {
      query: queryForContract(contract, { offset, limit })
    }),
    { pageSize: PAGE_SIZE }
  );
}

export async function loadTrainerAttention(repository, { today = studioBusinessDate() } = {}) {
  if (!repository?.rest) {
    throw new TypeError("Trainer Attention runtime: repository is required");
  }

  const sourceKeys = getTrainerAttentionSourceKeys();
  const results = await Promise.all(sourceKeys.map(async source => {
    const data = await readSource(repository, source);
    return [source, { data, error: null }];
  }));

  const snapshot = assembleTrainerAttentionSnapshot(Object.fromEntries(results));
  const model = buildTrainerAttentionModel(snapshot, { today, reviewSoonDays: 7 });
  return Object.freeze({ snapshot, model });
}

export function trainerAttentionPreviewQuery() {
  return `${PREVIEW_PARAM}=${PREVIEW_VALUE}`;
}
