import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { api, login, screenshot } from "./attention_e2e_helpers.mjs";
const id="c7200000-0000-4000-8000-000000000001";
const dir=process.env.STUDIO_LAS_E2E_ARTIFACT_DIR;
const rpc=(name,token,body)=>api(`/rest/v1/rpc/${name}`,token,"POST",body);
async function choose(page,name,value){await page.locator(`[name="${name}"][value="${value}"]`).check();}
async function fill(page,name,value){await page.locator(`[name="${name}"]`).fill(value);}
async function fillSafePath(page) {
  await fill(page, "age", "44");
  await fill(page, "emergency_contact_name", "Osoba Testowa");
  await fill(page, "emergency_contact_phone", "+48111222333");
  await fill(page, "emergency_contact_relation", "Bliska osoba");

  await choose(page, "q2_goal_current", "yes");
  await choose(page, "q3_goal_ability", "6");
  await choose(page, "q4_main_barriers", "general_fitness");
  await choose(page, "q5_work_day", "mostly_standing_walking");

  await page.locator('[name="health_data_processing_gate"]').check();
  await page.locator('[name="q7_exertion_symptoms"][value="none"]').waitFor({ state: "visible", timeout: 15_000 });
  await choose(page, "q7_exertion_symptoms", "none");
  await choose(page, "q8_chronic_condition", "no");
  await choose(page, "q9_movement_restriction", "no");
}

async function finishSafePath(page) {
  await choose(page, "q10_medication", "no");
  await choose(page, "q11_supplements", "no");
  await choose(page, "q12_balance", "none");
  await choose(page, "q12a_walking_aid", "no");
  await choose(page, "q13_pain", "no");
  await choose(page, "q14_major_injury_surgery", "no");
  await choose(page, "q15_hospital_12m", "no");
  await choose(page, "q_pregnancy_applicability", "not_applicable");
  await choose(page, "q18_exercise_frequency", "1_week");
  await choose(page, "q19_break", "1_3m");
  await choose(page, "q20_future_intensity", "no");
  await choose(page, "q21_weekly_time", "2");
  await choose(page, "q22_session_time", "45_60");
  await choose(page, "q23_adherence_barriers", "nothing_significant");
  await choose(page, "q24_water", "1_5_2");
  await choose(page, "q25_sleep", "7");
  await choose(page, "q26_energy", "7");
  await choose(page, "q27_stress", "4");
  await choose(page, "q28_meals", "regular_varied");
  await choose(page, "q29_fruit_veg", "3_4");
  await page.locator('[name="confirm_best_knowledge"]').check();
  await page.locator('[name="confirm_trainer_not_doctor"]').check();
}


