import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";

const source = "scripts/start_isolated_qa_preview.mjs";
const qaRef = "yipsjvbgxdmdicijxcph";
const valid = {
  ...process.env,
  STUDIO_LAS_E2E_PROJECT_REF: qaRef,
  STUDIO_LAS_E2E_SUPABASE_URL: `https://${qaRef}.supabase.co`,
  STUDIO_LAS_E2E_PUBLISHABLE_KEY: "sb_publishable_" + "a".repeat(35)
};

function check(env, expectSuccess) {
  const output = spawnSync(process.execPath, [source, "--check-only"], {
    cwd: process.cwd(), env, encoding: "utf8", timeout: 30000
  });
  assert.equal(output.status === 0, expectSuccess,
    `Expected ${expectSuccess ? "success" : "refusal"}: ${String(output.stderr || output.stdout).slice(0, 600)}`);
  return output;
}
assert.match(check(valid, true).stdout, /QA_LOCAL_PREVIEW_BUILD_PASS/);
for (const ref of ["ufcumhbnuyernuwepcij", "ulauyoqjoetjqktegeuq", "isolatedqa0000000001"]) {
  check({ ...valid, STUDIO_LAS_E2E_PROJECT_REF: ref,
    STUDIO_LAS_E2E_SUPABASE_URL: `https://${ref}.supabase.co` }, false);
}
check({ ...valid, STUDIO_LAS_E2E_PUBLISHABLE_KEY: "sb_secret_" + "a".repeat(35) }, false);
check({ ...valid, STUDIO_LAS_E2E_SUPABASE_URL: "https://ufcumhbnuyernuwepcij.supabase.co" }, false);
check({ ...valid, STUDIO_LAS_E2E_PUBLISHABLE_KEY: "" }, false);

const child = spawn(process.execPath, [source, "--port=0"], {
  cwd: process.cwd(), env: valid, stdio: ["ignore", "pipe", "pipe"]
});
const output = [];
let stderr = "";
child.stderr.on("data", d => { stderr += d.toString(); });
child.stdout.on("data", d => { output.push(d.toString()); });

try {
  const url = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("QA preview localhost boot timeout: " + stderr.slice(0, 400))), 25000);
    function inspect() {
      const found = output.join("").match(/QA_PREVIEW_READY=(http:\/\/127\.0\.0\.1:\d+\/)/);
      if (found) {
        clearTimeout(timeout);
        resolve(found[1]);
      }
    }
    child.stdout.on("data", inspect);
    child.on("exit", code => {
      clearTimeout(timeout);
      reject(new Error("QA localhost exited before ready: " + code + " " + stderr.slice(0, 400)));
    });
    inspect();
  });
  const index = await fetch(url);
  assert.equal(index.status, 200);
  assert.match(index.headers.get("cache-control") || "", /no-store/);
  const html = await index.text();
  assert(html.includes(`connect-src https://${qaRef}.supabase.co`));
  assert(!html.includes("connect-src https://ufcumhbnuyernuwepcij.supabase.co"));
  const js = await fetch(url + "studio-las-config.js");
  assert.equal(js.status, 200);
  const config = await js.text();
  assert(config.includes('"mode": "qa"'));
  assert(config.includes(qaRef));
  assert(!config.includes("ufcumhbnuyernuwepcij") && !config.includes("ulauyoqjoetjqktegeuq"));
  const boundary = await fetch(url + "__qa_security/");
  assert.equal(boundary.status, 200);
  assert.match(boundary.headers.get("content-security-policy") || "",
    /default-src 'none'/);
  assert((boundary.headers.get("content-security-policy") || "").includes(
    `connect-src https://${qaRef}.supabase.co`));
  const qaPage = await boundary.text();
  assert(qaPage.includes("Test rzeczywistych granic bezpieczeństwa"));
  assert(!qaPage.includes("ufcumhbnuyernuwepcij"));
  const browserRunner = await fetch(url + "__qa_security/runner.mjs");
  assert.equal(browserRunner.status, 200);
  const browserCode = await browserRunner.text();
  assert(browserCode.includes("/auth/v1/token?grant_type=password"));
  assert(browserCode.includes("/rest/v1/rpc/client_portal_snapshot"));
  assert(browserCode.includes("/auth/v1/factors/"));
  assert(!browserCode.includes("localStorage") && !browserCode.includes("sessionStorage"));
  assert(!browserCode.includes("ufcumhbnuyernuwepcij") && !browserCode.includes("ulauyoqjoetjqktegeuq"));
  assert.equal((await fetch(url + "_headers")).status, 403);
  assert.equal((await fetch(url + "deploy-manifest.json")).status, 403);
  assert.equal((await fetch(url, { method: "POST" })).status, 405);
  console.log("PASS: isolated localhost QA preview serves only intended static config, no network writes");
} finally {
  child.kill();
}
