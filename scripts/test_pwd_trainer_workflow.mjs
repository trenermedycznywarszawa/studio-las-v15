import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SupabaseAuth } from "../assets/os/data.js";
import {
  PWD_MAX_OBSERVATIONS,
  PWD_MOVEMENTS,
  collectPwdObservations,
  pwdDecisionLabel,
  pwdTrainerObservation,
  savePwdWorkflow
} from "../assets/os/pwd.js";
import {
  CANONICAL_ENGAGEMENTS,
  CANONICAL_STAGES,
  getRuntimeConfig,
  runtimeEnvironmentLabel,
  submitPasswordLogin,
  userSafeError
} from "../assets/os/runtime.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const migration = await read("supabase/migrations/20260826101816_pwd_trainer_workflow.sql");
const data = await read("assets/os/data.js");
const pwdSource = await read("assets/os/pwd.js");
const app = await read("assets/os/app.js");
const forms = await read("assets/os/ui/forms.js");
const trainer = await read("assets/os/ui/trainer.js");
const common = await read("assets/os/ui/common.js");

assert.equal(PWD_MOVEMENTS.length, 7);
assert.equal(PWD_MAX_OBSERVATIONS, 3);

// Zero observations is a valid PWD input.
assert.deepEqual(collectPwdObservations({}), []);
assert.throws(
  () => collectPwdObservations({ pwdMovement_sock: true, pwdObservation_sock: "opis" }),
  /obserwację i jej znaczenie/
);
assert.throws(
  () => collectPwdObservations({ pwdMeaning_sock: "znaczenie" }),
  /Zaznacz propozycję/
);

// Two selected observation suggestions remain independent, descriptive records.
const observations = collectPwdObservations({
  pwdMovement_sock: true,
  pwdObservation_sock: "syntetyczna obserwacja skarpetki",
  pwdMeaning_sock: "znaczenie skarpetki wpisane przez trenera",
  pwdMovement_squat: true,
  pwdObservation_squat: "syntetyczna obserwacja przysiadu",
  pwdMeaning_squat: "znaczenie przysiadu wpisane przez trenera"
});
assert.deepEqual(observations.map(item => item.testId), ["pwd:sock", "pwd:squat"]);
assert.equal(observations[0].interpretation, "znaczenie skarpetki wpisane przez trenera");
assert.equal(observations[1].resultText, "syntetyczna obserwacja przysiadu");

// A custom short observation uses the same existing record contract.
const customObservation = collectPwdObservations({
  pwdMovement_custom: true,
  pwdObservation_custom: "własny syntetyczny sygnał",
  pwdMeaning_custom: "znaczenie zapisane przez trenera"
});
assert.deepEqual(customObservation, [{
  testId: "pwd:custom",
  testName: "Własna obserwacja istotna dla celu",
  resultText: "własny syntetyczny sygnał",
  interpretation: "znaczenie zapisane przez trenera"
}]);

// A fourth observation fails before repository writes.
const fourObservations = Object.fromEntries(
  PWD_MOVEMENTS.slice(0, 4).flatMap(movement => [
    [`pwdMovement_${movement.id}`, true],
    [`pwdObservation_${movement.id}`, `obserwacja ${movement.id}`],
    [`pwdMeaning_${movement.id}`, `znaczenie ${movement.id}`]
  ])
);
assert.throws(() => collectPwdObservations(fourObservations), /maksymalnie 3 obserwacje/);

function repositoryRecorder() {
  const calls = [];
  return {
    calls,
    updateClient: async (clientId, input) => calls.push(["updateClient", clientId, input]),
    saveSession: async (clientId, input) => calls.push(["saveSession", clientId, input]),
    saveAssessment: async (clientId, input) => calls.push(["saveAssessment", clientId, input])
  };
}

const basePwd = {
  date: "2026-08-27",
  realLifeGoal: "wejść spokojnie po schodach",
  whyImportant: "samodzielne wyjście z domu",
  contextBoundaries: "bez presji i bez automatycznej interpretacji",
  changeAfterTrial: "",
  trainerInterpretation: "syntetyczna interpretacja trenera",
  trainerDecision: "clarify_or_observe",
  nextStep: "wrócić do pytania na kolejnej rozmowie"
};

