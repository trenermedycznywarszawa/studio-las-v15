import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { SupabaseAuth } from "../assets/os/data.js";
import { TrainerMfaController } from "../assets/os/trainer-mfa.js";
import { consumePasswordCallback, preparePasswordSetup, updatePassword } from "../assets/os/password-auth.js";
import { getPasswordSetupContext, userSafeError, submitPasswordLogin, isInsufficientAal } from "../assets/os/runtime.js";

const SESSION = "studio-las-auth-session";
const FACTOR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CHALLENGE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const jwt = aal => `e30.${Buffer.from(JSON.stringify({ aal })).toString("base64url")}.test`;
const token = aal => ({ access_token: jwt(aal), refresh_token: "fixture-refresh", expires_in: 3600 });
const storage = new Map();
globalThis.sessionStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
};
globalThis.document = { title: "Test", getElementById: () => ({}) };
globalThis.window = {
  location: { hash: "", search: "", pathname: "/os/" },
  history: { replaceState: () => { window.location.hash = ""; } },
  addEventListener() {}
};
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
let factors, calls, failVerify, rejectPut, expired, verifyAal;
function fixture(withMfa = true) {
  storage.clear(); calls = []; verifyAal = "aal2"; failVerify = false; rejectPut = false; expired = false;
  factors = withMfa ? [{ id: FACTOR, factor_type: "totp", status: "verified" }] : [];
  const auth = new SupabaseAuth({ supabaseUrl: "https://example.test", publishableKey: "fixture-key" });
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname + new URL(url).search;
    const method = options.method;
    calls.push(`${method} ${path}`);
    if (path.includes("grant_type=")) return response(token("aal1"));
    if (expired) return response({ code: "bad_jwt" }, 401);
    if (path === "/auth/v1/user" && method === "GET") return response({ id: "user", factors });
    if (path.startsWith("/rest/v1/profiles")) return response([{ id: "user", role: withMfa ? "trainer" : "client", is_active: true }]);
    if (path.endsWith("/challenge")) return response({ id: CHALLENGE });
    if (path.endsWith("/verify")) return failVerify
      ? response({ code: "mfa_verification_failed" }, 422) : response(token(verifyAal));
    if (path === "/auth/v1/user" && method === "PUT") {
      if (rejectPut) return response({ code: "insufficient_aal" }, 401);
      assert.equal(options.headers.get("Authorization"), `Bearer ${jwt(withMfa ? "aal2" : "aal1")}`);
      return response({ id: "user" });
    }
    if (path === "/auth/v1/logout") return response({});
    throw new Error(`Unexpected fixture endpoint: ${method} ${path}`);
  };
  window.location.hash = `#type=recovery&access_token=${jwt("aal1")}&refresh_token=fixture-refresh`;
  consumePasswordCallback(auth);
  assert.equal(window.location.hash, "");
  assert.equal(storage.has(SESSION), false, "callback must not persist unknown-role AAL1");
  return auth;
}

