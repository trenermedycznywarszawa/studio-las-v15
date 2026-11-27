import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.STUDIO_LAS_PLAYWRIGHT_MODULE || "playwright");

const base = new URL(process.env.STUDIO_LAS_E2E_URL || "http://127.0.0.1:8790/studio-las-os.html");
assert(["127.0.0.1", "localhost"].includes(base.hostname), "Login regression must use a local preview");
const output = process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/browser-e2e";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.STUDIO_LAS_BROWSER_EXECUTABLE,
  channel: process.env.STUDIO_LAS_BROWSER_CHANNEL
});
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
    assert.equal(await page.getByLabel("Adres poczty elektronicznej", { exact: true }).count(), 1);
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
  await testAccessStatus();
  results.push({ scenario: "access-status-failure-and-retry", status: "PASS" });
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/client-access-login.json`, JSON.stringify({ status: "PASS", remoteRequestsMocked: true, results }, null, 2));
  console.log("CLIENT_ACCESS_LOGIN_BROWSER_PASS", JSON.stringify(results));
} finally {
  await browser.close();
}

async function testAccessStatus() {
  const context = await browser.newContext();
  try {
    const client = { id: "synthetic-client", name: "Klient testowy", email: "client@example.test" };
    const user = {
      id: "synthetic-trainer",
      factors: [{
        id: "ba2aa986-81fa-4292-90d3-e87479010343",
        factor_type: "totp",
        status: "verified"
      }]
    };
    const claims = Buffer.from(JSON.stringify({ aal: "aal2" })).toString("base64url");
    await context.addInitScript(accessToken => {
      sessionStorage.setItem("studio-las-auth-session", JSON.stringify({
        access_token: accessToken,
        refresh_token: "synthetic-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }));
    }, `e30.${claims}.synthetic`);

    const requests = [];
    let response = { status: 403, json: { error: "origin_not_allowed" } };
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin === base.origin) return route.continue();
      if (!url.hostname.endsWith(".supabase.co")) return route.abort();
      if (url.pathname === "/auth/v1/user") return route.fulfill({ json: user });
      if (url.pathname === "/rest/v1/profiles") {
        return route.fulfill({ json: [{ id: user.id, role: "trainer" }] });
      }
      if (url.pathname === "/rest/v1/clients") return route.fulfill({ json: [client] });
      if (url.pathname === "/functions/v1/client-access") {
        requests.push(route.request().postDataJSON().action);
        return route.fulfill(response);
      }
      return route.abort();
    });

    const page = await context.newPage();
    await page.goto(new URL("/tools/client-access-admin.html", base).href);
    const clientSelect = page.getByRole("combobox", { name: "Wybierz klienta" });
    const invite = page.getByRole("button", { name: "Wyślij lub aktywuj zaproszenie" });
    const revoke = page.getByRole("button", { name: "Cofnij dostęp" });
    const refresh = page.getByRole("button", { name: "Odśwież status" });

    async function expectStatus(label, actions) {
      await page.getByText(label, { exact: true }).waitFor({ timeout: 3_000 });
      assert.equal(await invite.isEnabled(), actions.invite, label);
      assert.equal(await revoke.isEnabled(), actions.revoke, label);
    }

    const unknown = "Nie udało się potwierdzić stanu dostępu. Odśwież status.";
    await clientSelect.selectOption(client.id);
    await expectStatus(unknown, { invite: false, revoke: false });
    assert.equal(await page.getByText("Brak aktywnego konta klienta", { exact: true }).count(), 0);

    response = { json: { access: { status: "active" } } };
    await refresh.click();
    await expectStatus("Dostęp aktywny", { invite: true, revoke: true });

    response = { status: 503, json: { error: "service_unavailable" } };
    await refresh.click();
    await expectStatus(unknown, { invite: false, revoke: false });

    response = { json: { access: { status: "not_invited" } } };
    await refresh.click();
    await expectStatus("Brak aktywnego konta klienta", { invite: true, revoke: false });

    response = { json: { access: { status: "not_found" } } };
    await refresh.click();
    await expectStatus("Klient niedostępny", { invite: false, revoke: false });

    response = { json: { access: { status: "unexpected" } } };
    await refresh.click();
    await expectStatus(unknown, { invite: false, revoke: false });

    assert.deepEqual(requests, Array(6).fill("status"));
  } finally {
    await context.close();
  }
}
