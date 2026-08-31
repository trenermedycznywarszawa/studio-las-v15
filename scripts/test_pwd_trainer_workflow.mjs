import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { StudioLasRepository, SupabaseAuth } from "../assets/os/data.js";
import {
  PWD_MAX_OBSERVATIONS,
  PWD_MOVEMENTS,
  PWD_OBSERVATION_TYPES,
  collectPwdObservations,
  pwdDecisionLabel,
  savePwdWorkflow
} from "../assets/os/pwd.js";
import {
  getRuntimeConfig,
  runtimeEnvironmentLabel,
  submitPasswordLogin,
  userSafeError
} from "../assets/os/runtime.js";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const baseMigration = await read("supabase/migrations/20260826101816_pwd_trainer_workflow.sql");
const atomicMigration = await read("supabase/migrations/20260831091634_atomic_pwd_workflow.sql");
const data = await read("assets/os/data.js");
const pwdSource = await read("assets/os/pwd.js");
const app = await read("assets/os/app.js");
const formSource = await read("assets/os/ui/pwd-form.js");
const sectionSource = await read("assets/os/ui/pwd-section.js");
const trainer = await read("assets/os/ui/trainer.js");
const common = await read("assets/os/ui/common.js");

assert.equal(PWD_MOVEMENTS.length, 7);
assert.equal(PWD_MAX_OBSERVATIONS, 3);
assert.deepEqual(Object.keys(PWD_OBSERVATION_TYPES), ["reference", "goal_task", "trainer_observation"]);
assert.deepEqual(collectPwdObservations({}), []);

const customObservation = collectPwdObservations({
  pwdObservationType_0: "trainer_observation",
  pwdObservationName_0: "Spontaniczna zmiana sposobu wstawania",
  pwdObservationNoticed_0: "Klient wybrał spokojniejsze tempo",
  pwdObservationReaction_0: "Ruch był łatwiejszy"
});
assert.equal(customObservation[0].testId, "pwd:trainer_observation");
assert.equal(customObservation[0].reaction, "Ruch był łatwiejszy");

const referenceObservation = collectPwdObservations({
  pwdObservationType_0: "reference",
  pwdObservationReference_0: "sock",
  pwdObservationNoticed_0: "Ruch zapisany do późniejszego porównania"
});
assert.equal(referenceObservation[0].testName, "Skarpetka bez podparcia");
assert.equal(referenceObservation[0].referenceId, "sock");

const threeObservations = {
  pwdObservationType_0: "goal_task",
  pwdObservationName_0: "Wejście po schodach",
  pwdObservationNoticed_0: "Sygnał 1",
  pwdObservationType_1: "trainer_observation",
  pwdObservationName_1: "Obserwacja 2",
  pwdObservationNoticed_1: "Sygnał 2",
  pwdObservationType_2: "trainer_observation",
  pwdObservationName_2: "Obserwacja 3",
  pwdObservationNoticed_2: "Sygnał 3"
};
assert.equal(collectPwdObservations(threeObservations).length, 3);
assert.throws(() => collectPwdObservations({
  ...threeObservations,
  pwdObservationType_3: "trainer_observation",
  pwdObservationName_3: "Obserwacja 4",
  pwdObservationNoticed_3: "Sygnał 4"
}), /maksymalnie 3 obserwacje/);

const basePwd = {
  date: "2026-08-31",
  realLifeGoal: "wejść spokojnie po schodach",
  whyImportant: "samodzielne wyjście z domu",
  contextBoundaries: "bez presji i bez automatycznej interpretacji",
  trainerInterpretation: "syntetyczna interpretacja trenera",
  trainerDecision: "clarify_or_observe",
  nextStep: "wrócić do pytania na kolejnej rozmowie"
};

function atomicRepositoryRecorder(result = {
  sessionId: "synthetic-session",
  observationCount: 0,
  decisionLabel: "Dodatkowe wyjaśnienie lub obserwacja"
}) {
  const calls = [];
  const forbidden = operation => async () => {
    throw new Error("forbidden sequential operation: " + operation);
  };
  return {
    calls,
    savePwdWorkflow: async (clientId, input) => {
      calls.push(["savePwdWorkflow", clientId, input]);
      return result;
    },
    updateClient: forbidden("updateClient"),
    saveSession: forbidden("saveSession"),
    saveAssessment: forbidden("saveAssessment")
  };
}

