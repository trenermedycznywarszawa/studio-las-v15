import assert from "node:assert/strict";
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
export async function empty(page) { await page.getByText("Brak spraw do przejrzenia.",{exact:true}).waitFor(); assert.equal(await page.locator(".attention-case").count(),0); }
export async function screenshot(page,name) {
 assert.equal(await page.getByLabel("Wybierz klienta").locator("option").count(),2,"Screenshot must contain only the isolated synthetic client");
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,"Horizontal overflow");
 await page.screenshot({path:`${dir}/${name}.png`,fullPage:true});
}
