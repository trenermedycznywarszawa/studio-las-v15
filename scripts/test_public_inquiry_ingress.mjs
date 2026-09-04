import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
let passed = 0;
function assert(condition, message) {
  if (!condition) throw new Error(message);
  passed += 1;
}

const edge = await read("supabase/functions/public-inquiry-ingress/index.ts");
const migration = (await read("supabase/migrations/20260904083000_public_inquiry_ingress.sql")).toLowerCase();
const fixture = (await read("supabase/dev/staging_public_inquiry_ingress_e2e.sql")).toLowerCase();
const contract = await read("docs/architecture/21_STAGE_2B_PUBLIC_INQUIRY_INGRESS_CONTRACT.md");

for (const fragment of [
  'const MAX_BODY_BYTES = 8 * 1024',
  '"https://trenermedycznywarszawa.github.io"',
  '"http://127.0.0.1:8790"',
  'object.contactConsent !== true',
  'Object.keys(object).some(key => !ALLOWED_KEYS.has(key))',
  'new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES',
  'String(raw?.honeypot ?? "").trim()',
  'hmacHex(serviceRoleKey',
  'admin.rpc("ingest_public_inquiry"',
  'status === "created" || status === "duplicate"',
  'status === "rate_limited"',
  '"Retry-After": "900"',
  '"Cache-Control": "no-store"'
]) assert(edge.includes(fragment), `Edge Function missing contract fragment: ${fragment}`);

assert(!edge.includes('"*"'), "Wildcard origin found in public ingress Edge Function");
assert(!edge.includes('studiolas.pl'), "Unapproved future custom domain present in current origin allowlist");
assert(!/console\.(log|error)\([^\n]*(phone|email|clientAddress|rateKey|payload)/i.test(edge), "Sensitive ingress values may be logged");
assert(!edge.includes("service_role") && !edge.includes("SERVICE_ROLE_KEY\") || false), "placeholder");

for (const fragment of [
  "create table private.inquiry_ingress_config",
  "create table private.inquiry_ingress_rate_limits",
  "create or replace function public.ingest_public_inquiry",
  "security definer",
  "set search_path = pg_catalog, public, private",
  "pg_advisory_xact_lock",
  "source_channel = 'public_first_contact'",
  "return jsonb_build_object('status', 'duplicate')",
  "return jsonb_build_object('status', 'rate_limited')",
  "v_client_count > 5",
  "v_global_count > 100",
  "interval '30 minutes'",
  "grant execute on function public.ingest_public_inquiry",
  "to service_role"
]) assert(migration.includes(fragment), `Migration missing: ${fragment}`);

assert(migration.includes("revoke all on function public.ingest_public_inquiry") && migration.includes("from public, anon, authenticated"),
  "Ingress RPC revoke boundary missing");
assert(!migration.includes("grant insert on table public.inquiries to anon"), "Anonymous inquiry INSERT grant found");
assert(!migration.includes("diagnosis") && !migration.includes("pain_scale") && !migration.includes("travel_area") && !migration.includes("commute"),
  "Forbidden diagnostic/travel fields leaked into ingress migration");

for (const fragment of [
  "staging / qa only",
  "prepare_public_inquiry_ingress_e2e",
  "cleanup_public_inquiry_ingress_e2e",
  "trainer aal2 required",
  "refusing cleanup",
  "set enabled = false"
]) assert(fixture.includes(fragment), `Staging fixture missing: ${fragment}`);

assert(contract.includes("Formspree remains the production transport"), "Contract does not preserve Formspree until cutover");
assert(contract.includes("No CAPTCHA vendor by default"), "Contract does not reject premature CAPTCHA dependency");
assert(contract.includes("separate minimal PR"), "Production cutover is not separately gated");

console.log(`PUBLIC_INQUIRY_INGRESS_CONTRACT_SUCCESS ${passed}/${passed} PASS`);