const undecided = atomicRepositoryRecorder();
await assert.rejects(
  savePwdWorkflow(undecided, "synthetic-client", { ...basePwd, trainerDecision: "" }),
  /Wybierz decyzję/
);
assert.deepEqual(undecided.calls, []);

const zeroRepository = atomicRepositoryRecorder();
const zeroResult = await savePwdWorkflow(zeroRepository, "synthetic-client", basePwd);
assert.equal(zeroRepository.calls.length, 1);
assert.equal(zeroRepository.calls[0][0], "savePwdWorkflow");
assert.equal(zeroRepository.calls[0][2].observations.length, 0);
assert.equal(zeroResult.sessionId, "synthetic-session");

const observedRepository = atomicRepositoryRecorder({
  sessionId: "synthetic-session-2",
  observationCount: 3,
  decisionLabel: "Dalsze prowadzenie"
});
await savePwdWorkflow(observedRepository, "synthetic-client", {
  ...basePwd,
  trainerDecision: "continue_guidance",
  ...threeObservations
});
const sentPayload = observedRepository.calls[0][2];
assert.equal(sentPayload.observations.length, 3);
assert.equal(sentPayload.observations[0].observationType, "goal_task");
assert.equal(sentPayload.observations[0].name, "Wejście po schodach");
assert.equal(sentPayload.realLifeGoal, basePwd.realLifeGoal);
assert.notEqual(sentPayload.realLifeGoal, "Dalsze prowadzenie");

const rpcCalls = [];
const repository = new StudioLasRepository(
  { supabaseUrl: "https://synthetic.invalid" },
  { request: async (path, options) => {
    rpcCalls.push([path, options]);
    return { sessionId: "rpc-session", observationCount: 0 };
  } }
);
await repository.savePwdWorkflow("synthetic-client", {
  date: basePwd.date,
  realLifeGoal: basePwd.realLifeGoal,
  whyImportant: basePwd.whyImportant,
  contextBoundaries: basePwd.contextBoundaries,
  trainerInterpretation: basePwd.trainerInterpretation,
  trainerDecision: basePwd.trainerDecision,
  nextStep: basePwd.nextStep,
  observations: []
});
assert.equal(rpcCalls.length, 1);
assert.equal(rpcCalls[0][0], "/rest/v1/rpc/save_pwd_workflow");
assert.equal(rpcCalls[0][1].body.p_client_id, "synthetic-client");

assert.equal(pwdDecisionLabel("continue_guidance"), "Dalsze prowadzenie");
assert.throws(() => pwdDecisionLabel(""), /Wybierz decyzję/);
assert.match(baseMigration, /session_type in \('session', 'pwd'\)/);
for (const fragment of [
  "add column if not exists session_id uuid references public.sessions(id)",
  "add column if not exists observation_type text",
  "add column if not exists reaction_text text",
  "create or replace function public.save_pwd_workflow(",
  "security definer",
  "set search_path = pg_catalog, public, private",
  "coalesce(auth.jwt() ->> 'aal', '') <> 'aal2'",
  "private.trainer_owns_client(p_client_id)",
  "jsonb_array_length(v_observations)",
  "'obserwuj'",
  "revoke all on function public.save_pwd_workflow",
  "grant execute on function public.save_pwd_workflow"
]) assert.ok(atomicMigration.includes(fragment), "missing atomic migration fragment: " + fragment);

const rpcBody = atomicMigration.slice(
  atomicMigration.indexOf("create or replace function public.save_pwd_workflow("),
  atomicMigration.indexOf("revoke all on function public.save_pwd_workflow")
);
assert.doesNotMatch(rpcBody, /home_plans|home_plan_items|guidance_events/);
assert.doesNotMatch(rpcBody, /trainer_decision,\s*v_decision_label/);
assert.match(rpcBody, /trainer_decision,\s*next_step,\s*trainer_note[\s\S]*'obserwuj',\s*null,\s*null/);