await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
const tc=await browser.newContext({viewport:{width:1440,height:1000}}), cc=await browser.newContext({viewport:{width:390,height:844}});
const t=await tc.newPage(), c=await cc.newPage();
try {
 const token=await login(t,process.env.STUDIO_LAS_QA_EMAIL,process.env.STUDIO_LAS_QA_PASSWORD,true);
 await t.getByLabel("Wybierz klienta").selectOption(id);
 await t.getByText("Dostęp klienta do aplikacji: aktywny.",{exact:true}).waitFor();
 const before=await api(`/rest/v1/questionnaire_assignments?client_id=eq.${id}&status=in.(assigned,in_progress)&select=id`,token);
 assert.equal(before.length,0,"Start with no prepared assignment");
 let lost=false;
 await t.route("**/rest/v1/rpc/assign_active_questionnaire",async route=>{const response=await route.fetch();assert.ok(response.ok());lost=true;await route.abort("failed");});
 await t.getByRole("button",{name:/Przypisz aktywną ankietę|Przypisz kolejną ankietę/}).click();
 await t.getByRole("button",{name:"Sprawdź aktualny zapis",exact:true}).click();
 await t.getByRole("button",{name:"Ankieta już przypisana",exact:true}).waitFor();
 assert.equal(lost,true);await t.unroute("**/rest/v1/rpc/assign_active_questionnaire");
 const assigned=await rpc("assign_active_questionnaire",token,{p_client_id:id,p_template_key:"pre_pwd_first_visit"});
 const repeats=await Promise.all([1,2].map(()=>rpc("assign_active_questionnaire",token,{p_client_id:id,p_template_key:"pre_pwd_first_visit"})));
 assert.ok(repeats.every(x=>x.id===assigned.id));
 assert.equal((await api(`/rest/v1/questionnaire_assignments?client_id=eq.${id}&status=in.(assigned,in_progress)&select=id`,token)).length,1);
 await screenshot(t,"questionnaire-assigned-desktop");
 await t.setViewportSize({width:390,height:844});await screenshot(t,"questionnaire-assigned-mobile");
 const clientToken=await login(c,"attention.client@example.test",process.env.STUDIO_LAS_ATTENTION_CLIENT_PASSWORD);
 await c.getByRole("button",{name:"Wypełnij",exact:true}).click();await fillSafePath(c);
 await c.getByRole("button",{name:"Zamknij",exact:true}).click();
 await c.getByRole("button",{name:"Kontynuuj",exact:true}).waitFor();
 await c.getByRole("button",{name:"Wyloguj",exact:true}).click();
 await login(c,"attention.client@example.test",process.env.STUDIO_LAS_ATTENTION_CLIENT_PASSWORD);
 await c.getByRole("button",{name:"Kontynuuj",exact:true}).click();
 assert.equal(await c.locator('[name="q3_goal_ability"][value="6"]').isChecked(),true);
 await t.getByRole("button",{name:"Odśwież",exact:true}).click();
 await t.locator(".trainer-questionnaire li").filter({hasText:"W trakcie"}).waitFor();
 const submissions=await rpc("trainer_questionnaire_submissions",token,{p_client_id:id});
 assert.ok(!submissions.some(x=>x.assignmentId===assigned.id));
 assert.equal((await api(`/rest/v1/questionnaire_responses?assignment_id=eq.${assigned.id}&select=id`,token)).length,0);
 await finishSafePath(c);
 await c.getByRole("button",{name:"Przekaż ankietę trenerowi",exact:true}).click();
 await c.getByRole("button",{name:"Kontynuuj",exact:true}).waitFor({state:"detached"});
 await t.getByRole("button",{name:"Odśwież",exact:true}).click();
 await t.locator(".trainer-questionnaire li").filter({hasText:"Przekazana"}).first().waitFor();
 await t.getByRole("link",{name:"Zobacz przekazane odpowiedzi",exact:true}).click();
 await t.getByRole("heading",{name:"PRZED WIZYTĄ — 60 SEKUND",exact:true}).waitFor();
 const submitted=await rpc("trainer_questionnaire_submissions",token,{p_client_id:id});
 assert.equal(submitted.find(x=>x.assignmentId===assigned.id).answers.q3_goal_ability,"6");
 await screenshot(t,"questionnaire-submitted-mobile");
 await t.getByRole("button",{name:"Wyloguj",exact:true}).click();
 await login(t,process.env.STUDIO_LAS_QA_EMAIL,process.env.STUDIO_LAS_QA_PASSWORD,true);
 await t.getByLabel("Wybierz klienta").selectOption(id);
 await t.getByRole("link",{name:"Zobacz przekazane odpowiedzi",exact:true}).waitFor();
 const origin="https://ulauyoqjoetjqktegeuq.supabase.co", key=process.env.STUDIO_LAS_STAGING_PUBLISHABLE_KEY;
 const request=async(path,bearer,body)=>fetch(origin+path,{method:body?"POST":"GET",headers:{apikey:key,Authorization:`Bearer ${bearer}`,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
 const auth=await request("/auth/v1/token?grant_type=password",key,{email:process.env.STUDIO_LAS_QA_EMAIL,password:process.env.STUDIO_LAS_QA_PASSWORD});assert.ok(auth.ok);
 const aal1=(await auth.json()).access_token;
 for(const bearer of [key,aal1,clientToken]) {const denied=await request("/rest/v1/rpc/assign_active_questionnaire",bearer,{p_client_id:id,p_template_key:"pre_pwd_first_visit"});assert.ok([401,403].includes(denied.status));}
 const foreign="c7100000-0000-4000-8000-000000000002";
 const denied=await request("/rest/v1/rpc/assign_active_questionnaire",token,{p_client_id:foreign,p_template_key:"pre_pwd_first_visit"});assert.equal(denied.status,403);
 assert.deepEqual(await api(`/rest/v1/questionnaire_assignments?client_id=eq.${foreign}&select=id`,token),[]);
 assert.deepEqual(await api(`/rest/v1/questionnaire_assignments?client_id=eq.${id}&select=id`,aal1),[]);
 await writeFile(`${dir}/questionnaire-assignment.json`,JSON.stringify({status:"PASS",assignmentId:assigned.id,uiStarted:true,lostAcknowledgement:true,concurrentReplay:true,draftResumeAfterRelogin:true,draftHidden:true,submittedBrief:true,mfaAndIsolation:true},null,2));
} finally {await browser.close();}
