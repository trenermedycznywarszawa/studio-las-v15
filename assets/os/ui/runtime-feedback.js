import { writeThenRefresh } from "../write-outcome.js";
import { userSafeError } from "../runtime.js";

export function createRuntimeFeedback(getEnvironment) {
  let pending = false;
  let blocked = null;
  function announce(message, kind = "info", retry) {
    let region = document.getElementById("runtime-message");
    if (!region) {
      region = document.createElement("div");
      region.id = "runtime-message";
      region.setAttribute("role", "status");
      document.body.append(region);
    }
    region.className = `runtime-message ${kind}`;
    region.textContent = message;
    region.setAttribute("role", kind === "error" ? "alert" : "status");
    if (retry) {
      const button = document.createElement("button");
      button.textContent = "Sprawdź aktualny zapis";
      button.className = "button";
      button.onclick = async () => {
        button.disabled = true;
        try { await retry(); announce("Odczyt odświeżony. Sprawdź zapis w historii przed ponowieniem.", "ok"); }
        catch { button.disabled = false; }
      };
      region.append(button);
    }
    if (kind === "error" || retry) return;
    window.setTimeout(() => {
      if (region.textContent === message) region.textContent = "";
    }, 6000);
  }

  async function withWrite(label, operation, refresh) {
    if (pending) throw new Error("Zapis trwa.");
    if (blocked) throw blocked;
    pending = true;
    const app = document.getElementById("app");
    if (app) { app.inert = true; app.setAttribute("aria-busy", "true"); }
    announce(`${label}…`);
    try {
      const result = await writeThenRefresh(operation, refresh);
      announce(`${label}: zapisano w Supabase.`, "ok");
      return result;
    } catch (error) {
      const message = error.writeConfirmed
        ? `${label}: zapis potwierdzony. Nie udało się odświeżyć widoku. Nie zapisuj ponownie.`
        : error.writeUncertain
          ? "Nie otrzymano potwierdzenia zapisu. Sprawdź aktualny zapis przed ponowieniem."
          : userSafeError(error, getEnvironment());
      error.displayMessage = message;
      if (error.writeConfirmed || error.writeUncertain) {
        blocked = error;
        const retry = error.retryRefresh;
        if (retry) error.retryRefresh = async () => { await retry(); blocked = null; };
      }
      announce(message, "error", error.retryRefresh);
      throw error;
    } finally {
      pending = false;
      if (app) { app.inert = false; app.removeAttribute("aria-busy"); }
    }
  }

  return Object.freeze({ announce, withWrite, reset: () => { blocked = null; document.getElementById("runtime-message")?.remove(); } });
}
