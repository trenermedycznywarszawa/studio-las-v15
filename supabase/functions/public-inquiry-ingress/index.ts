import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const MAX_BODY_BYTES = 8 * 1024;
const SOURCE_VERSION = "public-ingress-v1";
const PRODUCTION_SUPABASE_ORIGIN = "https://ufcumhbnuyernuwepcij.supabase.co";
const TRAINER_NOTIFICATION_URL = "https://formspree.io/f/xgorealz";
const TRAINER_NOTIFICATION_SUBJECT = "Studio Las — nowy pierwszy kontakt";
const TRAINER_NOTIFICATION_TEXT = "Nowy pierwszy kontakt w Studio Las OS";
const ALLOWED_ORIGINS = new Set([
  "https://trenermedycznywarszawa.github.io",
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
const V2_ALLOWED_KEYS = new Set([
  "requestId", "name", "phone", "email", "preferredContactWindow", "contactMethod",
  "broadGoals", "personWords", "contactConsent", "privacyNoticeVersion", "formVersion", "honeypot"
]);
const V2_GOALS = new Set([
  "start_or_return", "strength_fitness", "weight_figure",
  "movement_confidence", "long_term_capacity", "other_or_unsure"
]);
const V2_CONTACT_TIMES = new Set(["before_12", "12_16", "16_20", "after_20", "any_time"]);
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

type V2Payload = {
  requestId: string;
  name: string;
  phone: string | null;
  email: string | null;
  contactMethod: "phone" | "sms" | "email";
  preferredContactWindow: string | null;
  broadGoals: string[];
  personWords: string | null;
  privacyNoticeVersion: string;
  formVersion: "first-contact-v2";
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

function isProductionRuntime(supabaseUrl: string) {
  return supabaseUrl.replace(/\/+$/, "") === PRODUCTION_SUPABASE_ORIGIN;
}

async function notifyTrainerNoPii() {
  const form = new FormData();
  form.set("_subject", TRAINER_NOTIFICATION_SUBJECT);
  form.set("Powiadomienie", TRAINER_NOTIFICATION_TEXT);

  try {
    const notification = await fetch(TRAINER_NOTIFICATION_URL, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
      signal: AbortSignal.timeout(2500)
    });
    if (!notification.ok) {
      console.error("trainer-inquiry-notification delivery_failed", { status: notification.status });
    }
  } catch (error) {
    console.error("trainer-inquiry-notification delivery_failed", {
      name: error instanceof Error ? error.name : "UnknownError"
    });
  }
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
  if (value !== null && value !== undefined && typeof value !== "string") return null;
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
      || !privacyNoticeVersion || !formVersion || emailRaw === null || personWordsRaw === null) return null;
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

function validateV2Payload(raw: unknown): V2Payload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (Object.keys(o).some(key => !V2_ALLOWED_KEYS.has(key)) || o.contactConsent !== true) return null;
  const requestId = boundedText(o.requestId, 128, true);
  const name = boundedText(o.name, 120, true);
  const formVersion = boundedText(o.formVersion, 64, true);
  const privacyNoticeVersion = boundedText(o.privacyNoticeVersion, 64, true);
  const contactMethod = boundedText(o.contactMethod, 12, true);
  const phone = boundedText(o.phone, 32, false);
  const email = boundedText(o.email, 320, false);
  const windowValue = boundedText(o.preferredContactWindow, 80, false);
  const personWords = boundedText(o.personWords, 280, false);
  if (!requestId || !REQUEST_ID_PATTERN.test(requestId) || !name ||
      formVersion !== "first-contact-v2" || !privacyNoticeVersion ||
      !PRIVACY_VERSIONS.has(privacyNoticeVersion) ||
      (contactMethod !== "phone" && contactMethod !== "sms" && contactMethod !== "email") ||
      phone === null || email === null || windowValue === null || personWords === null) return null;
  // Free-form messages are withheld from v2 pending the privacy decision. v1 stays compatible.
  if (personWords) return null;
  if (!Array.isArray(o.broadGoals) || o.broadGoals.length > 6 ||
      o.broadGoals.some(goal => typeof goal !== "string" || !V2_GOALS.has(goal)) ||
      new Set(o.broadGoals).size !== o.broadGoals.length) return null;

  const emailNormalized = email.trim().toLowerCase();
  if (contactMethod === "email") {
    if (phone || !emailNormalized || !EMAIL_PATTERN.test(emailNormalized) || windowValue) return null;
  } else {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15 || emailNormalized) return null;
    if (contactMethod === "sms" && windowValue) return null;
    if (contactMethod === "phone" &&
        !V2_CONTACT_TIMES.has(windowValue) &&
        !(windowValue.startsWith("other: ") && windowValue.length >= 8 && windowValue.length <= 72 &&
          windowValue.slice(7).trim() && !/[\u0000-\u001f]/.test(windowValue))) return null;
  }
  return {
    requestId, name,
    phone: contactMethod === "email" ? null : phone,
    email: contactMethod === "email" ? emailNormalized : null,
    contactMethod, preferredContactWindow: contactMethod === "phone" ? windowValue : null,
    broadGoals: o.broadGoals as string[],
    personWords: personWords || null,
    privacyNoticeVersion, formVersion: "first-contact-v2"
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

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return response(origin, { ok: false, error: "invalid_request" }, 400);
    }
    if (String(raw.honeypot ?? "").trim()) {
      return response(origin, { ok: true }, 202);
    }

    const isV2 = raw.formVersion === "first-contact-v2";
    const payload = isV2 ? validateV2Payload(raw) : validatePayload(raw);
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

    const { data, error } = isV2
      ? await admin.rpc("ingest_public_inquiry_v2", {
          p_request_key: payload.requestId,
          p_rate_key: rateKey,
          p_name: payload.name,
          p_phone: (payload as V2Payload).phone,
          p_email: (payload as V2Payload).email,
          p_contact_method: (payload as V2Payload).contactMethod,
          p_preferred_contact_window: (payload as V2Payload).preferredContactWindow,
          p_broad_goals: (payload as V2Payload).broadGoals,
          p_person_words: payload.personWords,
          p_form_version: payload.formVersion,
          p_source_version: SOURCE_VERSION,
          p_privacy_notice_version: payload.privacyNoticeVersion
        })
      : await admin.rpc("ingest_public_inquiry", {
          p_request_key: payload.requestId,
          p_rate_key: rateKey,
          p_name: payload.name,
          p_phone: (payload as PublicPayload).phone,
          p_email: (payload as PublicPayload).email,
          p_preferred_contact_window: (payload as PublicPayload).preferredContactWindow,
          p_broad_goal: (payload as PublicPayload).broadGoal,
          p_person_words: payload.personWords,
          p_form_version: payload.formVersion,
          p_source_version: SOURCE_VERSION,
          p_privacy_notice_version: payload.privacyNoticeVersion
        });

    if (error) throw error;
    const status = String((data as { status?: string } | null)?.status || "");
    if (status === "created") {
      if (isProductionRuntime(supabaseUrl)) {
        await notifyTrainerNoPii();
      }
      return response(origin, { ok: true }, 202);
    }
    if (status === "duplicate") {
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
