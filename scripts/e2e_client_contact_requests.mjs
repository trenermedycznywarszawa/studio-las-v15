import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {chromium} from "playwright";
import {api,login,queue,empty,screenshot} from "./attention_e2e_helpers.mjs";
const origin="https://ulauyoqjoetjqktegeuq.supabase.co";
const clientId="c7200000-0000-4000-8000-000000000001";
const dir=process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/attention";
const marker=process.env.STUDIO_LAS_E2E_MARKER || randomUUID();
const q1=`Pytanie przed odpowiedzią · ${marker}`;
const q2=`Pytanie później tego samego dnia · ${marker}`;
const q3=`Kolejne pytanie po kontakcie · ${marker}`;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch();
const trainerContext=await browser.newContext({viewport:{width:1440,height:1000}});
const clientContext=await browser.newContext({viewport:{width:390,height:844}});
const trainer=await trainerContext.newPage(),client=await clientContext.newPage();
const failures=[];for(const page of [trainer,client])page.on("pageerror",e=>failures.push(e.message));
const results=[];
async function sendQuestion(text) {
 await client.getByRole("button",{name:"Mam pytanie / potrzebuję kontaktu",exact:true}).click();
 await client.getByLabel("Treść pytania").fill(text);
 await client.getByRole("button",{name:"Wyślij pytanie",exact:true}).click();
}
async function confirmQuestion(){await client.getByText("Pytanie zapisane. Jest dostępne dla Damiana.",{exact:true}).waitFor();}
async function review(){await trainer.getByRole("button",{name:"Przejrzane · bez zmiany",exact:true}).click();await empty(trainer);}
try {
 const token=await login(trainer,process.env.STUDIO_LAS_QA_EMAIL,process.env.STUDIO_LAS_QA_PASSWORD,true);
 await empty(trainer);
 const plan=(await api("/rest/v1/home_plans",token,"POST",{client_id:clientId,title:"Pytania · dane fikcyjne",focus:"Samodzielne zgłoszenie wątpliwości",guidance_channel:"app",status:"draft"}))[0];
 const item=(await api("/rest/v1/home_plan_items",token,"POST",{client_id:clientId,home_plan_id:plan.id,name:"Działanie testowe",dosage:"2 powtórzenia",stop_criteria:"Ustalona granica"}))[0];
 const revision=(await api(`/rest/v1/home_plans?id=eq.${plan.id}&select=content_revision`,token))[0].content_revision;
 await api("/rest/v1/rpc/approve_home_plan_guidance",token,"POST",{p_home_plan_id:plan.id,p_expected_revision:revision});
 await api("/rest/v1/rpc/publish_home_plan_guidance",token,"POST",{p_home_plan_id:plan.id});
 let clientToken=await login(client,"attention.client@example.test",process.env.STUDIO_LAS_ATTENTION_CLIENT_PASSWORD);
 await sendQuestion(q1);await confirmQuestion();
 let snapshot=await api("/rest/v1/rpc/client_portal_snapshot",clientToken,"POST",{});
 assert.equal(snapshot.homePlan.items[0].todayResponse,null);
 assert.equal(snapshot.contactRequests.filter(r=>r.text===q1).length,1);
 await queue(trainer);await trainer.getByText(q1,{exact:true}).waitFor();await review();results.push("question before check-in, recorded independently and reviewed");
 await client.getByLabel("Twoja odpowiedź — opcjonalnie").fill("Wykonano zgodnie z ustaleniem. Dane fikcyjne.");
 await client.getByRole("button",{name:"Zapisz odpowiedź",exact:true}).click();
 await client.getByText("Wykonano zgodnie z ustaleniem. Dane fikcyjne.",{exact:true}).waitFor();
 const original=(await api("/rest/v1/rpc/client_portal_snapshot",clientToken,"POST",{})).homePlan.items[0].todayResponse;
 await queue(trainer);await empty(trainer);
 await client.setViewportSize({width:1440,height:1000});
 await client.getByRole("button",{name:"Mam pytanie / potrzebuję kontaktu",exact:true}).click();await client.getByLabel("Treść pytania").fill(q2);
 await client.screenshot({path:`${dir}/contact-after-checkin-desktop.png`,fullPage:true});
 await client.setViewportSize({width:390,height:844});assert.equal(await client.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 await client.screenshot({path:`${dir}/contact-after-checkin-mobile.png`,fullPage:true});
 let submitted;
 await client.route(`${origin}/rest/v1/rpc/save_client_contact_request`,async route=>{
  submitted=route.request().postDataJSON();const response=await route.fetch();assert.equal(response.status(),200);await route.abort("failed");
 });
 await client.getByRole("button",{name:"Wyślij pytanie",exact:true}).click();
 await client.getByRole("button",{name:"Sprawdź i ponów pytanie",exact:true}).waitFor();
 assert.equal(await client.getByText(q2,{exact:true}).count(),1,"question retained after lost response");
 await client.unroute(`${origin}/rest/v1/rpc/save_client_contact_request`);
 await client.getByRole("button",{name:"Sprawdź i ponów pytanie",exact:true}).click();await confirmQuestion();
 const replay=await Promise.all([api("/rest/v1/rpc/save_client_contact_request",clientToken,"POST",submitted),api("/rest/v1/rpc/save_client_contact_request",clientToken,"POST",submitted)]);
 assert.ok(replay.every(r=>r.id===submitted.p_submission_id && r.alreadySaved));
 snapshot=await api("/rest/v1/rpc/client_portal_snapshot",clientToken,"POST",{});
 assert.deepEqual(snapshot.homePlan.items[0].todayResponse,original);
 assert.equal(snapshot.contactRequests.filter(r=>r.id===submitted.p_submission_id).length,1);
 results.push("question after routine answer, lost acknowledgement and concurrent retries without duplicates; original unchanged");
 await queue(trainer);await trainer.getByText(q2,{exact:true}).waitFor();
 await screenshot(trainer,"independent-question-queue-desktop");
 await trainer.getByRole("button",{name:"Potrzebny kontakt",exact:true}).click();
 await trainer.getByText("Kontakt nadal wymaga domknięcia",{exact:true}).waitFor();
 await trainer.reload();await trainer.getByText("Kontakt nadal wymaga domknięcia",{exact:true}).waitFor();
 await trainer.locator(".attention-case summary").click();await trainer.getByLabel("Co ustalono po kontakcie?").fill(`Kontakt wyjaśniony · ${marker}`);
 await trainer.getByRole("button",{name:"Kontakt zakończony",exact:true}).click();await empty(trainer);
 await client.reload();await client.getByText("Wysłane pytania (2)",{exact:true}).click();await client.getByText(q2,{exact:true}).waitFor();
 await client.getByRole("button",{name:"Wyloguj",exact:true}).click();clientToken=await login(client,"attention.client@example.test",process.env.STUDIO_LAS_ATTENTION_CLIENT_PASSWORD);
 await client.getByText("Wysłane pytania (2)",{exact:true}).click();await client.getByText(q1,{exact:true}).waitFor();await client.getByText(q2,{exact:true}).waitFor();
 results.push("own questions survive refresh and relogin; trainer contact completes with history");
 await sendQuestion(q3);await confirmQuestion();await queue(trainer);await trainer.getByText(q3,{exact:true}).waitFor();await review();
 snapshot=await api("/rest/v1/rpc/client_portal_snapshot",clientToken,"POST",{});assert.equal(snapshot.contactRequests.filter(r=>r.homePlanItemId===item.id).length,3);assert.deepEqual(snapshot.homePlan.items[0].todayResponse,original);
 const dailyRetry=await api("/rest/v1/rpc/save_client_guidance_response",clientToken,"POST",{p_home_plan_item_id:item.id,p_home_plan_id:plan.id,p_response:"Second daily answer must not replace original",p_submission_id:randomUUID(),p_contact_requested:false});assert.equal(dailyRetry.id,original.id);assert.equal(dailyRetry.text,original.text);
 results.push("new deliberate question after completed contact; daily limit unchanged");
 const privateReviews=await api(`/rest/v1/trainer_signal_reviews?client_id=eq.${clientId}`,clientToken);assert.deepEqual(privateReviews,[]);
 assert.ok(!JSON.stringify(snapshot).includes(`Kontakt wyjaśniony · ${marker}`));
 assert.deepEqual(await api("/rest/v1/guidance_events?kind=eq.client_contact_request",clientToken),[]);
 await trainer.getByLabel("Wybierz klienta").selectOption(clientId);await trainer.getByText("Pokaż historię przejrzanych sygnałów",{exact:true}).click();await trainer.getByText(new RegExp(`Kontakt wyjaśniony · ${marker}`)).waitFor();
 results.push("private trainer history retained and excluded from client projection");assert.deepEqual(failures,[]);
 await writeFile(`${dir}/independent-questions.json`,JSON.stringify({status:"PASS",results},null,2));console.log("CLIENT_CONTACT_REQUESTS_E2E_PASS",JSON.stringify(results));
} catch(e) {await client.screenshot({path:`${dir}/contact-client-failure.png`,fullPage:true}).catch(()=>{});await trainer.screenshot({path:`${dir}/contact-trainer-failure.png`,fullPage:true}).catch(()=>{});throw e;}
finally {await browser.close();}
