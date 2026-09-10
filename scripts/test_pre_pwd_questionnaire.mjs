import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260910175500_pre_pwd_questionnaire_step.sql", "utf8");
const page = fs.readFileSync("ankieta-przed-wpd.html", "utf8");
const publicClient = fs.readFileSync("assets/os/pre-pwd-intake-public.js", "utf8");
const repo = fs.readFileSync("assets/os/inquiries-data.js", "utf8");
const controller = fs.readFileSync("assets/os/inquiries-controller.js", "utf8");
const ui = fs.readFileSync("assets/os/ui/inquiries-section.js", "utf8");
const build = fs.readFileSync("scripts/build_studio_las_os_deploy.mjs", "utf8");

assert.match(migration, /create table public\.pre_pwd_intake_requests/);
assert.match(migration, /enable row level security/);
assert.match(migration, /force row level security/);
assert.match(migration, /revoke all on table public\.pre_pwd_intake_requests from public, anon, authenticated/);
assert.match(migration, /coalesce\(auth\.jwt\(\) ->> 'aal', ''\) <> 'aal2'/);
assert.match(migration, /private\.trainer_owns_inquiry\(p_inquiry_id\)/);
assert.match(migration, /token_hash text not null unique/);
assert.match(migration, /encode\(digest\(v_token, 'sha256'\), 'hex'\)/);
assert.match(migration, /status in \('ready','sent','completed','revoked'\)/);
assert.match(migration, /v_request\.expires_at <= now\(\)/);
assert.match(migration, /source, raw_payload, main_goal, motivation, expectations, pain_areas/);
assert.match(migration, /'pre_pwd_questionnaire_v1'/);
assert.match(migration, /grant execute on function public\.submit_pre_pwd_intake\(text, jsonb, text\) to anon, authenticated/);
assert.doesNotMatch(migration, /grant (insert|update|delete).*pre_pwd_intake_requests.*anon/i);

assert.match(page, /Ankieta przed Pierwszą Wizytą Diagnostyczną/);
assert.match(page, /noindex, nofollow, noarchive/);
assert.match(page, /referrer" content="no-referrer/);
assert.match(page, /assets\/os\/pre-pwd-intake-public\.js/);
assert.doesNotMatch(page, /formspree|mailto:/i);

assert.match(publicClient, /history\.replaceState/);
assert.match(publicClient, /submit_pre_pwd_intake/);
assert.match(publicClient, /p_privacy_notice_version: "pre-pwd-v1"/);
assert.doesNotMatch(publicClient, /localStorage|sessionStorage/);
assert.doesNotMatch(publicClient, /service_role|secret key/i);

assert.match(repo, /listPrePwdIntakeRequests/);
assert.match(repo, /create_pre_pwd_intake_request/);
assert.match(repo, /mark_pre_pwd_intake_sent/);
assert.match(controller, /prePwdRequests/);
assert.match(controller, /prePwdLink/);
assert.match(ui, /Przygotowanie do Pierwszej Wizyty Diagnostycznej/);
assert.match(ui, /Utwórz ankietę przed WPD/);
assert.match(ui, /Wysłana — czekamy na odpowiedzi/);
assert.match(ui, /Wypełniona/);
assert.match(build, /"ankieta-przed-wpd\.html"/);

console.log("PRE_PWD_QUESTIONNAIRE_CONTRACT_PASS");
