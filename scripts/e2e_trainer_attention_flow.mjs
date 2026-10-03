import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { freshTotpCode, studioToday } from "./e2e_trainer_attention_staging.mjs";
const origin = "https://ulauyoqjoetjqktegeuq.supabase.co";
const url = process.env.STUDIO_LAS_E2E_URL;
const key = process.env.STUDIO_LAS_STAGING_PUBLISHABLE_KEY;
const dir = process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/attention";
const clientId = "c7200000-0000-4000-8000-000000000001";
const results = [];
const resolutionNote = `Ustalenie wyjaśnione. Dane fikcyjne. ${process.env.STUDIO_LAS_E2E_MARKER || randomUUID()}`;
async function api(path, token, method="GET", body) {
 const r=await fetch(`${origin}${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=representation"},body:body===undefined?undefined:JSON.stringify(body)});
 const text=await r.text(); assert.ok(r.ok,`${method} ${path.split("?")[0]}: ${r.status} ${text.slice(0,200)}`); return text?JSON.parse(text):null;
}
async function login(page,email,password,trainer=false) {
 await page.goto(url);
 await page.getByLabel("Adres poczty elektronicznej").fill(email);
 await page.getByLabel("Hasło").fill(password);
 await page.getByRole("button",{name:"Zaloguj",exact:true}).click();
 if(trainer) {
  await page.getByRole("heading",{name:"Weryfikacja dwuetapowa",exact:true}).waitFor();
  await page.getByLabel("Sześciocyfrowy kod jednorazowy").fill(await freshTotpCode(process.env.STUDIO_LAS_QA_TOTP_SECRET));
  await page.getByRole("button",{name:"Potwierdź kod",exact:true}).click();
  await page.getByRole("heading",{name:"Uwaga trenera",exact:true}).waitFor();
 } else await page.getByLabel("Mam pytanie / potrzebuję kontaktu").first().waitFor();
 const session=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("studio-las-auth-session")));
 return session.access_token;
}
async function queue(page) { await page.getByRole("button",{name:"Uwaga trenera",exact:true}).click(); await page.getByRole("heading",{name:"Uwaga trenera",exact:true}).waitFor(); }
async function empty(page) { await page.getByText("Brak spraw do przejrzenia.",{exact:true}).waitFor(); assert.equal(await page.locator(".attention-case").count(),0); }
async function screenshot(page,name) {
 assert.equal(await page.getByLabel("Wybierz klienta").locator("option").count(),2,"Screenshot must contain only the isolated synthetic client");
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,"Horizontal overflow");
 await page.screenshot({path:`${dir}/${name}.png`,fullPage:true});
}
await mkdir(dir,{recursive:true});
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const clientContext=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage(), clientPage=await clientContext.newPage();
const errors=[]; page.on("pageerror",e=>errors.push(e.message)); clientPage.on("pageerror",e=>errors.push(e.message));
let trainerToken;
try {
 trainerToken=await login(page,process.env.STUDIO_LAS_QA_EMAIL,process.env.STUDIO_LAS_QA_PASSWORD,true);
 await empty(page); results.push("empty queue without measurements or check-ins");
 await screenshot(page,"attention-empty-desktop");
 const plan=(await api("/rest/v1/home_plans",trainerToken,"POST",{client_id:clientId,title:"Ustalenie testowe",focus:"Fikcyjne dane do testu",guidance_channel:"app",status:"draft"}))[0];
 const items=await api("/rest/v1/home_plan_items",trainerToken,"POST",[1,2,3].map((n)=>({client_id:clientId,home_plan_id:plan.id,name:`Działanie testowe ${n}`,dosage:"2 powtórzenia",stop_criteria:"Ustalona granica",sort_order:n})));
 const current=(await api(`/rest/v1/home_plans?id=eq.${plan.id}&select=content_revision`,trainerToken))[0];
 await api("/rest/v1/rpc/approve_home_plan_guidance",trainerToken,"POST",{p_home_plan_id:plan.id,p_expected_revision:current.content_revision});
 await api("/rest/v1/rpc/publish_home_plan_guidance",trainerToken,"POST",{p_home_plan_id:plan.id});
 const clientToken=await login(clientPage,"attention.client@example.test",process.env.STUDIO_LAS_ATTENTION_CLIENT_PASSWORD);
 let form=clientPage.locator("form").filter({has:clientPage.getByLabel("Mam pytanie / potrzebuję kontaktu")}).first();
 await form.getByLabel("Twoja odpowiedź — opcjonalnie").fill("Wykonano zgodnie z ustaleniem.");
 await form.getByRole("button",{name:"Zapisz odpowiedź",exact:true}).click();
 await clientPage.getByText("Wykonano zgodnie z ustaleniem.",{exact:true}).waitFor();
 await queue(page); await empty(page); results.push("routine UI response creates no case");
 form=clientPage.locator("form").filter({has:clientPage.getByLabel("Mam pytanie / potrzebuję kontaktu")}).first();
 await form.getByLabel("Twoja odpowiedź — opcjonalnie").fill("Czy możemy omówić ustalenie? Dane fikcyjne.");
 await form.getByLabel("Mam pytanie / potrzebuję kontaktu").check();
 await form.getByRole("button",{name:"Zapisz odpowiedź",exact:true}).click();
 await clientPage.getByText("Czy możemy omówić ustalenie? Dane fikcyjne.",{exact:true}).waitFor();
 await queue(page); await page.locator(".attention-case").waitFor();
 assert.equal(await page.locator(".attention-case").count(),1);
 await screenshot(page,"attention-question-desktop");
 await page.setViewportSize({width:390,height:844}); await screenshot(page,"attention-question-mobile");
 await page.locator(".attention-case").getByRole("button",{name:"Otwórz kontekst",exact:true}).click();
 await page.getByRole("heading",{name:"Osoba testowa · dane fikcyjne",exact:true}).waitFor();
 await queue(page); assert.equal(await page.locator(".attention-case").count(),1); results.push("opening context does not close question");
 await page.getByRole("button",{name:"Potrzebny kontakt",exact:true}).click();
 await page.getByText("Kontakt nadal wymaga domknięcia",{exact:true}).waitFor();
 assert.equal(await page.locator(".attention-case").count(),1);
 await screenshot(page,"attention-contact-mobile");
 await page.getByRole("button",{name:"Wyloguj",exact:true}).click();
 trainerToken=await login(page,process.env.STUDIO_LAS_QA_EMAIL,process.env.STUDIO_LAS_QA_PASSWORD,true);
 await page.getByText("Kontakt nadal wymaga domknięcia",{exact:true}).waitFor(); results.push("open contact persists across logout/login without duplication");
 await page.locator(".attention-case summary").click();
 await page.getByLabel("Co ustalono po kontakcie?").fill(resolutionNote);
 await page.getByRole("button",{name:"Kontakt zakończony",exact:true}).click();
 await empty(page); results.push("explicit contact completion removes case");
 const remaining=(await api(`/rest/v1/rpc/client_portal_snapshot`,clientToken,"POST",{})).homePlan.items.find(i=>!i.todayResponse);
 await api("/rest/v1/rpc/save_client_guidance_response",clientToken,"POST",{p_home_plan_item_id:remaining.id,p_home_plan_id:plan.id,p_response:"Nowe pytanie po wcześniejszym kontakcie.",p_submission_id:randomUUID(),p_contact_requested:true});
 await queue(page); await page.getByText("Nowe pytanie po wcześniejszym kontakcie.",{exact:true}).waitFor();
 await page.getByRole("button",{name:"Przejrzane · bez zmiany",exact:true}).click(); await empty(page); results.push("new event after completion and review without change");
 const session=(await api("/rest/v1/sessions",trainerToken,"POST",{client_id:clientId,date:studioToday(),readiness:2}))[0];
 await queue(page); await page.locator(".attention-case").waitFor();
 await page.getByRole("button",{name:"Przejrzane · bez zmiany",exact:true}).click(); await empty(page);
 await api(`/rest/v1/sessions?id=eq.${session.id}`,trainerToken,"PATCH",{readiness:3});
 await queue(page); await page.locator(".attention-case").waitFor(); results.push("changed source not hidden by older review");
 await page.getByRole("button",{name:"Potrzebny kontakt",exact:true}).click();
 await page.getByText("Kontakt nadal wymaga domknięcia",{exact:true}).waitFor();
 await api(`/rest/v1/sessions?id=eq.${session.id}`,trainerToken,"PATCH",{readiness:2});
 await queue(page); assert.equal(await page.locator(".attention-case").count(),1);
 await page.locator(".attention-case summary").click();
 await page.getByLabel("Sprawdziłem zmieniony zapis").check();
 await page.getByLabel("Co ustalono po kontakcie?").fill("Sprawdzono nowszy zapis testowy.");
 await page.getByRole("button",{name:"Kontakt zakończony",exact:true}).click();
 await page.getByRole("button",{name:"Przejrzane · bez zmiany",exact:true}).waitFor();
 await page.getByRole("button",{name:"Przejrzane · bez zmiany",exact:true}).click(); await empty(page); results.push("source drift requires acknowledgement; newer source remains for review");
 await page.getByLabel("Wybierz klienta").selectOption(clientId);
 await page.getByText("Pokaż historię przejrzanych sygnałów",{exact:true}).click();
 await page.getByText(`Kontakt potwierdzony: ${new Intl.DateTimeFormat("pl-PL",{timeZone:"Europe/Warsaw"}).format(new Date())} · ${resolutionNote}`,{exact:true}).waitFor(); results.push("history retains original contact and resolution");
 const reviews=await api(`/rest/v1/trainer_signal_reviews?client_id=eq.${clientId}&select=id`,clientToken); assert.deepEqual(reviews,[]);
 const foreign=await api("/rest/v1/clients?id=eq.aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1&select=id",trainerToken); assert.deepEqual(foreign,[]);
 const snapshot=await api("/rest/v1/rpc/client_portal_snapshot",clientToken,"POST",{});
 assert.ok(!JSON.stringify(snapshot).includes(resolutionNote)); results.push("client cannot read trainer review or private resolution; foreign client invisible");
 await page.route(`${origin}/rest/v1/guidance_events?**`,route=>route.fulfill({status:503,contentType:"application/json",body:'{"message":"synthetic outage"}'}));
 await page.getByRole("button",{name:"Uwaga trenera",exact:true}).click();
 await page.getByText("Nie udało się wczytać spraw. Sprawdź dostęp i spróbuj ponownie.",{exact:true}).waitFor();
 assert.equal(await page.getByText("Brak spraw do przejrzenia.",{exact:true}).count(),0);
 await page.unroute(`${origin}/rest/v1/guidance_events?**`); await page.getByRole("button",{name:"Ponów odczyt",exact:true}).click(); await empty(page); results.push("read failure is not empty queue; retry recovers");
 assert.deepEqual(errors,[]);
 await writeFile(`${dir}/attention-flow.json`,JSON.stringify({status:"PASS",results},null,2));
 console.log("TRAINER_ATTENTION_FLOW_PASS",JSON.stringify(results));
} catch(error) { await page.screenshot({path:`${dir}/failure.png`,fullPage:true}).catch(()=>{}); throw error; }
finally { await browser.close(); }
