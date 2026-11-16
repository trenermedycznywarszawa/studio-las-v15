import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clientProcessValues, clientUpdateAction } from "../assets/os/client-update-action.js";
import { StudioLasRepository } from "../assets/os/data.js";
import { TrainerWorkspaceLoader } from "../assets/os/trainer-workspace-loader.js";
import { createRuntimeFeedback } from "../assets/os/ui/runtime-feedback.js";
import { nowPanel } from "../assets/os/ui/trainer-state.js";
import { trainerSectionOrder } from "../assets/os/ui/trainer-order.js";

// Minimal synthetic DOM: run the existing submitForm and feedback, without network.
class SyntheticNode {
  constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this.events = {}; this.className = ""; this.value = ""; }
  set textContent(value) { this.text = String(value ?? ""); this.children = []; }
  get textContent() { return (this.text || "") + this.children.map(node => node.textContent).join(""); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  removeAttribute(key) { delete this.attributes[key]; }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  prepend(node) { node.parent = this; this.children.unshift(node); }
  remove() { this.parent.children = this.parent.children.filter(node => node !== this); }
  addEventListener(event, callback) { this.events[event] = callback; }
  async dispatch(event) { return this.events[event]?.({ preventDefault() {} }); }
  get classList() { return { add: value => { this.className += ` ${value}`; } }; }
  focus() {}
  reportValidity() { return true; }
  reset() { this.didReset = true; }
  querySelectorAll(selector) {
    const match = node => {
      if (selector.startsWith(".")) return node.className.split(/\s+/).includes(selector.slice(1));
      const [tag, attribute, value] = selector.match(/^(\w+)(?:\[(\w+)="([^"]+)"\])?/)?.slice(1) || [];
      return node.tagName === tag && (!attribute || node.attributes[attribute] === value);
    };
    const walk = node => node.children.flatMap(child => [...(match(child) ? [child] : []), ...walk(child)]);
    return walk(this);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
globalThis.Node = SyntheticNode;
const body = new SyntheticNode("body"), app = new SyntheticNode("main"); app.id = "app"; body.append(app);
globalThis.document = {
  body, createElement: tag => new SyntheticNode(tag), createTextNode: text => { const node = new SyntheticNode("text"); node.textContent = text; return node; },
  getElementById: id => [app, ...body.children].find(node => node.id === id)
};
globalThis.window = { setTimeout() {} };
globalThis.FormData = class {
  constructor(form) { this.form = form; }
  entries() { return this.form.querySelectorAll("input").concat(this.form.querySelectorAll("select")).map(node => [node.attributes.name, node.value])[Symbol.iterator](); }
};

const owner = "11111111-1111-4111-8111-111111111111";
const input = { stage: "4", nextSessionDate: "2026-11-20", nextReviewDate: "2026-12-11" };
function setup() {
  let stored = { id: "synthetic-a", owner_trainer_id: owner, name: "Synthetic", stage: 1, next_session_date: "2026-11-14", next_review_date: null };
  const calls = [], controls = {};
  const auth = {
    getAuthenticatorAssuranceLevel: () => controls.aal || "aal2",
    getProfile: async () => { if (controls.preflight) await controls.preflight(); return { id: owner, role: "trainer" }; },
    request: async (path, options) => {
      calls.push({ path, options });
      assert.equal(new URL(path, "https://fixture.invalid").searchParams.get("id"), "eq.synthetic-a");
      if (options.method === "PATCH") {
        if (controls.denied) throw Object.assign(Error("denied"), { status: controls.denied });
        if (controls.empty) return [];
        assert.deepEqual(Object.keys(options.body).sort(), ["next_review_date", "next_session_date", "stage"]);
        stored = { ...stored, ...options.body };
        if (controls.afterPatch) await controls.afterPatch();
        if (controls.uncertain) throw Error("connection lost");
        return [stored];
      }
      if (controls.readError) throw Object.assign(Error("failed read"), { status: 503 });
      return [{ ...stored, owner_trainer_id: controls.otherOwner ? "22222222-2222-4222-8222-222222222222" : owner }];
    }
  };
  const repository = new StudioLasRepository({ supabaseUrl: "https://fixture.invalid" }, auth);
  const state = { repository, profile: { id: owner, role: "trainer" }, activeClientId: stored.id, workspace: { client: { ...stored } }, loading: false, loadError: "", trainerAttentionView: false };
  const loader = new TrainerWorkspaceLoader(state, () => {}), attention = { generation: 0 };
  repository.getClientWorkspace = async id => ({ client: await repository.getClient(id) });
  const feedback = createRuntimeFeedback(() => "staging"); feedback.reset();
  const bind = () => clientUpdateAction(state, loader, attention, feedback.withWrite, id => loader.load(id));
  return { state, loader, attention, controls, calls, feedback, bind, writes: () => calls.filter(call => call.options.method === "PATCH") };
}
function renderForm(x) {
  const panel = nowPanel(x.state.workspace, null, { onUpdateClient: x.bind() });
  return { panel, form: panel.querySelector("form") };
}
{
  const x = setup(), { panel, form } = renderForm(x);
  assert.match(panel.textContent, /1 · Diagnostyka i punkt startowy/);
  assert.equal(form.querySelector("select").value, "1");
  assert.deepEqual(form.querySelectorAll("input").map(node => node.value), ["2026-11-14", ""]);
  form.querySelector("select").value = "4";
  const fields = form.querySelectorAll("input"); fields[0].value = input.nextSessionDate; fields[1].value = input.nextReviewDate;
  await form.querySelector("select").dispatch("change"); await fields[0].dispatch("input");
  assert.equal(x.calls.length, 0, "Render/input/change must never autosave or read");
  await form.dispatch("submit");
  assert.equal(x.writes().length, 1);
  assert.equal(x.state.workspace.client.stage, 4);
  assert.match(document.getElementById("runtime-message").textContent, /zapisano/);
  const refreshed = renderForm(x).form;
  assert.equal(refreshed.querySelector("select").value, "4");
  assert.deepEqual(refreshed.querySelectorAll("input").map(node => node.value), [input.nextSessionDate, input.nextReviewDate]);
  assert.equal(trainerSectionOrder(x.state.workspace.client.stage)[2], "cycleDecision");
  await x.bind()({ stage: "2", nextSessionDate: "", nextReviewDate: "" });
  assert.equal(x.state.workspace.client.next_session_date, null);
  assert.equal(x.state.workspace.client.next_review_date, null);
}
for (const denied of [401, 403]) {
  const x = setup(); x.controls.denied = denied;
  const { form } = renderForm(x);
  await assert.rejects(form.dispatch("submit"), error => error.status === denied && !error.writeUncertain);
  assert.ok(form.querySelector(".form-error"));
  assert.doesNotMatch(document.getElementById("runtime-message").textContent, /: zapisano/);
  assert.equal(x.writes().length, 1); assert.equal(x.state.workspace.client.stage, 1);
}
for (const mode of ["readError", "otherOwner", "aal", "loadError", "loading", "wrongClient", "reload", "tab", "profile", "workspace"]) {
  const x = setup(), action = x.bind();
  if (mode === "aal") x.controls.aal = "aal1";
  else if (["readError", "otherOwner"].includes(mode)) x.controls[mode] = true;
  else if (mode === "loadError") x.state.loadError = "failed";
  else if (mode === "loading") x.state.loading = true;
  else if (mode === "wrongClient") x.state.activeClientId = "synthetic-b";
  else if (mode === "reload") x.loader.reset();
  else if (mode === "tab") x.attention.generation++;
  else if (mode === "profile") x.state.profile = { ...x.state.profile };
  else if (mode === "workspace") x.state.workspace = { ...x.state.workspace };
  await assert.rejects(action(input), error => !error.writeConfirmed && !error.writeUncertain);
  assert.equal(x.writes().length, 0, mode);
}
{
  const x = setup(), action = x.bind(); let release;
  x.controls.preflight = () => new Promise(resolve => { release = resolve; });
  const pending = action(input);
  await assert.rejects(action(input), /Zapis trwa/);
  x.state.activeClientId = "synthetic-b"; x.loader.reset(); release();
  await assert.rejects(pending, /Widok/); assert.equal(x.writes().length, 0);
}
for (const field of ["stage", "nextSessionDate", "nextReviewDate"]) {
  for (const value of field === "stage" ? ["", "0", "5", "1.5", "01", "toString"] : ["2026-02-30", "2025-02-29", "2026-13-01", "0000-01-01", "2026-11-13T00:00:00Z", undefined]) {
    const x = setup(); await assert.rejects(x.bind()({ ...input, [field]: value })); assert.equal(x.calls.length, 0);
  }
}
assert.equal(clientProcessValues({ ...input, nextReviewDate: "2028-02-29", goal: "ignored" }).goal, undefined);
{
  const x = setup(); x.controls.empty = true;
  await assert.rejects(x.bind()(input), error => error.status === 403); assert.equal(x.writes().length, 1);
}
for (const mode of ["refresh", "uncertain", "switchAfterWrite"]) {
  const x = setup();
  x.controls.afterPatch = async () => {
    if (mode === "refresh") x.controls.readError = true;
    if (mode === "switchAfterWrite") { x.state.activeClientId = "synthetic-b"; x.attention.generation++; }
  };
  if (mode === "uncertain") x.controls.uncertain = true;
  let failure;
  await assert.rejects(x.bind()(input), error => { failure = error; return mode === "uncertain" ? error.writeUncertain : error.writeConfirmed; });
  assert.equal(x.writes().length, 1);
  await assert.rejects(x.bind()(input)); assert.equal(x.writes().length, 1, "No mutation retry after uncertain/confirmed write");
  x.controls.readError = false;
  if (mode !== "switchAfterWrite") {
    await failure.retryRefresh(); assert.equal(x.state.workspace.client.stage, 4);
    assert.equal(x.writes().length, 1, "Retry refresh only reads");
  } else await assert.rejects(failure.retryRefresh(), /Widok/);
}
const appSource = readFileSync(new URL("../assets/os/app.js", import.meta.url), "utf8");
assert.match(appSource, /onUpdateClient: clientUpdateAction\(state, trainerLoader, trainerAttentionController, withWrite, loadTrainerWorkspace\)/);
const trainerSource = readFileSync(new URL("../assets/os/ui/trainer.js", import.meta.url), "utf8");
assert.match(trainerSource, /nowPanel\(workspace, model.attentionSignals, model\)/);
console.log("PASS: synthetic form, explicit save/readback, date clearing/validation, denied/empty PATCH, failed read, owner/AAL2, stale context, concurrent submit, no autosave, no write retry, phase order; no PWD/Guidance writes.");
