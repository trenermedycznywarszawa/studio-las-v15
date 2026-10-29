import { CONFIRMATION_HTML, CONFIRMATION_TEXT } from "./confirmation-template.ts";

type Dependencies = {
  env: (key: string) => string | undefined;
  fetch: typeof globalThis.fetch;
  log: (metadata: Record<string, string | number>) => void;
};
const ADDRESS = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;

// Called only for a newly persisted production inquiry. No form content is sent.
// Delivery is best effort: errors never turn an accepted inquiry into a failure.
export async function sendInquiryConfirmation(email: string | null, requestId: string, deps: Dependencies) {
  try {
    if (deps.env("INQUIRY_CONFIRMATION_ENABLED") !== "true" || !email) return "skipped";
    const apiKey = deps.env("RESEND_API_KEY") || "";
    const from = (deps.env("INQUIRY_EMAIL_FROM") || "").trim();
    const replyTo = (deps.env("INQUIRY_EMAIL_REPLY_TO") || "").trim();
    if (!apiKey || !ADDRESS.test(from) || !ADDRESS.test(replyTo)) {
      deps.log({ reason: "configuration_missing" });
      return "failed";
    }
    const result = await deps.fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": `studio-las-inquiry-${requestId}`
      },
      body: JSON.stringify({
        from: `Damian · Studio Las <${from}>`,
        to: [email],
        reply_to: replyTo,
        subject: "Studio Las — potwierdzenie otrzymania zgłoszenia",
        html: CONFIRMATION_HTML,
        text: CONFIRMATION_TEXT
      }),
      signal: AbortSignal.timeout(2500)
    });
    if (!result.ok) {
      deps.log({ status: result.status });
      return "failed";
    }
    return "sent";
  } catch (error) {
    deps.log({ name: error instanceof Error ? error.name : "UnknownError" });
    return "failed";
  }
}
