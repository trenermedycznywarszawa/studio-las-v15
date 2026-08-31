import { userSafeError } from "../runtime.js";

export function createRuntimeFeedback(getEnvironment) {
  function announce(message, kind = "info") {
    let region = document.getElementById("runtime-message");
    if (!region) {
      region = document.createElement("div");
      region.id = "runtime-message";
      region.setAttribute("role", "status");
      document.body.append(region);
    }
    region.className = `runtime-message ${kind}`;
    region.textContent = message;
    window.setTimeout(() => {
      if (region.textContent === message) region.textContent = "";
    }, 6000);
  }

  async function withWrite(label, operation) {
    announce(`${label}…`);
    try {
      const result = await operation();
      announce(`${label}: zapisano w Supabase.`, "ok");
      return result;
    } catch (error) {
      announce(userSafeError(error, getEnvironment()), "error");
      throw error;
    }
  }

  return Object.freeze({ announce, withWrite });
}
