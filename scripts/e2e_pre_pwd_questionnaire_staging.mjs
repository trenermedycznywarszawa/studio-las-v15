import { createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const ORIGIN = "https://ulauyoqjoetjqktegeuq.supabase.co";
const APP = process.env.STUDIO_LAS_E2E_URL || "http://127.0.0.1:8790/studio-las-os.html";
const KEY = String(process.env.STUDIO_LAS_STAGING_PUBLISHABLE_KEY || "");
const EMAIL = String(process.env.STUDIO_LAS_QA_EMAIL || "");
const PASSWORD = String(process.env.STUDIO_LAS_QA_PASSWORD || "");
const SECRET = String(process.env.STUDIO_LAS_QA_TOTP_SECRET || "");
const OUT = process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/browser-e2e";
const MARKER = `E2E-${String(process.env.STUDIO_LAS_E2E_MARKER || Date.now()).replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 70)}-PREPWD`;

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const api = async (path, token = "", body) => {
  const response = await fetch(`${ORIGIN}${path}`, { method: body === undefined ? "GET" : "POST", headers: {
    apikey: KEY, Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(body === undefined ? {} : { "Content-Type": "application/json" })
  }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${path.split("?")[0]} -> ${response.status}`);
  return payload;
};
const rpc = (token, name, body) => api(`/rest/v1/rpc/${name}`, token, body);
const q = (table, params) => `/rest/v1/${table}?${new URLSearchParams(params)}`;

function base32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of value.toUpperCase().replace(/=+$/g, "")) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function totp() {
  const counter = Math.floor(Date.now() / 30000);
  const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32(SECRET)).update(b).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1000000).padStart(6, "0");
}
async function aal2() {
  const password = await api("/auth/v1/token?grant_type=password", "", { email: EMAIL, password: PASSWORD });
  const user = await api("/auth/v1/user", password.access_token);
  const factor = (user.factors || []).find(x => x.factor_type === "totp" && x.status === "verified");
  assert(factor, "QA TOTP factor missing");
  const challenge = await api(`/auth/v1/factors/${factor.id}/challenge`, password.access_token, { factorId: factor.id });
  const verified = await api(`/auth/v1/factors/${factor.id}/verify`, password.access_token, { challenge_id: challenge.id, code: totp() });
  return verified.session || verified;
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const trainerContext = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: "Europe/Warsaw" });
const clientContext = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "Europe/Warsaw" });
const trainer = await trainerContext.newPage();
const client = await clientContext.newPage();
let session, inquiryId = "", clientId = "", link = "", error = null;
const consoleErrors = [], failedRequests = [];
for (const page of [trainer, client]) {
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("requestfailed", r => failedRequests.push(`${r.method()} ${r.url()}`));
}

try {
  session = await aal2();
  const fixture = await rpc(session.access_token, "create_stage2_synthetic_inquiry_e2e", { p_marker: MARKER });
  inquiryId = fixture.inquiryId;
  await rpc(session.access_token, "set_inquiry_contact_state", { p_inquiry_id: inquiryId, p_contact_status: "completed", p_next_action_type: null, p_next_action_at: null, p_close_inquiry: false });
  await rpc(session.access_token, "save_inquiry_decision", { p_inquiry_id: inquiryId, p_decision: "PWD", p_goal_in_person_words: "Chcę wrócić do spokojnego biegania 5 km.", p_why_now: "Chcę odzyskać regularny ruch.", p_current_barrier: "Brakuje mi bezpiecznego punktu startowego.", p_rationale: "WPD jest właściwym kolejnym krokiem.", p_boundary_note: null, p_next_action_type: "arrange_pwd", p_next_action_at: null });
  clientId = (await rpc(session.access_token, "convert_inquiry_to_pwd_client", { p_inquiry_id: inquiryId })).clientId;

  await trainer.addInitScript(s => sessionStorage.setItem("studio-las-auth-session", JSON.stringify(s)), session);
  await trainer.goto(APP, { waitUntil: "domcontentloaded" });
  await trainer.getByRole("heading", { name: "Panel trenera" }).waitFor({ state: "visible", timeout: 20000 });
  await trainer.getByLabel("Wybierz pierwszy kontakt").selectOption(inquiryId);
  await trainer.getByText("Przygotowanie do Pierwszej Wizyty Diagnostycznej", { exact: true }).waitFor({ state: "visible" });
  await trainer.getByRole("button", { name: "Utwórz ankietę przed WPD" }).click();
  const linkInput = trainer.getByLabel("Link do ankiety przed Pierwszą Wizytą Diagnostyczną");
  await linkInput.waitFor({ state: "visible", timeout: 20000 });
  link = await linkInput.inputValue();
  assert(link.includes("#token=") && !link.includes("?token="), "Token URL boundary failed");
  await trainer.getByText("Gotowa do wysłania", { exact: false }).waitFor({ state: "visible" });
  await trainer.screenshot({ path: `${OUT}/pre-pwd-trainer-ready.png`, fullPage: true });
  await trainer.getByRole("button", { name: "Oznacz jako wysłaną" }).click();
  await trainer.getByText("Wysłana — czekamy na odpowiedzi", { exact: false }).waitFor({ state: "visible" });

  await client.goto(link, { waitUntil: "domcontentloaded" });
  await client.getByRole("heading", { name: "Ankieta przed Pierwszą Wizytą Diagnostyczną" }).waitFor({ state: "visible" });
  assert(await client.evaluate(() => location.search === ""), "Token leaked to query string");
  assert(await client.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Client mobile overflow");
  await client.screenshot({ path: `${OUT}/pre-pwd-client-form.png`, fullPage: true });
  await client.getByLabel("Co przede wszystkim chcesz znów móc robić swobodniej?").fill("Chcę wrócić do spokojnego biegania 5 km.");
  await client.getByLabel("Dlaczego jest to dla Ciebie ważne właśnie teraz?").fill("Chcę znów regularnie ruszać się po pracy.");
  await client.getByLabel("Co dziś najbardziej utrudnia Ci zrobienie kolejnego kroku?").fill("Nie wiem, od jakiego obciążenia zacząć.");
  await client.getByLabel("Co się wydarzyło i od kiedy zauważasz problem lub ograniczenie?").fill("Fikcyjna historia QA po dłuższej przerwie.");
  await client.getByLabel("Czego najbardziej obawiasz się przy powrocie do ruchu lub aktywności?").fill("Że zacznę zbyt szybko.");
  await client.getByLabel("Po czym poznasz, że pierwsze spotkanie było dla Ciebie naprawdę użyteczne?").fill("Będę wiedzieć, co robić teraz i jaki jest następny krok.");
  await client.getByRole("checkbox").check();
  await client.getByRole("button", { name: "Wyślij odpowiedzi" }).click();
  await client.getByText("Dziękuję. Odpowiedzi zostały zapisane.", { exact: false }).waitFor({ state: "visible", timeout: 20000 });
  await client.screenshot({ path: `${OUT}/pre-pwd-client-success.png`, fullPage: true });

  const intakes = await api(q("client_intakes", { client_id: `eq.${clientId}`, source: "eq.pre_pwd_questionnaire_v1", select: "id,main_goal,raw_payload" }), session.access_token);
  assert(Array.isArray(intakes) && intakes.length === 1, "Expected one pre-WPD intake");
  assert(intakes[0].raw_payload?.privacyNoticeVersion === "pre-pwd-v1", "Privacy version missing");

  await trainer.getByRole("button", { name: "Odśwież" }).click();
  await trainer.getByLabel("Wybierz pierwszy kontakt").selectOption(inquiryId);
  await trainer.getByText("Status ankiety: Wypełniona", { exact: false }).waitFor({ state: "visible", timeout: 20000 });
  await trainer.getByText("Ładowanie procesu...", { exact: true }).waitFor({ state: "hidden", timeout: 20000 }).catch(() => {});
  await trainer.waitForTimeout(700);
  await trainer.screenshot({ path: `${OUT}/pre-pwd-trainer-completed.png`, fullPage: true });
  assert(consoleErrors.length === 0, `Console errors: ${consoleErrors.join(" | ")}`);
  assert(failedRequests.length === 0, `Request failures: ${failedRequests.join(" | ")}`);
} catch (e) {
  error = e;
  await trainer.screenshot({ path: `${OUT}/pre-pwd-trainer-failure.png`, fullPage: true }).catch(() => {});
  await client.screenshot({ path: `${OUT}/pre-pwd-client-failure.png`, fullPage: true }).catch(() => {});
} finally {
  if (session?.access_token && inquiryId) await rpc(session.access_token, "cleanup_stage2_synthetic_inquiry_e2e", { p_inquiry_id: inquiryId, p_marker: MARKER }).catch(e => failedRequests.push(`cleanup: ${e.message}`));
  await writeFile(`${OUT}/pre-pwd-questionnaire-result.json`, JSON.stringify({ stagingRef: "ulauyoqjoetjqktegeuq", inquiryId, clientId, linkShape: link ? link.replace(/#token=.*/, "#token=[redacted]") : null, trainerViewport: [1440,1100], clientViewport: [390,844], consoleErrors, failedRequests, status: error || failedRequests.length ? "FAIL" : "PASS", reason: error ? String(error.message || error) : null }, null, 2));
  await trainerContext.close(); await clientContext.close(); await browser.close();
}
if (error) throw error;
if (failedRequests.length) throw new Error(failedRequests.join(" | "));
console.log("PRE_PWD_QUESTIONNAIRE_BROWSER_E2E_SUCCESS PASS");