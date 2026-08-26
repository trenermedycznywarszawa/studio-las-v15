import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PWD_MOVEMENTS,
  collectPwdObservations,
  pwdDecisionLabel,
  pwdTrainerObservation
} from "../assets/os/pwd.js";
import { getRuntimeConfig } from "../assets/os/runtime.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const migration = await read("supabase/migrations/20260826101816_pwd_trainer_workflow.sql");
const data = await read("assets/os/data.js");
const app = await read("assets/os/app.js");
const forms = await read("assets/os/ui/forms.js");
const trainer = await read("assets/os/ui/trainer.js");

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

console.log("PWD_TRAINER_WORKFLOW_SUCCESS domain and static contract PASS (no database integration executed)");