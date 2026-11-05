import assert from "node:assert/strict";
import { signalInstanceKey } from "../assets/os/decision-support.js";
import { freshTotpCode } from "./e2e_trainer_attention_staging.mjs";
const origin = "https://ulauyoqjoetjqktegeuq.supabase.co";
const url = process.env.STUDIO_LAS_E2E_URL;
const key = process.env.STUDIO_LAS_STAGING_PUBLISHABLE_KEY;
const dir = process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/attention";
const clientId = "c7200000-0000-4000-8000-000000000001";
export async function api(path, token, method="GET", body) {
 const r=await fetch(`${origin}${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=representation"},body:body===undefined?undefined:JSON.stringify(body)});
 const text=await r.text(); assert.ok(r.ok,`${method} ${path.split("?")[0]}: ${r.status} ${text.slice(0,200)}`); return text?JSON.parse(text):null;
}
export async function login(page,email,password,trainer=false) {
 await page.goto(url);
 await page.getByLabel("Adres poczty elektronicznej").fill(email);
 await page.getByLabel("Hasło").fill(password);
 await page.getByRole("button",{name:"Zaloguj",exact:true}).click();
 if(trainer) {
  await page.getByRole("heading",{name:"Weryfikacja dwuetapowa",exact:true}).waitFor();
  await page.getByLabel("Sześciocyfrowy kod jednorazowy").fill(await freshTotpCode(process.env.STUDIO_LAS_QA_TOTP_SECRET));
  await page.getByRole("button",{name:"Potwierdź kod",exact:true}).click();
  await page.getByRole("heading",{name:"Uwaga trenera",exact:true}).waitFor();
 } else await page.getByRole("button",{name:"Mam pytanie / potrzebuję kontaktu",exact:true}).first().waitFor();
 const session=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("studio-las-auth-session")));
 return session.access_token;
}
export async function queue(page) { await page.getByRole("button",{name:"Uwaga trenera",exact:true}).click(); await page.getByRole("heading",{name:"Uwaga trenera",exact:true}).waitFor(); }

export function questionnaireBacklogKeys(assignments, reviews) {
 const reviewed=new Map(reviews.map(row=>[row.signal_key,row]));
 return assignments.map(row=>{
  assert.equal(row.status,"submitted");assert.ok(row.id && row.submitted_at);
  return signalInstanceKey({id:"questionnaire-submitted",source:"questionnaire",sourceId:row.id,sourceDate:row.submitted_at,sourceRevision:row.submitted_at});
 }).filter(key=>{const review=reviewed.get(key);return !review || (review.outcome==="contact_required"&&!review.contact_resolved_at);}).sort();
}
export async function questionnaireBacklog(token) {
 const query=new URLSearchParams({client_id:`eq.${clientId}`,status:"eq.submitted",select:"id,status,submitted_at,questionnaire_versions!inner(questionnaire_templates!inner(template_key))","questionnaire_versions.questionnaire_templates.template_key":"eq.pre_pwd_first_visit",order:"id.asc"});
 const assignments=await api(`/rest/v1/questionnaire_assignments?${query}`,token);
 const reviews=await api(`/rest/v1/trainer_signal_reviews?client_id=eq.${clientId}&select=signal_key,outcome,contact_resolved_at`,token);
 return questionnaireBacklogKeys(assignments,reviews);
}
export function assertQueueKeys(actual, backlog, additions=[]) {
 assert.ok(Array.isArray(backlog),"Explicit questionnaire baseline required");
 const expected=[...backlog,...additions].sort();
 assert.equal(new Set(expected).size,expected.length,"New test signal must be distinct from questionnaire backlog");
 assert.deepEqual([...actual].sort(),expected,"Queue must retain every unreviewed questionnaire and exactly the expected test signals");
}
export async function expectQueue(page,backlog,additions=[]) {
 const expected=[...backlog,...additions].sort();
 await page.waitForFunction(keys=>JSON.stringify([...document.querySelectorAll('.attention-case')].map(row=>row.getAttribute('data-signal-key')).sort())===JSON.stringify(keys),expected);
 assertQueueKeys(await page.locator('.attention-case').evaluateAll(rows=>rows.map(row=>row.getAttribute('data-signal-key'))),backlog,additions);
 assert.equal(await page.getByText("Nie udało się wczytać spraw. Sprawdź dostęp i spróbuj ponownie.",{exact:true}).count(),0);
 if(expected.length===0) await page.getByText("Brak spraw do przejrzenia.",{exact:true}).waitFor();
 else assert.equal(await page.getByText("Brak spraw do przejrzenia.",{exact:true}).count(),0);
}
export function testSignalCase(page,key) {
 assert.ok(key && !key.startsWith('questionnaire-submitted::'),"Test must never act on a historical questionnaire");
 return page.locator(`.attention-case[data-signal-key=${JSON.stringify(key)}]`);
}
export function eventSignalKey(event) {
 assert.ok(event.id && event.savedAt && event.eventDate,"Response must include exact persisted event identity");
 return signalInstanceKey({id:"client-observation",source:"client-response",sourceId:event.id,sourceDate:event.eventDate,sourceRevision:event.savedAt});
}
export function sessionSignalKey(session) {
 assert.ok(session.id && session.updated_at && session.date,"Response must include exact persisted session revision");
 return signalInstanceKey({id:"low-readiness",source:"session",sourceId:session.id,sourceDate:session.date,sourceRevision:session.updated_at});
}
export async function screenshot(page,name) {
 assert.equal(await page.getByLabel("Wybierz klienta").locator("option").count(),2,"Screenshot must contain only the isolated synthetic client");
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,"Horizontal overflow");
 await page.screenshot({path:`${dir}/${name}.png`,fullPage:true});
}
