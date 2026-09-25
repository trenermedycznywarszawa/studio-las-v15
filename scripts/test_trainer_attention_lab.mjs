import assert from "node:assert/strict";
import {
  trainerAttentionLabModel,
  trainerAttentionLabSnapshot
} from "../tools/trainer-attention-lab.js";

assert.equal(trainerAttentionLabSnapshot.clients.length, 6, "lab fixture should load all synthetic clients");
assert.equal(trainerAttentionLabModel.today, "2026-09-25", "lab model should build with the explicit business date");
assert(trainerAttentionLabModel.attention.length > 0, "lab fixture should render at least one attention situation");
assert(trainerAttentionLabModel.attention.some(item => item.kind === "contact"), "lab fixture should preserve the synthetic unresolved contact");

console.log("TRAINER_ATTENTION_LAB_PASS");
