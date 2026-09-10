const config = window.STUDIO_LAS_CONFIG?.supabase;
const form = document.querySelector("#pre-pwd-form");
const status = document.querySelector("#form-status");
const submit = form?.querySelector("button[type=submit]");

function setStatus(message, kind = "info") {
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
  status.hidden = false;
}

function readToken() {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.hash.replace(/^#/, ""));
  const token = String(params.get("token") || "").trim().toLowerCase();
  history.replaceState(null, "", `${url.pathname}${url.search}`);
  return /^[0-9a-f]{64}$/.test(token) ? token : "";
}

const token = readToken();
if (!config?.url || !config?.publishableKey || !token) {
  if (form) form.hidden = true;
  setStatus("Ten link do ankiety jest nieprawidłowy albo wygasł. Poproś Studio Las o nowy link.", "error");
}

async function submitQuestionnaire(payload) {
  const response = await fetch(`${config.url}/rest/v1/rpc/submit_pre_pwd_intake`, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      p_token: token,
      p_payload: payload,
      p_privacy_notice_version: "pre-pwd-v1"
    })
  });
  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok) throw new Error(body?.message || "Nie udało się zapisać ankiety.");
  return body;
}

form?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form.reportValidity() || !token) return;
  submit.disabled = true;
  setStatus("Zapisuję odpowiedzi…");
  try {
    const values = Object.fromEntries(new FormData(form).entries());
    const payload = {
      mainGoal: String(values.mainGoal || "").trim(),
      whyNow: String(values.whyNow || "").trim(),
      currentBarrier: String(values.currentBarrier || "").trim(),
      recentHistory: String(values.recentHistory || "").trim(),
      previousAttempts: String(values.previousAttempts || "").trim(),
      symptomsContext: String(values.symptomsContext || "").trim(),
      healthContext: String(values.healthContext || "").trim(),
      treatmentContext: String(values.treatmentContext || "").trim(),
      concerns: String(values.concerns || "").trim(),
      firstVisitUseful: String(values.firstVisitUseful || "").trim()
    };
    await submitQuestionnaire(payload);
    form.hidden = true;
    setStatus("Dziękuję. Odpowiedzi zostały zapisane. Damian będzie mógł przygotować się do Pierwszej Wizyty Diagnostycznej.", "success");
  } catch (error) {
    setStatus(error?.message || "Nie udało się zapisać ankiety. Spróbuj ponownie lub poproś o nowy link.", "error");
    submit.disabled = false;
  }
});
