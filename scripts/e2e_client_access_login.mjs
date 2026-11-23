import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.STUDIO_LAS_PLAYWRIGHT_MODULE || "playwright");

const base = new URL(process.env.STUDIO_LAS_E2E_URL || "http://127.0.0.1:8790/studio-las-os.html");
assert(["127.0.0.1", "localhost"].includes(base.hostname), "Login regression must use a local preview");
const output = process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/browser-e2e";
const browser = await chromium.launch({ headless: true, ...(process.env.STUDIO_LAS_BROWSER_CHANNEL ? { channel: process.env.STUDIO_LAS_BROWSER_CHANNEL } : {}) });
const results = [];
try {
  for (const scenario of ["no-session", "invalid-session", "expired-session"]) {
    console.log(`CLIENT_ACCESS_LOGIN_CASE=${scenario}`);
    const context = await browser.newContext();
    let rejectedAuthRequests = 0;
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin === base.origin) return route.continue();
      // Every remote request is fulfilled locally; synthetic tokens never leave the browser.
      if (url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/auth/v1/")) {
        rejectedAuthRequests++;
        return route.fulfill({ status: 401, contentType: "application/json", body: '{"message":"Invalid test session"}' });
      }
      return route.abort();
    });
    if (scenario !== "no-session") {
      await context.addInitScript(({ expired }) => {
        sessionStorage.setItem("studio-las-auth-session", JSON.stringify({
          access_token: "synthetic-invalid-token",
          refresh_token: "synthetic-invalid-refresh-token",
          expires_at: Math.floor(Date.now() / 1000) + (expired ? -10 : 3600)
        }));
      }, { expired: scenario === "expired-session" });
    }
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(new URL("/tools/client-access-admin.html", base).href);
    await page.getByRole("heading", { name: "Bezpieczne logowanie", exact: true }).waitFor({ timeout: 15_000 });
    assert.equal(await page.getByLabel("Email", { exact: true }).count(), 1);
    assert.equal(await page.getByLabel("Hasło", { exact: true }).count(), 1);
    assert.equal(await page.getByRole("heading", { name: "Nie udało się otworzyć panelu" }).count(), 0);
    if (scenario !== "no-session") {
      await page.getByText("Sesja wygasła. Zaloguj się ponownie.", { exact: true }).waitFor();
      assert(rejectedAuthRequests > 0, "401 path was not exercised");
    } else assert.equal(rejectedAuthRequests, 0);
    assert.deepEqual(errors, []);
    results.push({ scenario, status: "PASS", rejectedAuthRequests });
    await context.close();
  }
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/client-access-login.json`, JSON.stringify({ status: "PASS", remoteRequestsMocked: true, results }, null, 2));
  console.log("CLIENT_ACCESS_LOGIN_BROWSER_PASS", JSON.stringify(results));
} finally {
  await browser.close();
}
