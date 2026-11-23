import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { guidanceStartState } from "../assets/os/guidance-start.js";
import { pwdSection } from "../assets/os/ui/pwd-section.js";
import { plansSection } from "../assets/os/ui/trainer-guidance.js";
import { StudioLasRepository } from "../assets/os/data.js";
import { userSafeError } from "../assets/os/runtime.js";

// Synthetic DOM presentation test, not a browser/SQL authorization test.
class SyntheticNode {
  constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this.className = ""; this.events = {}; this.value = ""; }
  set textContent(value) { this.text = String(value ?? ""); this.children = []; }
  get textContent() { return (this.text || "") + this.children.map(node => node.textContent).join(""); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  append(...nodes) { this.children.push(...nodes); }
  addEventListener(event, handler) { this.events[event] = handler; }
  get classList() { return { add: value => { this.className += ` ${value}`; } }; }
  get elements() { return { namedItem: name => this.querySelectorAll("select").find(node => node.attributes.name === name) }; }
  querySelectorAll(selector) {
    return this.children.flatMap(node => [
      ...(selector.startsWith(".") ? node.className.split(/\s+/).includes(selector.slice(1))
        : node.tagName === selector) ? [node] : [], ...node.querySelectorAll(selector)
    ]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
globalThis.Node = SyntheticNode;
globalThis.document = { createElement: tag => new SyntheticNode(tag), createTextNode: text => { const node = new SyntheticNode("text"); node.textContent = text; return node; } };

const session = { id: "pwd-current", session_type: "pwd", date: "2026-11-14", trainer_decision: "Dalsze prowadzenie", client_next_step: "Ustalona konsultacja" };
const gate = (reason, allowed = false) => ({ required: reason !== "publication_history", allowed, reason, pwdSessionId: session.id });
const base = { client: { id: "synthetic" }, sessions: [session], homePlans: [], homePlanItems: [], guidanceEvents: [] };
const render = workspace => ({ pwd: pwdSection(workspace, {}), plans: plansSection(workspace, {}) });
for (const reason of ["pwd_required", "pwd_defers_start"]) {
  for (const decision of ["Odroczenie decyzji lub skierowanie dalej", "Dodatkowe wyjaśnienie lub obserwacja", "Przygotowanie wskazówki później"]) {
    const workspace = { ...base, sessions: reason === "pwd_required" ? [] : [{ ...session, trainer_decision: decision }], guidanceStartGate: gate(reason), homePlans: [
      { id: "draft-unapproved", status: "draft" }, { id: "draft-approved", status: "draft", approved_at: "2026-11-14" }
    ] };
    const { pwd, plans } = render(workspace);
    assert.equal(pwd.querySelector(".first-guidance-form"), null);
    assert.doesNotMatch(plans.textContent, /Utwórz szkic wskazówki|Zatwierdź tę treść|Opublikuj jako aktualną|Edytuj szkic|Dodaj działanie do szkicu/);
    assert.match(pwd.textContent + plans.textContent, /PWD/);
    if (reason === "pwd_defers_start") assert.match(pwd.textContent, /Ustalona konsultacja/);
  }
}
for (const invalid of [undefined, {}, { required: false, allowed: true, reason: "pwd_required" }, gate("unknown", true), { ...gate("pwd_allows_start"), allowed: true, required: false }]) {
  assert.equal(guidanceStartState({ guidanceStartGate: invalid }).allowed, false, "Missing/invalid server state must fail closed");
}
{
  const workspace = { ...base, guidanceStartGate: gate("pwd_allows_start", true) };
  const { pwd, plans } = render(workspace);
  assert.ok(pwd.querySelector(".first-guidance-form"));
  assert.match(plans.textContent, /Utwórz szkic wskazówki/);
  assert.equal(guidanceStartState(workspace).allowed, true);
  const stale = render({ ...workspace, guidanceStartGate: gate("pwd_defers_start") });
  assert.equal(stale.pwd.querySelector(".first-guidance-form"), null, "Fresh server denial after a changed decision hides first composer");
}
{
  const workspace = { ...base, sessions: [], guidanceStartGate: gate("publication_history", true), homePlans: [
    { id: "active", status: "active", published_at: "2026-10-01", guidance_channel: "paper", delivery_status: "paper_retirement_confirmed" },
    { id: "approved", status: "draft", approved_at: "2026-11-14" }
  ] };
  const { pwd, plans } = render(workspace);
  assert.equal(pwd.querySelector(".first-guidance-form"), null, "No first-release composer for an established publication history");
  assert.match(plans.textContent, /Opublikuj jako aktualną wskazówkę/);
  assert.match(plans.textContent, /Wycofaj wskazówkę/);
  assert.match(plans.textContent, /wycofanie poprzedniej kopii papierowej: potwierdzone/i);
  assert.equal(guidanceStartState({ guidanceStartGate: gate("publication_history", true), homePlans: [] }).allowed, true, "Visible plans cannot erase server publication history");
}
// Repository preserves the authoritative snapshot projection; no browser cache.
{
  const expected = gate("pwd_required");
  const repository = new StudioLasRepository({ supabaseUrl: "https://fixture.invalid" }, { request: async path => path.includes("trainer_guidance_snapshot")
    ? { plans: [], items: [], startGate: expected } : [] });
  repository.getClient = async () => base.client;
  const workspace = await repository.getClientWorkspace(base.client.id);
  assert.deepEqual(workspace.guidanceStartGate, expected);
}
// Static SQL contract only; executing SQL and concurrent transactions is separate.
const sql = readFileSync(new URL("../supabase/migrations/20261114180429_first_guidance_pwd_gate.sql", import.meta.url), "utf8");
assert.match(sql, /client_id = p_client_id and published_at is not null/);
assert.match(sql, /order by date desc, created_at desc, id desc/);
assert.match(sql, /pwd\.trainer_decision = 'Dalsze prowadzenie'/);
assert.match(sql, /sessions_first_guidance_lock before insert or update or delete/);
assert.match(sql, /update public\.clients set updated_at = clock_timestamp\(\)/);
assert.match(sql, /guidance_plan_start_gate before insert or update/);
assert.match(sql, /old\.approved_at is null and new\.approved_at is not null/);
assert.match(sql, /old\.published_at is null and new\.published_at is not null/);
assert.match(sql, /perform private\.require_first_guidance_start\(client\)/);
assert.match(sql, /p_expected_revision is null or p.content_revision<>p_expected_revision/);
assert.match(sql, /require_trainer_aal2_for_guidance/);
assert.doesNotMatch(sql, /create table|alter policy|disable trigger|disable row level|grant .* to authenticated/i);
const approval = sql.slice(sql.indexOf("create or replace function public.approve_home_plan_guidance"));
assert.ok(approval.indexOf("from public.clients") < approval.indexOf("deleted_at is null for update"), "Approval uses client-before-plan lock order");
const clientLock = approval.indexOf("perform 1 from public.clients");
const recheck = approval.indexOf("perform private.require_trainer_aal2_for_guidance(p.client_id);", clientLock);
assert.ok(recheck > clientLock && recheck < approval.indexOf("select * into p", clientLock), "Recheck current owner/AAL2 after client lock, before approval");
const clone = sql.slice(sql.indexOf("create or replace function public.clone_home_plan_guidance"), sql.indexOf("create or replace function public.trainer_guidance_snapshot"));
assert.match(clone, /require_trainer_aal2_for_guidance\(source_client\);\s*perform 1 from public.clients[^;]+for update;\s*if not found[^;]+; end if;\s*perform private.require_trainer_aal2_for_guidance\(source_client\);/);
assert.match(clone, /where id=p_home_plan_id and client_id=source_client and deleted_at is null for update/);
assert.ok(clone.indexOf("from public.clients") < clone.indexOf("select * into p"));
assert.match(userSafeError({ status: 400, payload: { code: "23514", message: "first guidance requires a current permitting PWD decision" } }), /Aktualna decyzja PWD/);
assert.match(userSafeError({ status: 403, payload: { code: "42501", message: "owner required" } }), /Nie masz dostępu/);
console.log("PASS: synthetic first-guidance UI denial/allow/history, read projection, SQL static contract. SQL authorization/bypass/concurrency NOT RUN.");