const undecidedRepository = repositoryRecorder();
await assert.rejects(
  savePwdWorkflow(undecidedRepository, "synthetic-client", { ...basePwd, trainerDecision: "" }),
  /Wybierz decyzję i następny krok/
);
assert.deepEqual(undecidedRepository.calls, []);

const explicitContinueRepository = repositoryRecorder();
const explicitContinueResult = await savePwdWorkflow(
  explicitContinueRepository,
  "synthetic-client",
  { ...basePwd, trainerDecision: "continue_guidance" }
);
assert.equal(explicitContinueResult.decisionLabel, "Dalsze prowadzenie");
assert.equal(
  explicitContinueRepository.calls.find(([operation]) => operation === "saveSession")[2].trainerDecision,
  "Dalsze prowadzenie"
);
const zeroRepository = repositoryRecorder();
assert.deepEqual(
  await savePwdWorkflow(zeroRepository, "synthetic-client", basePwd),
  { observationCount: 0, decisionLabel: "Dodatkowe wyjaśnienie lub obserwacja" }
);
assert.deepEqual(zeroRepository.calls.map(([operation]) => operation), ["updateClient", "saveSession"]);

const twoRepository = repositoryRecorder();
assert.equal(
  (await savePwdWorkflow(twoRepository, "synthetic-client", {
    ...basePwd,
    pwdMovement_sock: true,
    pwdObservation_sock: "sygnał pierwszy",
    pwdMeaning_sock: "znaczenie pierwsze",
    pwdMovement_squat: true,
    pwdObservation_squat: "sygnał drugi",
    pwdMeaning_squat: "znaczenie drugie"
  })).observationCount,
  2
);
assert.deepEqual(twoRepository.calls.map(([operation]) => operation), [
  "updateClient", "saveSession", "saveAssessment", "saveAssessment"
]);

const customRepository = repositoryRecorder();
await savePwdWorkflow(customRepository, "synthetic-client", {
  ...basePwd,
  pwdMovement_custom: true,
  pwdObservation_custom: "własny krótki sygnał",
  pwdMeaning_custom: "własne znaczenie"
});
assert.equal(customRepository.calls.at(-1)[0], "saveAssessment");
assert.equal(customRepository.calls.at(-1)[2].testId, "pwd:custom");
assert.equal(customRepository.calls.at(-1)[2].resultText, "własny krótki sygnał");

const rejectedRepository = repositoryRecorder();
await assert.rejects(
  savePwdWorkflow(rejectedRepository, "synthetic-client", { ...basePwd, ...fourObservations }),
  /maksymalnie 3 obserwacje/
);
assert.deepEqual(rejectedRepository.calls, []);

assert.equal(pwdDecisionLabel("continue_guidance"), "Dalsze prowadzenie");
assert.equal(pwdDecisionLabel("defer_or_refer"), "Odroczenie decyzji lub skierowanie dalej");
assert.throws(() => pwdDecisionLabel(""), /Wybierz decyzję/);
assert.match(
  pwdTrainerObservation({
    contextBoundaries: "granica",
    changeAfterTrial: "zmiana",
    trainerInterpretation: "interpretacja"
  }),
  /Kontekst i granice: granica[\s\S]*Co zmieniło się po próbie lub wskazówce: zmiana[\s\S]*Interpretacja trenera: interpretacja/
);

