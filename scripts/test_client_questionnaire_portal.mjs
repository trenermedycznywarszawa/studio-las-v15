import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const migration = read("supabase/migrations/20260911132813_questionnaire_v3_client_portal_snapshot.sql");
const ui = read("assets/os/ui/client.js");
const uiV2 = read("assets/os/ui/client-v2.js");
const questionnaireUi = read("assets/os/ui/client-questionnaires.js");
const runtime = read("assets/os/client-app-runtime.js");
const controller = read("assets/os/client-portal-controller.js");
const questionnaireController = read("assets/os/client-questionnaire-controller.js");
const todayV2Styles = read("assets/os/today-v2.css");

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

// Dzisiaj V2 is a reversible presentation experiment. It must reuse the
// canonical Client Portal controller and remain explicitly opt-in.
assert.match(runtime, /let clientRenderer = renderClient;/,
  "Current client renderer must remain the default path.");
assert.match(runtime, /get\("ui"\) === "today-v2"/,
  "Dzisiaj V2 must require an explicit presentation flag.");
assert.match(runtime, /import\("\.\/ui\/client-v2\.js"\)/,
  "Dzisiaj V2 renderer must be loaded only through the explicit presentation path.");
assert.match(uiV2, /clientResponseForm\(item, model\)/,
  "Dzisiaj V2 must reuse the canonical client response flow.");
assert.match(uiV2, /questionnaireList\(snapshot\.questionnaires, questionnaire\)/,
  "Dzisiaj V2 must preserve the existing questionnaire boundary.");
assert.match(uiV2, /activeQuestionnaire\(questionnaire\)/,
  "Dzisiaj V2 must preserve the existing active questionnaire renderer.");
assert.match(uiV2, /Panel nie diagnozuje i nie zmienia planu automatycznie/,
  "Dzisiaj V2 must state the trainer-responsibility boundary.");
assert.match(todayV2Styles, /@import url\("\.\/design-system\.css"\)/,
  "Dzisiaj V2 runtime styles must be based on the isolated design-system layer.");
assert.doesNotMatch(uiV2, /\bfetch\s*\(/,
  "Dzisiaj V2 presentation layer must not make network requests directly.");
assert.doesNotMatch(uiV2, /Supabase|StudioLasRepository|save_client_checkin|client_portal_snapshot/i,
  "Dzisiaj V2 presentation layer must not bypass the repository/controller boundary.");
assert.doesNotMatch(uiV2, /generateWeeklyDecision|readiness|confidence|progresj|regresj/i,
  "Dzisiaj V2 must not publish autonomous coaching or readiness judgements.");
assert.doesNotMatch(uiV2, /Minimum\s*\/\s*Standard\s*\/\s*Więcej/i,
  "Mockup-only service-dose choices must not silently become a production mechanism.");

const closeMatch = questionnaireController.match(/async close\(\)\s*\{([\s\S]*?)\n  \}\n\n  setAnswer/);
assert.ok(closeMatch, "Questionnaire close must be asynchronous so pending saves can finish.");
const closeBody = closeMatch[1];
const flushIndex = closeBody.indexOf("await this.flushPendingSaves()");
const reloadIndex = closeBody.indexOf("await this.onPortalReload()");
const resetIndex = closeBody.indexOf("this.reset()");
assert.ok(
  flushIndex >= 0 && flushIndex < resetIndex,
  "Questionnaire close must flush the latest autosave before clearing controller state."
);
assert.ok(
  reloadIndex >= 0 && flushIndex < reloadIndex && reloadIndex < resetIndex,
  "Questionnaire close must refresh portal assignment metadata after saving and before closing the form."
);

for (const source of [ui, uiV2, questionnaireUi, runtime]) {
  assert.doesNotMatch(source, /ZIELONY|ŻÓŁTY|CZERWONY/,
    "Internal trainer workflow state must not leak into client UI.");
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/i,
    "Questionnaire portal integration must not persist answer data in browser storage.");
}
assert.match(controller, /never persist response text or receipts in browser storage/i);

console.log("Client questionnaire portal + Dzisiaj V2 presentation boundary tests completed");