import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
// playwright is dynamically imported only after assertE2eSafetyGate succeeds.
import { api, login } from "./attention_e2e_helpers.mjs";
import { assertE2eSafetyGate, SYNTHETIC_QA_CLIENT_ID } from "./e2e_safety_gate.mjs";
const id=SYNTHETIC_QA_CLIENT_ID, dir=process.env.STUDIO_LAS_E2E_ARTIFACT_DIR;
const marker=process.env.STUDIO_LAS_E2E_MARKER;
const title=`Pierwsza wskazówka · ${marker}`;
const privateText=`Prywatna interpretacja PWD · ${marker}`;
const today=new Date().toISOString().slice(0,10), review=new Date(Date.now()+21*86400000).toISOString().slice(0,10);
assertE2eSafetyGate(process.env);
const { chromium } = await import("playwright");
await mkdir(dir,{recursive:true});
const browser=await chromium.launch();
const tc=await browser.newContext({viewport:{width:1440,height:1000}}), cc=await browser.newContext({viewport:{width:390,height:844}});
const t=await tc.newPage(), c=await cc.newPage();
try {
 const token=await login(t,process.env.STUDIO_LAS_QA_EMAIL,process.env.STUDIO_LAS_QA_PASSWORD,true);
 const clientToken=await login(c,"attention.client@example.test",process.env.STUDIO_LAS_ATTENTION_CLIENT_PASSWORD);
 const snapshot=()=>api("/rest/v1/rpc/client_portal_snapshot",clientToken,"POST",{});
 const readGate=async()=>(await api("/rest/v1/rpc/trainer_guidance_snapshot",token,"POST",{p_client_id:id})).startGate;
 assert.equal((await snapshot()).homePlan,null,"The client must have no published guidance");
 assert.equal((await readGate()).reason,"pwd_required","The fixture must have no earlier PWD or publication");
 await t.getByLabel("Wybierz klienta").selectOption(id);
 await t.getByText("Dostęp klienta do aplikacji: aktywny.",{exact:true}).waitFor();
 const pwdSection=t.locator("section").filter({has:t.getByRole("heading",{name:"Pierwsza wizyta diagnostyczna",exact:true})});
 const openComposer=pwdSection.getByText("Przygotuj pierwszą wskazówkę z tej PWD",{exact:true});
 await pwdSection.getByText(/^Przed pierwszą wskazówką zapisz PWD/).waitFor();
 assert.equal(await openComposer.count(),0);

 async function savePwd(formLabel,decision,interpretation) {
  await pwdSection.getByText(formLabel,{exact:true}).click();
  const pwd=pwdSection.locator('form').filter({has:t.locator('[name="realLifeGoal"]')});
  const fields = {
   date: today,
   realLifeGoal: "Swobodne wejście po schodach",
   whyImportant: "Samodzielność — dane fikcyjne",
   contextBoundaries: "Omówione granice — tylko trener",
   trainerInterpretation: interpretation,
   nextStep: "Omówić ustalenia z klientem"
  };
  for (const [name,value] of Object.entries(fields)) await pwd.locator(`[name="${name}"]`).fill(value);
  await pwd.locator('[name="trainerDecision"]').selectOption(decision);
  await pwd.locator('button[type="submit"]').click();
  await pwdSection.getByText(interpretation,{exact:false}).first().waitFor();
 }

 await savePwd("Zapisz pierwszą wizytę diagnostyczną","defer_or_refer",`Odroczona decyzja · ${marker}`);
 await pwdSection.getByText(/^Aktualna decyzja PWD nie rozpoczyna prowadzenia/).waitFor();
 assert.equal(await openComposer.count(),0);
 assert.equal((await readGate()).reason,"pwd_defers_start");
 assert.equal((await snapshot()).homePlan,null);

 await savePwd("Dodaj korektę pierwszej wizyty diagnostycznej","continue_guidance",privateText);
 assert.equal((await readGate()).reason,"pwd_allows_start");
 assert.equal((await snapshot()).homePlan,null,"PWD alone cannot publish guidance");
 await openComposer.click();
 const form=t.locator(".first-guidance-form");
 assert.ok((await form.locator('[name="focus"]').inputValue()).includes("Swobodne wejście po schodach"));
 assert.equal(await form.locator('[name="instructions"]').inputValue(),"");
 await form.locator('[name="title"]').fill(title);
 await form.locator('[name="frequency"]').fill("2 razy w tygodniu");
 await form.locator('[name="reviewDate"]').fill(review);
 await form.locator('[name="instructions"]').fill("Ustalenia z rozmowy. Pytania zgłaszaj osobno.");
 await form.screenshot({path:`${dir}/pwd-first-guidance-desktop.png`});
 await t.setViewportSize({width:390,height:844});assert.equal(await t.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 await form.screenshot({path:`${dir}/pwd-first-guidance-mobile.png`});
 await form.getByRole("button",{name:"Zapisz szkic pierwszej wskazówki",exact:true}).click();
 await t.locator(".guidance-record").filter({hasText:title}).waitFor();
 let plan=(await api(`/rest/v1/home_plans?client_id=eq.${id}&title=eq.${encodeURIComponent(title)}&select=*`,token))[0];
 assert.equal(plan.status,"draft");assert.equal(plan.published_at,null);assert.equal(plan.approved_at,null);
 assert.ok(plan.instructions.includes(review));assert.ok(!JSON.stringify(plan).includes(privateText));
 assert.equal((await snapshot()).homePlan,null,"The client cannot see a draft");
 await t.getByText("Dodaj działanie do szkicu",{exact:true}).click();
 const action=t.locator('form').filter({has:t.locator('[name="homePlanId"]')});
 await action.locator('[name="homePlanId"]').selectOption(plan.id);
 for(const [name,value] of Object.entries({name:"Ruch omówiony z trenerem",dosage:"2 spokojne powtórzenia",frequency:"2 razy w tygodniu",clientCue:"Zgodnie z demonstracją",stopCriteria:"Przerwij przy ustalonym sygnale"})) await action.locator(`[name="${name}"]`).fill(value);
 await action.locator('button[type="submit"]').click();
 await t.getByText("Ruch omówiony z trenerem",{exact:true}).waitFor();
 let card=t.locator(".guidance-record").filter({hasText:title});
 await card.getByRole("button",{name:"Zatwierdź tę treść do publikacji",exact:true}).click();
 await card.getByRole("button",{name:"Opublikuj jako aktualną wskazówkę",exact:true}).waitFor();
 assert.equal((await snapshot()).homePlan,null,"Approval alone cannot publish");
 await card.getByRole("button",{name:"Opublikuj jako aktualną wskazówkę",exact:true}).click();
 await card.getByRole("button",{name:"Wycofaj wskazówkę",exact:true}).waitFor();
 await c.reload();await c.getByRole("heading",{name:title,exact:true}).waitFor();
 const after=await snapshot();assert.equal(after.homePlan.id,plan.id);assert.equal(after.homePlan.items[0].dosage,"2 spokojne powtórzenia");assert.ok(!JSON.stringify(after).includes(privateText));
 assert.equal(after.homePlan.releaseVersion,1,"This must be the first publication");
 assert.equal((await readGate()).reason,"publication_history");
 await c.screenshot({path:`${dir}/first-guidance-client-mobile.png`,fullPage:true});
 await writeFile(`${dir}/pwd-first-guidance.json`,JSON.stringify({status:"PASS",missingPwdBlocked:true,deferredPwdBlocked:true,firstPublication:true,savedPwdToDraft:true,contextReused:true,privateInterpretationExcluded:true,reviewDateInVersion:true,separateApprovalPublication:true},null,2));
}finally{await browser.close();}