assert.match(migration, /add column if not exists session_type text not null default 'session'/);
assert.match(migration, /session_type in \('session', 'pwd'\)/);
assert.match(data, /session_type: input\.sessionType === "pwd" \? "pwd" : "session"/);
assert.match(forms, /Co chcesz móc robić swobodniej\?/);
assert.match(forms, /Dlaczego to jest dla Ciebie ważne\?/);
assert.match(forms, /Obserwacje istotne dla celu — opcjonalnie, maksymalnie/);
assert.match(forms, /Własna krótka obserwacja/);
assert.match(forms, /input\.disabled = !input\.checked && selectedCount >= PWD_MAX_OBSERVATIONS/);
assert.match(forms, /value: "", label: "Wybierz decyzję i następny krok…", disabled: true, selected: true/);
assert.match(forms, /decisionSelect\.value = ""/);
assert.match(forms, /setCustomValidity\("Wybierz decyzję i następny krok\."\)/);
assert.match(trainer, /panel\("Pierwsza Wizyta Diagnostyczna"/);
assert.match(trainer, /QUESTION → SIGNAL → MEANING → DECISION/);
assert.equal(CANONICAL_ENGAGEMENTS.diagnostic_visit, "Pierwsza Wizyta Diagnostyczna");
assert.equal(CANONICAL_STAGES[1], "Diagnostyka i punkt startowy");
assert.match(trainer, /Zapis PWD nie tworzy ani nie publikuje wskazówki/);

assert.match(app, /onSavePwd:[\s\S]*savePwdWorkflow\(state\.repository, state\.activeClientId, values\)/);
assert.doesNotMatch(app, /save_pwd_decision/);
const pwdSaveHandler = app.slice(app.indexOf("onSavePwd:"), app.indexOf("onSaveSession:"));
assert.doesNotMatch(pwdSaveHandler, /saveHomePlan|publishHomePlanGuidance|withdrawHomePlanGuidance/);
const pwdWorkflowSource = pwdSource.slice(
  pwdSource.indexOf("export async function savePwdWorkflow"),
  pwdSource.indexOf("export function pwdDecisionLabel")
);
assert.doesNotMatch(pwdWorkflowSource, /homePlan|home_plan|publish/);
assert.match(app, /onPublishHomePlan:[\s\S]*publishHomePlanGuidance/);

assert.match(app, /environment: state\.config\?\.mode/);
assert.match(app, /onSubmit: async \(\{ email, password \}\) => \{[\s\S]*submitPasswordLogin\(state\.auth, \{ email, password \}\)/);
assert.match(common, /runtimeEnvironmentLabel\(environment\)/);
assert.match(common, /selected: option\.selected/);
assert.match(trainer, /runtimeEnvironmentLabel\(model\.environment\)/);

const key = "p".repeat(40);
const originalWindow = globalThis.window;
const setRuntimeConfig = ({ mode, projectRef, url }) => {
  globalThis.window = {
    STUDIO_LAS_CONFIG: { mode, supabase: { projectRef, url, publishableKey: key } }
  };
};

setRuntimeConfig({
  mode: "staging",
  projectRef: "ulauyoqjoetjqktegeuq",
  url: "https://ulauyoqjoetjqktegeuq.supabase.co"
});
const stagingConfig = getRuntimeConfig();
assert.equal(stagingConfig.mode, "staging");
assert.equal(runtimeEnvironmentLabel(stagingConfig.mode), "STAGING / QA");

setRuntimeConfig({
  mode: "staging",
  projectRef: "other-staging-ref",
  url: "https://other-staging-ref.supabase.co"
});
assert.throws(() => getRuntimeConfig(), /Błędna konfiguracja stagingu/);

setRuntimeConfig({
  mode: "production",
  projectRef: "ufcumhbnuyernuwepcij",
  url: "https://ufcumhbnuyernuwepcij.supabase.co"
});
const productionConfig = getRuntimeConfig();
assert.equal(productionConfig.mode, "production");
assert.equal(runtimeEnvironmentLabel(productionConfig.mode), "PRODUKCJA");
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
assert.throws(() => runtimeEnvironmentLabel("preview"), /Nieobsługiwane środowisko/);
globalThis.window = originalWindow;

const loginCalls = [];
const authMock = {
  signInWithPassword: async (...args) => {
    loginCalls.push(args);
    return { session: null };
  }
};
await submitPasswordLogin(authMock, {
  email: " qa-trainer@example.test ",
  password: "synthetic-password"
});
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
assert.equal(
  userSafeError({ status: 400, message: "Invalid login credentials", payload: { code: "invalid_credentials" } }),
  "E-mail lub hasło są nieprawidłowe."
);

console.log("PWD_TRAINER_WORKFLOW_SUCCESS domain and static contract PASS (no database integration executed)");
