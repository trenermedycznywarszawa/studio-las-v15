import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260911132813_questionnaire_v3_client_portal_snapshot.sql");
const ui = read("assets/os/ui/client.js");
const questionnaireUi = read("assets/os/ui/client-questionnaires.js");
const runtime = read("assets/os/client-app-runtime.js");
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
assert.match(ui, /snapshot\.questionnaires\?\.length/,
  "Questionnaire section should stay out of the portal when there is no assignment.");
assert.match(ui, /questionnaireList\(snapshot\.questionnaires, questionnaire\)/,
  "Client portal must delegate questionnaire UI to the dedicated questionnaire module.");
assert.match(questionnaireUi, /assigned:\s*"Do wypełnienia"/);
assert.match(questionnaireUi, /in_progress:\s*"W trakcie"/);
assert.match(questionnaireUi, /submitted:\s*"Wypełniona"/);
assert.match(questionnaireUi, /"Wypełnij"/);
assert.match(questionnaireUi, /"Kontynuuj"/);
assert.match(questionnaireUi, /"Przekaż ankietę trenerowi"/);
assert.match(questionnaireUi, /item\.canOpen/,
  "Client UI must fail closed when assignment metadata does not permit opening the version.");
assert.match(runtime, /ClientQuestionnaireController/);
assert.match(runtime, /questionnaire:\s*state\.clientQuestionnaire\?\.model/,
  "Canonical Client Portal runtime must expose questionnaire controller state to the UI.");

for (const source of [ui, questionnaireUi, runtime]) {
  assert.doesNotMatch(source, /ZIELONY|ŻÓŁTY|CZERWONY/,
    "Internal trainer workflow state must not leak into client UI.");
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/i,
    "Questionnaire portal integration must not persist answer data in browser storage.");
}
assert.match(controller, /never persist response text or receipts in browser storage/i);

console.log("Client questionnaire portal integration tests completed");