assert.match(formSource, /Co chcesz móc robić swobodniej\?/);
assert.match(formSource, /Dodaj obserwację/);
assert.match(formSource, /activeSlots\.size >= PWD_MAX_OBSERVATIONS/);
assert.match(formSource, /Wybierz decyzję i następny krok…/);
assert.match(formSource, /addObservationButton\.focus/);
assert.match(sectionSource, /item\.session_id === session\.id/);
assert.match(sectionSource, /observation\.reaction_text/);
assert.match(sectionSource, /PWD_OBSERVATION_TYPES\[observation\.observation_type\]/);
assert.match(trainer, /!item\.observation_type/);
assert.match(trainer, /pwdSection\(workspace, model\)/);
assert.match(app, /onSavePwd:[\s\S]*savePwdWorkflow\(state\.repository, state\.activeClientId, values\)/);
const pwdHandler = app.slice(app.indexOf("onSavePwd:"), app.indexOf("onSaveSession:"));
assert.doesNotMatch(pwdHandler, /saveHomePlan|publishHomePlanGuidance|withdrawHomePlanGuidance/);
assert.doesNotMatch(pwdSource, /repository\.(updateClient|saveSession|saveAssessment)/);
assert.match(data, /"save_pwd_workflow"/);
assert.match(common, /runtimeEnvironmentLabel\(environment\)/);

const key = "p".repeat(40);
const originalWindow = globalThis.window;
const setRuntimeConfig = ({ mode, projectRef, url }) => {
  globalThis.window = { STUDIO_LAS_CONFIG: { mode, supabase: { projectRef, url, publishableKey: key } } };
};
setRuntimeConfig({
  mode: "staging",
  projectRef: "ulauyoqjoetjqktegeuq",
  url: "https://ulauyoqjoetjqktegeuq.supabase.co"
});
assert.equal(runtimeEnvironmentLabel(getRuntimeConfig().mode), "STAGING / QA");
setRuntimeConfig({ mode: "staging", projectRef: "foreign", url: "https://foreign.supabase.co" });
assert.throws(() => getRuntimeConfig(), /Błędna konfiguracja stagingu/);
setRuntimeConfig({
  mode: "production",
  projectRef: "ufcumhbnuyernuwepcij",
  url: "https://ufcumhbnuyernuwepcij.supabase.co"
});
assert.equal(runtimeEnvironmentLabel(getRuntimeConfig().mode), "PRODUKCJA");
setRuntimeConfig({
  mode: "production",
  projectRef: "ulauyoqjoetjqktegeuq",
  url: "https://ulauyoqjoetjqktegeuq.supabase.co"
});
assert.throws(() => getRuntimeConfig(), /Błędna konfiguracja production/);
setRuntimeConfig({
  mode: "preview",
  projectRef: "ulauyoqjoetjqktegeuq",
  url: "https://ulauyoqjoetjqktegeuq.supabase.co"
});
assert.throws(() => getRuntimeConfig(), /Nieobsługiwane środowisko/);
globalThis.window = originalWindow;

const loginCalls = [];
await submitPasswordLogin({
  signInWithPassword: async (...args) => loginCalls.push(args)
}, { email: " qa-trainer@example.test ", password: "synthetic-password" });
assert.equal(loginCalls.length, 1);
assert.deepEqual(loginCalls[0], [
  "qa-trainer@example.test",
  "synthetic-password",
  { persist: false }
]);

const originalSessionStorage = globalThis.sessionStorage;
const originalFetch = globalThis.fetch;
let coldStartRequests = 0;
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.fetch = async () => {
  coldStartRequests += 1;
  throw new Error("cold start must not fetch without a session");
};
assert.equal(await new SupabaseAuth({}).restore(), null);
assert.equal(coldStartRequests, 0);
globalThis.sessionStorage = originalSessionStorage;
globalThis.fetch = originalFetch;
assert.match(userSafeError(new TypeError("Failed to fetch"), "staging"), /STAGING \/ QA/);

console.log("PWD_TRAINER_WORKFLOW_SUCCESS atomic client/domain/static contract PASS; SQL integration is separate");