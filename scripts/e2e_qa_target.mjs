// Only an independently provisioned disposable Supabase project can be an E2E target.
// This resolver validates an address; it does NOT prove isolation or authorize writes.
// scripts/e2e_safety_gate.mjs is the separate mandatory write gate.
const PRODUCTION_REF = "ufcumhbnuyernuwepcij";
const SHARED_STAGING_REF = "ulauyoqjoetjqktegeuq";
const REF_PATTERN = /^[a-z][a-z0-9-]{7,39}$/;

export function isolatedQaTarget(env = process.env) {
  const ref = String(env.STUDIO_LAS_E2E_PROJECT_REF || "").trim();
  const origin = String(env.STUDIO_LAS_E2E_SUPABASE_URL || "").trim();
  const key = String(env.STUDIO_LAS_E2E_PUBLISHABLE_KEY || "").trim();

  if (!REF_PATTERN.test(ref) || ref === PRODUCTION_REF || ref === SHARED_STAGING_REF) {
    throw new Error("BLOCKED: isolated QA project ref required; production/shared staging forbidden");
  }
  if (origin !== `https://${ref}.supabase.co`) {
    throw new Error("BLOCKED: QA Supabase URL must exactly match isolated project ref");
  }
  if (key.length < 40 || !(key.startsWith("sb_publishable_") || key.startsWith("eyJ"))) {
    throw new Error("BLOCKED: isolated QA publishable key missing or invalid");
  }
  return Object.freeze({ ref, origin, key });
}
