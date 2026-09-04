import { createClient } from "npm:@supabase/supabase-js@^2";

const MAX_BODY_BYTES = 8 * 1024;
const SOURCE_VERSION = "public-ingress-v1";
const ALLOWED_ORIGINS = new Set([
  "https://trenermedycznywarszawa.github.io",
  "https://studiolas.pl",
  "https://www.studiolas.pl",
  "http://127.0.0.1:8790",
  "http://localhost:8790"
]);
const ALLOWED_KEYS = new Set([
  "requestId",
  "name",
  "phone",
  "email",
  "preferredContactWindow",
  "broadGoal",
  "personWords",
  "contactConsent",
  "privacyNoticeVersion",
  "formVersion",
  "honeypot"
]);
const CONTACT_WINDOWS = new Set([
  "16:00–18:00",
  "18:00–20:00",
  "20:00–22:00",
  "Najpierw napisz SMS i ustalmy termin",
  "Inny termin — ustalimy wiadomością"
]);
const BROAD_GOALS = new Set([
  "Swobodniejsze poruszanie się na co dzień",
  "Powrót do aktywności lub sportu",
  "Siła i kondycja po przerwie",
  "Większa pewność w ruchu",
  "Chcę najpierw porozmawiać"
]);
const FORM_VERSIONS = new Set(["first-contact-v1"]);
const PRIVACY_VERSIONS = new Set(["first-contact-consent-v1"]);
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{12,128}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PublicPayload = {
  requestId: string;
  name: string;
  phone: string;
  email: string | null;
  preferredContactWindow: string;
  broadGoal: string;
  personWords: string | null;
  privacyNoticeVersion: string;
  formVersion: string;
};

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin"
  };
}

function response(origin: string, body: Record<string, unknown>, status: number, extra: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders(origin),
      ...extra,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function getOrigin(req: Request) {
  return String(req.headers.get("origin") || "").trim();
}

function getClientAddress(req: Request) {
  const direct = String(req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "").trim();
  if (direct) return direct;
  return String(req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
}

async function hmacHex(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return Array.from(signature, byte => byte.toString(16).padStart(2, "0")).join("");
}

function boundedText(value: unknown, max: number, required = false) {
  const text = String(value ?? "").trim();
  if (required && !text) return null;
  if (!text) return "";
  return text.length <= max ? text : null;
}

function validatePayload(raw: unknown): PublicPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const object = raw as Record<string, unknown>;
  if (Object.keys(object).some(key => !ALLOWED_KEYS.has(key))) return null;
  if (object.contactConsent !== true) return null;

  const requestId = boundedText(object.requestId, 128, true);
  const name = boundedText(object.name, 120, true);
  const phone = boundedText(object.phone, 32, true);
  const emailRaw = boundedText(object.email, 320, false);
  const preferredContactWindow = boundedText(object.preferredContactWindow, 80, true);
  const broadGoal = boundedText(object.broadGoal, 120, true);
  const personWordsRaw = boundedText(object.personWords, 280, false);
  const privacyNoticeVersion = boundedText(object.privacyNoticeVersion, 64, true);
  const formVersion = boundedText(object.formVersion, 64, true);

  if (!requestId || !REQUEST_ID_PATTERN.test(requestId) || !name || !phone || !preferredContactWindow || !broadGoal
      || !privacyNoticeVersion || !formVersion) return null;
  if (!CONTACT_WINDOWS.has(preferredContactWindow) || !BROAD_GOALS.has(broadGoal)) return null;
  if (!FORM_VERSIONS.has(formVersion) || !PRIVACY_VERSIONS.has(privacyNoticeVersion)) return null;

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;

  const email = String(emailRaw || "").trim().toLowerCase();
  if (email && !EMAIL_PATTERN.test(email)) return null;

  return {
    requestId,
    name,
    phone,
    email: email || null,
    preferredContactWindow,
    broadGoal,
    personWords: String(personWordsRaw || "").trim() || null,
    privacyNoticeVersion,
    formVersion
  };
}

Deno.serve(async (req: Request) => {
  const origin = getOrigin(req);
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...corsHeaders(origin), "Cache-Control": "no-store" } });
  }
  if (req.method !== "POST") {
    return response(origin, { ok: false, error: "method_not_allowed" }, 405, { Allow: "POST, OPTIONS" });
  }

  const contentType = String(req.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    return response(origin, { ok: false, error: "invalid_request" }, 415);
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return response(origin, { ok: false, error: "request_too_large" }, 413);
  }

  try {
    const text = await req.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      return response(origin, { ok: false, error: "request_too_large" }, 413);
    }

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return response(origin, { ok: false, error: "invalid_request" }, 400);
    }

    if (String(raw?.honeypot ?? "").trim()) {
      return response(origin, { ok: true }, 202);
    }

    const payload = validatePayload(raw);
    if (!payload) {
      return response(origin, { ok: false, error: "invalid_request" }, 400);
    }

    const clientAddress = getClientAddress(req);
    const serviceRoleKey = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
    const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "");
    if (!clientAddress || !serviceRoleKey || !supabaseUrl) {
      return response(origin, { ok: false, error: "temporarily_unavailable" }, 503);
    }

    const rateKey = await hmacHex(serviceRoleKey, `studio-las-public-ingress:v1:${clientAddress}`);
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data, error } = await admin.rpc("ingest_public_inquiry", {
      p_request_key: payload.requestId,
      p_rate_key: rateKey,
      p_name: payload.name,
      p_phone: payload.phone,
      p_email: payload.email,
      p_preferred_contact_window: payload.preferredContactWindow,
      p_broad_goal: payload.broadGoal,
      p_person_words: payload.personWords,
      p_form_version: payload.formVersion,
      p_source_version: SOURCE_VERSION,
      p_privacy_notice_version: payload.privacyNoticeVersion
    });

    if (error) throw error;
    const status = String((data as { status?: string } | null)?.status || "");
    if (status === "created" || status === "duplicate") {
      return response(origin, { ok: true }, 202);
    }
    if (status === "rate_limited") {
      return response(origin, { ok: false, error: "try_later" }, 429, { "Retry-After": "900" });
    }
    return response(origin, { ok: false, error: "temporarily_unavailable" }, 503);
  } catch (error) {
    console.error("public-inquiry-ingress failure", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code || "") : ""
    });
    return response(origin, { ok: false, error: "temporarily_unavailable" }, 500);
  }
});
