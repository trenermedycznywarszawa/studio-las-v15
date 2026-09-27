import assert from "node:assert/strict";
import {
  loadTrainerAttention,
  studioBusinessDate,
  trainerAttentionPreviewEnabled,
  trainerAttentionPreviewQuery
} from "../assets/os/trainer-attention-runtime.js";

assert.equal(
  trainerAttentionPreviewEnabled({ mode: "production" }, { search: `?${trainerAttentionPreviewQuery()}` }),
  false,
  "Production must ignore the Trainer Attention preview query"
);
assert.equal(
  trainerAttentionPreviewEnabled({ mode: "staging" }, { search: "?trainer-ui=other" }),
  false,
  "Unknown staging presentation flags must stay off"
);
assert.equal(
  trainerAttentionPreviewEnabled({ mode: "staging" }, { search: `?x=1&${trainerAttentionPreviewQuery()}` }),
  true,
  "Canonical staging flag should enable the preview"
);
assert.equal(
  studioBusinessDate(new Date("2026-09-27T22:30:00Z")),
  "2026-09-28",
  "Business date must follow Europe/Warsaw rather than UTC"
);

let deniedReads = 0;
const aal1Repository = {
  auth: { getAuthenticatorAssuranceLevel: () => "aal1" },
  rest: async () => { deniedReads += 1; return []; }
};
await assert.rejects(
  () => loadTrainerAttention(aal1Repository, { today: "2026-09-27" }),
  error => Number(error?.status) === 403,
  "AAL1 must fail before any cross-client reads"
);
assert.equal(deniedReads, 0, "AAL1 attempted a Trainer Attention source read");

let stableAal2Reads = 0;
const aal2Repository = {
  auth: { getAuthenticatorAssuranceLevel: () => "aal2" },
  rest: async () => { stableAal2Reads += 1; return []; }
};
const empty = await loadTrainerAttention(aal2Repository, { today: "2026-09-27" });
assert.equal(empty.snapshot.clients.length, 0);
assert.equal(empty.model.counts.situations, 0);
assert.equal(stableAal2Reads, 6, "Each empty source should terminate after one page");

let aalChecks = 0;
const downgradeRepository = {
  auth: {
    getAuthenticatorAssuranceLevel: () => (++aalChecks === 1 ? "aal2" : "aal1")
  },
  rest: async () => []
};
await assert.rejects(
  () => loadTrainerAttention(downgradeRepository, { today: "2026-09-27" }),
  error => Number(error?.status) === 403,
  "An AAL downgrade during reads must fail closed instead of rendering a quiet inbox"
);

console.log("TRAINER_ATTENTION_RUNTIME_PASS");
