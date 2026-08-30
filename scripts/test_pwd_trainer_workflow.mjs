import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SupabaseAuth } from "../assets/os/data.js";
import {
  PWD_MAX_OBSERVATIONS,
  PWD_MOVEMENTS,
  PWD_OBSERVATION_TYPES,
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
assert.deepEqual(Object.keys(PWD_OBSERVATION_TYPES), [
  "reference", "goal_task", "trainer_observation"
]);

// PWD remains valid without observations.
assert.deepEqual(collectPwdObservations({}), []);

// A trainer-owned observation preserves its type, name, signal and optional reaction.
const trainerObservation = collectPwdObservations({
  pwdObservationType_0: "trainer_observation",
  pwdObservationName_0: "Spontaniczna zmiana sposobu wstawania",
  pwdObservationNoticed_0: "Klient wybrał spokojniejsze tempo",
  pwdObservationReaction_0: "Ruch był łatwiejszy"
});
assert.deepEqual(trainerObservation, [{
  observationType: "trainer_observation",
  testId: "pwd:trainer_observation",
  testName: "Spontaniczna zmiana sposobu wstawania",
  resultText: "Klient wybrał spokojniejsze tempo",
  reaction: "Ruch był łatwiejszy",
  referenceId: null
}]);

// A task can be defined directly from the client's goal.
const goalTaskObservation = collectPwdObservations({
  pwdObservationType_0: "goal_task",
  pwdObservationName_0: "Wejście po schodach",
  pwdObservationNoticed_0: "Tempo pozostawało swobodne przez jedno piętro"
});
assert.equal(goalTaskObservation[0].testId, "pwd:goal_task");
assert.equal(goalTaskObservation[0].testName, "Wejście po schodach");

// The seven movements are only an optional reference-name library.
const referenceObservation = collectPwdObservations({
  pwdObservationType_0: "reference",
  pwdObservationReference_0: "sock",
  pwdObservationNoticed_0: "Ruch zapisany do późniejszego porównania"
});
assert.equal(referenceObservation[0].testId, "pwd:reference:sock");
assert.equal(referenceObservation[0].testName, "Skarpetka bez podparcia");
assert.equal(referenceObservation[0].referenceId, "sock");
assert.throws(
  () => collectPwdObservations({
    pwdObservationType_0: "goal_task",
    pwdObservationReference_0: "sock",
    pwdObservationName_0: "Wejście po schodach",
    pwdObservationNoticed_0: "Sygnał"
  }),
  /wyłącznie dla obserwacji porównawczej/
);

const threeObservations = Object.fromEntries([0, 1, 2].flatMap(index => [
  [`pwdObservationType_${index}`, "trainer_observation"],
  [`pwdObservationName_${index}`, `Obserwacja ${index + 1}`],
  [`pwdObservationNoticed_${index}`, `Sygnał ${index + 1}`]
]));
assert.equal(collectPwdObservations(threeObservations).length, 3);

const fourObservations = {
  ...threeObservations,
  pwdObservationType_3: "trainer_observation",
  pwdObservationName_3: "Obserwacja 4",
  pwdObservationNoticed_3: "Sygnał 4"
};
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
const explicitClientUpdate = explicitContinueRepository.calls.find(
  ([operation]) => operation === "updateClient"
)[2];
assert.equal(explicitClientUpdate.goal, basePwd.realLifeGoal);
assert.notEqual(explicitClientUpdate.goal, explicitContinueResult.decisionLabel);
const zeroRepository = repositoryRecorder();
assert.deepEqual(
  await savePwdWorkflow(zeroRepository, "synthetic-client", basePwd),
  { observationCount: 0, decisionLabel: "Dodatkowe wyjaśnienie lub obserwacja" }
);
assert.deepEqual(zeroRepository.calls.map(([operation]) => operation), ["updateClient", "saveSession"]);

const trainerRepository = repositoryRecorder();
await savePwdWorkflow(trainerRepository, "synthetic-client", {
  ...basePwd,
  pwdObservationType_0: "trainer_observation",
  pwdObservationName_0: "Własna obserwacja trenera",
  pwdObservationNoticed_0: "Klient sam dobrał spokojniejsze tempo",
  pwdObservationReaction_0: "Próba była swobodniejsza"
});
const savedTrainerObservation = trainerRepository.calls.at(-1)[2];
assert.equal(savedTrainerObservation.testId, "pwd:trainer_observation");
assert.equal(savedTrainerObservation.resultText, "Klient sam dobrał spokojniejsze tempo");
assert.match(savedTrainerObservation.trainerNote, /Reakcja po próbie lub wskazówce: Próba była swobodniejsza/);

const goalTaskRepository = repositoryRecorder();
await savePwdWorkflow(goalTaskRepository, "synthetic-client", {
  ...basePwd,
  pwdObservationType_0: "goal_task",
  pwdObservationName_0: "Wejście po schodach",
  pwdObservationNoticed_0: "Jedno piętro w swobodnym tempie"
});
assert.equal(goalTaskRepository.calls.at(-1)[2].testId, "pwd:goal_task");
assert.equal(goalTaskRepository.calls.at(-1)[2].testName, "Wejście po schodach");

const referenceRepository = repositoryRecorder();
await savePwdWorkflow(referenceRepository, "synthetic-client", {
  ...basePwd,
  pwdObservationType_0: "reference",
  pwdObservationReference_0: "sock",
  pwdObservationNoticed_0: "Zapis do porównania z kolejną wizytą"
});
assert.equal(referenceRepository.calls.at(-1)[2].testId, "pwd:reference:sock");
assert.equal(referenceRepository.calls.at(-1)[2].testName, "Skarpetka bez podparcia");

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
  pwdTrainerObservation({ contextBoundaries: "granica", trainerInterpretation: "interpretacja" }),
  /Kontekst i granice: granica[\s\S]*Interpretacja trenera: interpretacja/
);
assert.doesNotMatch(
  pwdTrainerObservation({ contextBoundaries: "granica", trainerInterpretation: "interpretacja" }),
  /Co zmieniło się po próbie/
);

assert.match(migration, /add column if not exists session_type text not null default 'session'/);
assert.match(migration, /session_type in \('session', 'pwd'\)/);
assert.match(data, /session_type: input\.sessionType === "pwd" \? "pwd" : "session"/);
assert.match(forms, /Co chcesz móc robić swobodniej\?/);
assert.match(forms, /Dlaczego to jest dla Ciebie ważne\?/);
assert.match(forms, /Dodaj obserwację/);
assert.match(forms, /data-pwd-observation-card/);
assert.match(forms, /data-pwd-reference-library/);
assert.match(forms, /referenceLibrary\.hidden = !isReference/);
assert.match(forms, /PWD_MOVEMENTS\.map\(movement => \(\{ value: movement\.id, label: movement\.label \}\)\)/);
assert.doesNotMatch(forms, /PWD_MOVEMENTS\.map\(movement => create\("details"/);
assert.match(forms, /activeSlots\.size >= PWD_MAX_OBSERVATIONS/);
assert.match(forms, /value: "", label: "Wybierz decyzję i następny krok…", disabled: true, selected: true/);
assert.match(forms, /decisionSelect\.value = ""/);
assert.match(forms, /setCustomValidity\("Wybierz decyzję i następny krok\."\)/);
assert.match(trainer, /panel\("Pierwsza Wizyta Diagnostyczna"/);
assert.match(trainer, /Cel klienta → kontekst i granice → maksymalnie 3 adekwatne obserwacje/);
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
