import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
let passed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
  passed += 1;
}

const domainSource = await read("assets/os/inquiries.js");
const domain = await import(`data:text/javascript;base64,${Buffer.from(domainSource).toString("base64")}`);

const goals = [
  "Swobodniejsze poruszanie się na co dzień",
  "Powrót do aktywności lub sportu",
  "Siła i kondycja po przerwie",
  "Większa pewność w ruchu",
  "Chcę najpierw porozmawiać"
];
for (const broad_goal of goals) {
  const brief = domain.buildInquiryCallBrief({ broad_goal });
  assert(Array.isArray(brief.questions) && brief.questions.length === 4, `brief questions missing for ${broad_goal}`);
  assert(brief.guardrail.includes("Nie zakładaj diagnozy"), `guardrail missing for ${broad_goal}`);
}
assert(domain.decisionNextAction("PWD").type === "arrange_pwd", "PWD does not map to arrange_pwd");
assert(domain.decisionNextAction("REFERRED").type === "referral", "REFERRED does not map to referral");
assert(domain.decisionNextAction("NOT_NOW").type === null, "NOT_NOW creates an automatic next action");
assert(domain.decisionNextAction("FOLLOW_UP", { followUpChannel: "message", followUpAt: "2026-09-02T18:00" }).type === "contact_message", "FOLLOW_UP channel mapping failed");

const data = await read("assets/os/inquiries-data.js");
assert(data.includes('method: "GET"'), "inquiry repository has no bounded read path");
assert(data.includes("set_inquiry_contact_state"), "contact-state RPC missing");
assert(data.includes("save_inquiry_decision"), "decision RPC missing");
assert(data.includes("convert_inquiry_to_pwd_client"), "conversion RPC missing");
assert(!/service[_-]?role/i.test(data), "browser inquiry data layer references service role");
assert(!data.includes('method: "PATCH"') && !data.includes('method: "DELETE"'), "browser inquiry layer directly mutates protected tables");

const ui = await read("assets/os/ui/inquiries-section.js");
assert(ui.includes('value: "", label: "Wybierz dopiero po rozmowie"'), "decision UI does not fail open with an empty choice");
assert(ui.includes("Utwórz klienta do PWD"), "explicit conversion action missing");
assert(ui.includes("Sam zapis tej decyzji nie tworzy klienta"), "PWD recommendation/conversion boundary missing in UI");
assert(ui.includes('["Następny krok", formatNextAction(inquiry)]'), "agreed current next action is not visible in inquiry summary");
assert(ui.includes("Następny krok: ${formatNextAction(item)}"), "decision history does not preserve visible next-action context");
assert(!/score|conversion probability|lead score/i.test(ui), "CRM/scoring language found in inquiry UI");

const migration = (await read("supabase/migrations/20260901120053_stage2_production_runtime.sql")).toLowerCase();
for (const fragment of [
  "create table public.inquiries",
  "create table public.inquiry_decisions",
  "force row level security",
  "as restrictive",
  "revoke all on table public.inquiries from public, anon, authenticated",
  "grant select on table public.inquiries to authenticated",
  "security definer",
  "set search_path = pg_catalog, public, private",
  "save_inquiry_decision",
  "convert_inquiry_to_pwd_client",
  "coalesce(auth.jwt() ->> 'aal', '') <> 'aal2'",
  "private.trainer_owns_inquiry",
  "inquiry_decisions_one_active_idx",
  "constraint inquiry_decisions_unique_supersedes unique (supersedes_decision_id)",
  "revoke all on function private.trainer_owns_inquiry(uuid) from public, anon, authenticated",
  "'pwd', 'follow_up', 'not_now', 'referred', 'not_a_fit', 'closed_by_person'",
  "'pending', 'contacting', 'completed', 'unreachable'"
]) assert(migration.includes(fragment), `migration missing: ${fragment}`);
assert(!migration.includes("travel_area") && !migration.includes("commute"), "removed travel/commute field returned to schema");
assert(!migration.includes("pain_scale") && !migration.includes("diagnosis"), "health/diagnostic field leaked into inquiry schema");

const hardening = (await read("supabase/migrations/20260901121326_stage2_runtime_closed_inquiry_hardening.sql")).toLowerCase();
assert(hardening.includes("closed inquiry requires a new trainer decision to reopen"), "closed inquiry reopen hardening missing");

const fixture = (await read("supabase/dev/staging_stage2_inquiry_e2e.sql")).toLowerCase();
assert(fixture.includes("staging / qa only"), "staging fixture is not explicitly isolated");
assert(fixture.includes("qa inquiry (synthetic)"), "synthetic inquiry guard missing");
assert(fixture.includes("refusing cleanup"), "fixture cleanup does not fail closed");

const sqlSecurity = (await read("supabase/tests/20260901_stage2_production_runtime_security.sql")).toLowerCase();
for (const fragment of [
  "set local role anon",
  "'aal', 'aal1'",
  "'aal', 'aal2'",
  "cross-trainer isolation",
  "unreachable decision mutated history",
  "empty rationale mutated decision history",
  "decision history/supersession is not truthful",
  "pwd decision created a client before explicit conversion",
  "failed conversion left partial state",
  "repeated conversion is not safely idempotent",
  "conversion copied non-allowlisted process/health data",
  "conversion created % forbidden downstream rows",
  "closed inquiry was silently reopened",
  "security_audit_events",
  "rollback;",
  "stage2_sql_security_success 20/20 pass"
]) assert(sqlSecurity.includes(fragment), `focused SQL/security test missing: ${fragment}`);
assert(!sqlSecurity.includes("commit;"), "focused SQL/security test may persist synthetic rows");

const app = await read("assets/os/app.js");
assert(app.includes("InquiryController"), "trainer runtime does not integrate inquiry controller");
assert(app.includes('root.querySelector(".workspace")'), "inquiry workspace is not integrated into trainer workspace");

console.log(`STAGE2_PRODUCTION_RUNTIME_SUCCESS ${passed}/${passed} PASS`);