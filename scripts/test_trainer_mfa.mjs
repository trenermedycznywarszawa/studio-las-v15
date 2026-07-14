import assert from "node:assert/strict";
import { SupabaseAuth } from "../assets/os/data.js";
import { TrainerMfaController } from "../assets/os/trainer-mfa.js";

const SESSION_KEY = "studio-las-auth-session";
const FACTOR_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FACTOR_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CHALLENGE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function jwt(aal, suffix = "token") {
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ aal, sub: suffix })}.signature`;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

const storage = new Map();
globalThis.sessionStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
};

async function testSessionPersistenceBoundary() {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname + new URL(url).search;
    calls.push({ path, body: options.body ? JSON.parse(options.body) : null });
    if (path === "/auth/v1/token?grant_type=password") {
      return jsonResponse({
        access_token: jwt("aal1", "password"),
        refresh_token: "refresh-password",
        expires_in: 3600,
        token_type: "bearer"
      });
    }
    if (path === "/auth/v1/token?grant_type=refresh_token") {
      return jsonResponse({
        access_token: jwt("aal1", "refresh"),
        refresh_token: "refresh-rotated",
        expires_in: 3600,
        token_type: "bearer"
      });
    }
    if (path === `/auth/v1/factors/${FACTOR_A}/verify`) {
      return jsonResponse({
        access_token: jwt("aal2", "verified"),
        refresh_token: "refresh-aal2",
        expires_in: 3600,
        token_type: "bearer"
      });
    }
    return jsonResponse({ message: "unexpected test request" }, 500);
  };

  storage.clear();
  const auth = new SupabaseAuth({
    supabaseUrl: "https://example.supabase.co",
    publishableKey: "test-publishable-key"
  });

  await auth.signInWithPassword("trainer@example.test", "not-a-real-password", {
    persist: false
  });
  assert.equal(auth.getAuthenticatorAssuranceLevel(), "aal1");
  assert.equal(storage.has(SESSION_KEY), false, "password-only trainer session was persisted");

  // A token refresh while the challenge is open must remain memory-only and AAL1.
  await auth.refresh();
  assert.equal(auth.getAuthenticatorAssuranceLevel(), "aal1");
  assert.equal(storage.has(SESSION_KEY), false, "AAL1 refresh bypassed the persistence gate");

  await auth.verifyTotp(FACTOR_A, CHALLENGE, "123456");
  assert.equal(auth.getAuthenticatorAssuranceLevel(), "aal2");
  assert.equal(storage.has(SESSION_KEY), true, "verified AAL2 session was not persisted");
  const stored = JSON.parse(storage.get(SESSION_KEY));
  assert.equal(stored.access_token, auth.session.access_token);
  assert.equal("factorId" in stored, false);
  assert.equal("challengeId" in stored, false);
  assert.equal(calls.some(call => call.path.includes("/verify")), true);
}

class FakeAuth {
  constructor({ aal = "aal1", factors = [] } = {}) {
    this.aal = aal;
    this.factors = factors.map(factor => ({ ...factor }));
    this.challengeCalls = 0;
    this.verifyCalls = [];
    this.unenrolled = [];
    this.loggedOut = false;
  }

  getAuthenticatorAssuranceLevel() {
    return this.aal;
  }

  async listTotpFactors() {
    return this.factors.map(factor => ({ ...factor }));
  }

  async challengeTotp(factorId) {
    this.challengeCalls += 1;
    return { id: CHALLENGE, factorId };
  }

  async verifyTotp(factorId, challengeId, code) {
    this.verifyCalls.push({ factorId, challengeId, code });
    this.aal = "aal2";
    const factor = this.factors.find(item => item.id === factorId);
    if (factor) factor.status = "verified";
  }

  async enrollTotp() {
    this.factors.push({
      id: FACTOR_A,
      status: "unverified",
      friendlyName: "Studio Las",
      createdAt: "2026-07-13T12:00:00Z"
    });
    return {
      id: FACTOR_A,
      totp: {
        qr_code: "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>",
        secret: "TEST-SECRET-NOT-REAL"
      }
    };
  }

  async unenrollTotp(factorId) {
    this.unenrolled.push(factorId);
    this.factors = this.factors.filter(factor => factor.id !== factorId);
  }

  async logout() {
    this.loggedOut = true;
    this.aal = "aal1";
  }
}

async function testControllerFlows() {
  const existing = new FakeAuth({
    factors: [{ id: FACTOR_A, status: "verified", friendlyName: "Telefon", createdAt: "" }]
  });
  const challengeController = new TrainerMfaController(existing);
  const challenge = await challengeController.prepare();
  assert.equal(challenge.status, "challenge");
  assert.equal(existing.challengeCalls, 1);

  // Simulated AAL1 refresh does not clear the in-memory challenge or unlock data.
  existing.aal = "aal1";
  const verified = await challengeController.verify("123456");
  assert.equal(verified.status, "verified");
  assert.deepEqual(existing.verifyCalls[0], {
    factorId: FACTOR_A,
    challengeId: CHALLENGE,
    code: "123456"
  });

  const missing = new FakeAuth({
    factors: [{ id: FACTOR_B, status: "unverified", friendlyName: "Stary", createdAt: "" }]
  });
  const enrollmentController = new TrainerMfaController(missing);
  assert.equal((await enrollmentController.prepare()).status, "enrollment_required");
  const enrollment = await enrollmentController.beginEnrollment();
  assert.equal(enrollment.status, "enrollment");
  assert.equal(enrollment.qrCode.startsWith("data:image/svg+xml"), true);
  assert.deepEqual(missing.unenrolled, [FACTOR_B]);
  assert.equal((await enrollmentController.verify("654321")).status, "verified");

  const multiple = new FakeAuth({
    aal: "aal2",
    factors: [
      { id: FACTOR_A, status: "verified", friendlyName: "Pierwszy", createdAt: "" },
      { id: FACTOR_B, status: "verified", friendlyName: "Drugi", createdAt: "" }
    ]
  });
  const cleanupController = new TrainerMfaController(multiple);
  assert.equal((await cleanupController.prepare()).status, "factor_cleanup_required");
  await cleanupController.removeFactor(1);
  assert.deepEqual(multiple.unenrolled, [FACTOR_B]);
  assert.equal(multiple.loggedOut, true);
}

await testSessionPersistenceBoundary();
await testControllerFlows();
console.log("Studio Las trainer MFA browser tests completed");