// Real app orchestration with UI renderers replaced by callback captures.
const source = readFileSync(new URL("../assets/os/app.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?from ".*?";\s*/gm, "")
  .replace(/initialize\(\);\s*$/, "");
let screen, setup, mfaUi, portalLoads = 0;
const auth = fixture();
const mfa = new TrainerMfaController(auth);
const context = vm.createContext({
  TrainerWorkspaceLoader: class { reset() {} },
  TrainerAttentionController: class { reset() {} },
  document, window, preparePasswordSetup, updatePassword, getPasswordSetupContext,
  userSafeError, isInsufficientAal,
  createRuntimeFeedback: () => ({ announce() {}, withWrite() {} }),
  renderLoading() {},
  renderPasswordSetup: (_root, props) => { screen = "password"; setup = props; },
  renderTrainerMfa: (_root, props) => { screen = "mfa"; mfaUi = props; }
});
vm.runInContext(source, context);
context.testAuth = auth; context.testMfa = mfa;
context.portal = async () => { portalLoads++; };
vm.runInContext('state.auth = testAuth; state.mfa = testMfa; loadAuthenticatedRuntime = portal;', context);
await vm.runInContext('showPasswordSetup("recovery")', context);
assert.equal(screen, "mfa");
assert.equal(setup, undefined);
await assert.rejects(updatePassword(auth, "fixture-password"), isInsufficientAal);
assert.equal(calls.some(call => call.startsWith("PUT")), false);
await auth.refresh();
assert.equal(storage.has(SESSION), false);
assert.equal(getPasswordSetupContext(), "recovery");
failVerify = true;
await mfaUi.onVerify("000000");
assert.equal(screen, "mfa");
assert.equal(storage.has(SESSION), false);
assert.equal(portalLoads, 0);
failVerify = false;
verifyAal = "aal1";
await mfaUi.onVerify("123456");
assert.equal(screen, "mfa", "verify response without AAL2 must not open password form");
assert.equal(storage.has(SESSION), false);
verifyAal = "aal2";
await mfaUi.onRetry();
await mfaUi.onVerify("123456");
assert.equal(screen, "password");
assert.equal(auth.getAuthenticatorAssuranceLevel(), "aal2");
assert.equal(getPasswordSetupContext(), "recovery");
assert.equal(portalLoads, 0, "MFA must return to password setup, not trainer portal");
const restored = new SupabaseAuth(auth.config);
await restored.restore();
assert.equal((await preparePasswordSetup(restored, new TrainerMfaController(restored))).status, "verified");
assert.equal(getPasswordSetupContext(), "recovery", "reload must preserve password gate");
await setup.onSubmit("fixture-password");
assert.equal(getPasswordSetupContext(), null);
assert.equal(portalLoads, 1);
assert.equal(calls.filter(call => call.startsWith("PUT")).length, 1);
assert.ok(calls.findIndex(call => call.endsWith("/verify")) < calls.findIndex(call => call.startsWith("PUT")));

// No-MFA client recovery remains available and resumable.
const client = fixture(false);
assert.equal((await preparePasswordSetup(client, new TrainerMfaController(client))).status, "verified");
assert.equal(storage.has(SESSION), true);
await updatePassword(client, "fixture-password");
assert.equal(getPasswordSetupContext(), null);
assert.equal(calls.some(call => call.includes("/factors/")), false);

// Backend step-up errors never trigger token refresh or an expired-link message.
rejectPut = true;
const before = calls.length;
await assert.rejects(updatePassword(client, "fixture-password"), error => {
  assert.equal(isInsufficientAal(error), true);
  assert.match(userSafeError(error), /MFA/);
  assert.doesNotMatch(userSafeError(error), /wygasła/);
  return true;
});
assert.equal(calls.slice(before).some(call => call.includes("grant_type=")), false);
expired = true;
await assert.rejects(client.getUser(), error => {
  assert.equal(isInsufficientAal(error), false);
  assert.match(userSafeError(error), /wygasła/);
  return true;
});

// A pending AAL1 session left by an older frontend is removed before challenge.
const legacy = fixture();
legacy.persistCurrentSession();
assert.equal(storage.has(SESSION), true);
assert.equal((await preparePasswordSetup(legacy, new TrainerMfaController(legacy))).status, "challenge");
assert.equal(storage.has(SESSION), false);
assert.equal(getPasswordSetupContext(), "recovery");
assert.match(userSafeError({ status: 401, details: { error_code: "insufficient_aal" } }), /MFA/);

// Cancel clears recovery state; ordinary login still starts memory-only.
const login = fixture();
await login.logout();
assert.equal(getPasswordSetupContext(), null);
assert.equal(storage.has(SESSION), false);
await submitPasswordLogin(login, { email: "trainer@example.test", password: "fixture-password" });
assert.equal(storage.has(SESSION), false);
const loginMfa = new TrainerMfaController(login);
assert.equal((await loginMfa.prepare()).status, "challenge");
assert.equal((await loginMfa.verify("123456")).status, "verified");
assert.equal(storage.has(SESSION), true);
assert.equal(getPasswordSetupContext(), null);
console.log("PASS recovery: AAL1 -> TOTP -> AAL2 -> password; refusal, retry, reload, cancel, client and login regressions");
