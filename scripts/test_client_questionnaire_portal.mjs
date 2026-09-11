import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260911132813_questionnaire_v3_client_portal_snapshot.sql");
const ui = read("assets/os/ui/client.js");
const controller = read("assets/os/client-portal-controller.js");

assert.match(migration, /alter function public\.client_portal_snapshot\(\) set schema private/i);
assert.match(migration, /create function public\.client_portal_snapshot\(\)/i);
assert.match(migration, /'questionnaires', public\.client_questionnaire_assignments\(\)/i);
assert.match(migration, /security invoker/i);
assert.match(migration, /qa\.client_id\s*=\s*\(/i);
assert.doesNotMatch(migration, /'answers'/i,
  "Client portal assignment metadata must not expose response answers.");
assert.match(migration, /revoke all on function private\.client_portal_snapshot\(\) from public, anon, authenticated/i);
assert.match(migration, /grant execute on function public\.client_portal_snapshot\(\) to authenticated/i);

assert.match(ui, /panel\("ANKIETY"/);
assert.match(ui, /assigned:\s*"Do wypełnienia"/);
assert.match(ui, /in_progress:\s*"W trakcie"/);
assert.match(ui, /submitted:\s*"Wypełniona"/);
assert.match(ui, /snapshot\.questionnaires\?\.length/,
  "Questionnaire section should stay out of the portal when there is no assignment.");
assert.doesNotMatch(ui, /ZIELONY|ŻÓŁTY|CZERWONY/,
  "Internal trainer workflow state must not leak into client UI.");
assert.doesNotMatch(ui, /localStorage|sessionStorage|indexedDB/i);
assert.match(controller, /never persist response text or receipts in browser storage/i);

console.log("Client questionnaire portal integration tests completed");
