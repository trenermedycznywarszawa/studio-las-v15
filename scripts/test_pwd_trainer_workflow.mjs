import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SupabaseAuth } from "../assets/os/data.js";
import {
  PWD_MOVEMENTS,
  collectPwdObservations,
  pwdDecisionLabel,
  pwdTrainerObservation
} from "../assets/os/pwd.js";
import { getRuntimeConfig, submitPasswordLogin, userSafeError } from "../assets/os/runtime.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const migration = await read("supabase/migrations/20260826101816_pwd_trainer_workflow.sql");
const data = await read("assets/os/data.js");
const app = await read("assets/os/app.js");
const forms = await read("assets/os/ui/forms.js");
const trainer = await read("assets/os/ui/trainer.js");
const common = await read("assets/os/ui/common.js");

assert.equal(PWD_MOVEMENTS.length, 7);
assert.deepEqual(collectPwdObservations({}), []);
assert.throws(
  () => collectPwdObservations({ pwdMovement_sock: true, pwdObservation_sock: "opis" }),
  /opis i znaczenie Damiana/
);
assert.throws(
  () => collectPwdObservations({ pwdMeaning_sock: "znaczenie" }),
  /Zaznacz ruch/
);
const observations = collectPwdObservations({
  pwdMovement_sock: true,
  pwdObservation_sock: "syntetyczna obserwacja skarpetki",
  pwdMeaning_sock: "znaczenie skarpetki wpisane przez Damiana",
  pwdMovement_squat: true,
  pwdObservation_squat: "syntetyczna obserwacja przysiadu",
  pwdMeaning_squat: "znaczenie przysiadu wpisane przez Damiana"
});
assert.deepEqual(observations.map(item => item.testId), ["pwd:sock", "pwd:squat"]);
assert.equal(observations[0].interpretation, "znaczenie skarpetki wpisane przez Damiana");
assert.equal(observations[1].resultText, "syntetyczna obserwacja przysiadu");
assert.equal(pwdDecisionLabel("start_guidance"), "Rozpocząć 2–3 tygodnie prowadzenia");
assert.equal(pwdDecisionLabel("not_start"), "Nie rozpoczynać / właściwie skierować dalej");
assert.match(pwdTrainerObservation({ contextBoundaries: "granica", trainerInterpretation: "interpretacja" }), /Kontekst i granice: granica[\s\S]*Interpretacja Damiana: interpretacja/);

assert.match(migration, /add column if not exists session_type text not null default 'session'/);
assert.match(migration, /session_type in \('session', 'pwd'\)/);
assert.match(data, /session_type: input\.sessionType === "pwd" \? "pwd" : "session"/);
assert.match(forms, /Co klient chce móc robić w realnym życiu/);
assert.match(forms, /Wybrane obserwacje ruchowe — opcjonalnie, bez scoringu/);
assert.match(trainer, /Zapis PWD nie tworzy ani nie publikuje wskazówki/);
assert.match(app, /onSavePwd/);
assert.match(app, /updateClient\(state\.activeClientId/);
assert.match(app, /saveSession\(state\.activeClientId/);
assert.match(app, /saveAssessment\(state\.activeClientId/);
assert.doesNotMatch(app, /save_pwd_decision/);
assert.match(app, /environment: state\.config\?\.mode/);
assert.match(app, /onSubmit: async \(\{ email, password \}\) => \{[\s\S]*submitPasswordLogin\(state\.auth, \{ email, password \}\)/);
assert.match(common, /staging: "STAGING \/ QA", production: "PRODUKCJA"/);

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
assert.equal(getRuntimeConfig().mode, "staging");

setRuntimeConfig({
  mode: "staging",
  projectRef: "other-staging-ref",
  url: "https://other-staging-ref.supabase.co"
});
assert.throws(() => getRuntimeConfig(), /Błędna konfiguracja stagingu/);

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