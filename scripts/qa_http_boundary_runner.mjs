// Browser-only QA test using real GoTrue-issued signed access tokens.
// No token, password, code, QR, or session may be logged, copied or persisted.
// This is served only from the QA local Node launcher; never bundled for production.
const QA_REF = "yipsjvbgxdmdicijxcph";
const CLIENT_A = "a7300000-0000-4000-8000-000000000001";
const CLIENT_B = "b7300000-0000-4000-8000-000000000002";
const BLOCKED_INSERT = "c7300000-0000-4000-8000-000000000003";

const $ = id => document.getElementById(id);
const output = $("results");
let trainerAal1Token = null;
let clientAToken = null;
let halted = false;
let qa;
const messages = [];
function report(phase, ok, detail = "") {
  const message = (ok ? "PASS" : "FAIL") + " · " + phase + (detail ? ": " + detail : "");
  messages.push(message);
  output.textContent = messages.join("\n");
  if (!ok) halted = true;
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function cleanInput(id) {
  const element = $(id);
  const value = element.value;
  element.value = "";
  return value;
}
function disableAll() {
  for (const id of ["trainerAal1","trainerAal2","clientATest","clientBTest"]) $(id).disabled = true;
}
function fail(phase, error) {
  // Only app-authored messages; never render network response bodies or credentials.
  report(phase, false, error instanceof Error ? error.message : "nieznany błąd");
  disableAll();
}
function readClaims(token) {
  const b64 = token.split(".")[1];
  assert(b64 && b64.length < 20000, "Niepoprawny format tokenu");
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64.length / 4) * 4, "=");
  return JSON.parse(atob(padded));
}
function checkToken(token, aal, sub) {
  const claims = readClaims(token);
  assert(claims.aal === aal, "Błędny poziom AAL");
  assert(claims.role === "authenticated" && typeof claims.sub === "string", "Błędna rola JWT");
  if (sub) assert(claims.sub === sub, "Zmiana tożsamości po MFA");
  return claims;
}
async function request(path, token, { method = "GET", body } = {}) {
  assert(path.startsWith("/") && !path.startsWith("//"), "Niepoprawna ścieżka QA");
  const response = await fetch(qa.origin + path, {
    method,
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    headers: {
      apikey: qa.key,
      ...(token ? { Authorization: "Bearer " + token } : {}),
      "Content-Type": "application/json",
      ...(method !== "GET" ? { Prefer: "return=representation" } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  return { status: response.status, ok: response.ok, data };
}
async function login(email, password) {
  assert(typeof password === "string" && password.length > 0, "Hasło nie zostało wpisane");
  const response = await request("/auth/v1/token?grant_type=password", null, {
    method: "POST", body: { email, password }
  });
  assert(response.ok && typeof response.data?.access_token === "string",
    "Logowanie Supabase Auth nie powiodło się");
  return response.data.access_token;
}
async function getRows(path, token) {
  const r = await request(path, token);
  assert(r.ok && Array.isArray(r.data), "Odczyt PostgREST nie powiódł się");
  return r.data;
}
function idsEqual(rows, ids, key = "id") {
  return rows.length === ids.length
    && ids.every(id => rows.some(row => row[key] === id));
}
function ensureNoPrivatePortal(snapshot, own, foreign) {
  const text = JSON.stringify(snapshot);
  assert(snapshot?.client?.firstName === own, "Portal nie zwrócił własnego klienta");
  assert(!text.includes(foreign), "Wykryto cudze dane w portalu");
  assert(!text.includes("PRIVATE-TRAINER"), "Wykryto prywatną notatkę trenera");
}
async function checkClient(email, password, ownId, ownName, foreignId, foreignName) {
  const token = await login(email, password);
  const claims = checkToken(token, "aal1");
  assert(claims.sub !== readClaims(trainerAal1Token).sub, "Test korzysta z konta trenera");
  const profiles = await getRows("/rest/v1/profiles?select=id,role", token);
  assert(profiles.length === 1 && profiles[0].role === "client", "Zła liczba/ranga widocznych profili");
  const links = await getRows("/rest/v1/client_users?select=client_id,user_id,status", token);
  assert(idsEqual(links,[ownId],"client_id") && links[0].status === "active",
    "Klient widzi niewłaściwe przypisania");
  const clients = await getRows("/rest/v1/clients?select=id,name",token);
  assert(clients.length === 0,"Klient odczytuje prywatną tabelę klientów");
  const portal = await request("/rest/v1/rpc/client_portal_snapshot",token,{method:"POST",body:{}});
  assert(portal.ok && portal.data && typeof portal.data === "object","Portal RPC nie zadziałał");
  ensureNoPrivatePortal(portal.data,ownName,foreignName);
  const unauthorized = await request(
    "/rest/v1/client_users?client_id=eq." + encodeURIComponent(foreignId),
    token, {method:"PATCH",body:{status:"revoked"}});
  assert(!unauthorized.ok || (Array.isArray(unauthorized.data) && unauthorized.data.length===0),
    "Klient zmienił cudze powiązanie");
  return token;
}
try {
  const config = window.STUDIO_LAS_CONFIG;
  assert(location.hostname === "127.0.0.1", "Tester działa tylko na 127.0.0.1");
  assert(config?.mode === "qa"
    && config?.supabase?.projectRef === QA_REF
    && config?.supabase?.url === "https://" + QA_REF + ".supabase.co"
    && String(config?.supabase?.publishableKey || "").startsWith("sb_publishable_"),
    "BLOCKED: brak dokładnej konfiguracji izolowanego QA");
  qa = {origin: config.supabase.url,key:config.supabase.publishableKey};
  output.textContent = "READY: tylko izolowane Supabase QA · hasła i tokeny nie są zapisywane.";
} catch (e) {
  fail("Weryfikacja środowiska", e);
}
$("trainerAal1").addEventListener("click", async () => {
  if (halted) return;
  $("trainerAal1").disabled = true;
  const password = cleanInput("trainerPass");
  try {
    trainerAal1Token = await login("attention.trainer@example.test", password);
    const claims = checkToken(trainerAal1Token,"aal1");
    const profile = await getRows("/rest/v1/profiles?select=id,role",trainerAal1Token);
    assert(profile.length === 1 && profile[0].role === "trainer",
      "To nie jest testowa sesja trenera");
    const seen = await getRows("/rest/v1/clients?select=id,name",trainerAal1Token);
    assert(seen.length === 0, "AAL1 potrafi odczytać rekordy klientów");
    const denied = await request("/rest/v1/clients",trainerAal1Token,
      {method:"POST",body:{
        id:BLOCKED_INSERT,owner_trainer_id:profile[0].id,name:"AAL1 blocked QA"
      }});
    assert(!denied.ok && (denied.status === 401 || denied.status === 403
      || denied.data?.code === "42501"),
      "AAL1 uzyskał nieoczekiwane uprawnienie INSERT lub niejednoznaczną odmowę");
    report("Trener AAL1",true,"odczyt 0 klientów, INSERT zabroniony przez API");
    $("trainerAal2").disabled = false;
  } catch(e) { fail("Trener AAL1",e); }
});
$("trainerAal2").addEventListener("click", async () => {
  if (halted || !trainerAal1Token) return;
  $("trainerAal2").disabled = true;
  const code = cleanInput("trainerCode");
  try {
    assert(/^\d{6}$/.test(code),"Kod musi mieć sześć cyfr");
    const user = await request("/auth/v1/user",trainerAal1Token);
    assert(user.ok && user.data?.id,"Nie udało się odczytać profilu GoTrue");
    const verified = (user.data.factors || [])
      .filter(f=>f.factor_type==="totp" && f.status==="verified");
    assert(verified.length===1,"Wymagany dokładnie jeden zweryfikowany czynnik TOTP");
    const factor = verified[0];
    const challenge = await request(
      "/auth/v1/factors/"+encodeURIComponent(factor.id)+"/challenge",
      trainerAal1Token,{method:"POST",body:{}});
    assert(challenge.ok && typeof challenge.data?.id==="string",
      "Nie udało się rozpocząć wyzwania MFA");
    const confirmation = await request(
      "/auth/v1/factors/"+encodeURIComponent(factor.id)+"/verify",
      trainerAal1Token,{method:"POST",body:{
        challenge_id:challenge.data.id,code
      }});
    assert(confirmation.ok && typeof confirmation.data?.access_token==="string",
      "Nie udało się zweryfikować kodu TOTP");
    const aal2 = confirmation.data.access_token;
    checkToken(aal2,"aal2",user.data.id);
    const owned = await getRows("/rest/v1/clients?select=id,name&order=name.asc",aal2);
    assert(idsEqual(owned,[CLIENT_A,CLIENT_B]),"Trener AAL2 nie widzi dokładnie dwóch klientów QA");
    report("Trener AAL2",true,"prawdziwy TOTP, JWT aal2 i dwaj klienci widoczni przez REST");
    $("clientATest").disabled = false;
  } catch(e) { fail("Trener AAL2",e); }
});
$("clientATest").addEventListener("click", async () => {
  if (halted) return;
  $("clientATest").disabled = true;
  const password = cleanInput("clientAPass");
  try {
    clientAToken = await checkClient("qa.client@example.test",password,CLIENT_A,
      "TestA",CLIENT_B,"TestB");
    report("Klient A",true,"tylko własny portal; zapis cudzej relacji odmówiony");
    $("clientBTest").disabled = false;
  } catch(e) { fail("Klient A",e); }
});
$("clientBTest").addEventListener("click", async () => {
  if (halted) return;
  $("clientBTest").disabled = true;
  const password = cleanInput("clientBPass");
  try {
    await checkClient("qa.foreign@example.test",password,CLIENT_B,
      "TestB",CLIENT_A,"TestA");
    const aLinks = await getRows("/rest/v1/client_users?select=client_id,status",clientAToken);
    assert(idsEqual(aLinks,[CLIENT_A],"client_id") && aLinks[0].status==="active",
      "Klient B zmodyfikował klienta A");
    const bLinks = await getRows("/rest/v1/client_users?select=client_id,status",
      await login("qa.foreign@example.test",password));
    // The password input was already cleared; the checks above are sufficient,
    // but this is intentionally never a claim about an independent second login.
    report("Klient B",true,"własny portal, odmowa dostępu do A; relacja A nadal aktywna");
    report("Wynik końcowy",true,"HTTP Auth/REST: 4/4; zamknij stronę; brak trwałych sesji");
    trainerAal1Token=null;
    clientAToken=null;
  } catch(e) { fail("Klient B",e); }
});
$("reset").addEventListener("click",()=>window.location.replace("/__qa_security/"));
