import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isolatedQaTarget } from "./e2e_qa_target.mjs";
import { getRuntimeConfig, runtimeEnvironmentLabel } from "../assets/os/runtime.js";

const ref = "isolatedqa0000000001";
const key = "sb_publishable_" + "a".repeat(40);
const env = { ...process.env, STUDIO_LAS_E2E_PROJECT_REF: ref,
  STUDIO_LAS_E2E_SUPABASE_URL: `https://${ref}.supabase.co`,
  STUDIO_LAS_E2E_PUBLISHABLE_KEY: key };
isolatedQaTarget(env);

const build = spawnSync(process.execPath, ["scripts/build_studio_las_os_deploy.mjs", "--qa"], {
  env, encoding: "utf8"
});
assert.equal(build.status, 0, build.stderr || build.stdout);
assert.match(build.stdout, /STUDIO_LAS_OS_DEPLOY_READY=/);

const base = ".deploy/studio-las-os/";
const config = readFileSync(base + "studio-las-config.js", "utf8");
const html = readFileSync(base + "index.html", "utf8");
const runtime = readFileSync(base + "assets/os/runtime.js", "utf8");
const manifest = JSON.parse(readFileSync(base + "deploy-manifest.json", "utf8"));
assert.match(config, /"mode": "qa"/);
assert(config.includes(`"projectRef": "${ref}"`));
assert(config.includes(`"url": "https://${ref}.supabase.co"`));
assert(!config.includes("ufcumhbnuyernuwepcij") && !config.includes("ulauyoqjoetjqktegeuq"));
assert(html.includes(`connect-src https://${ref}.supabase.co`));
assert(!html.includes("connect-src https://ufcumhbnuyernuwepcij.supabase.co"));
assert(runtime.includes('mode === "qa"'), "QA runtime guard must be included in preview");
assert.equal(manifest.environment, "isolated-qa-preview");

const wrong = spawnSync(process.execPath, ["scripts/build_studio_las_os_deploy.mjs", "--qa", "--staging"], {
  env, encoding: "utf8"
});
assert.notEqual(wrong.status, 0);
assert.match(wrong.stderr, /BLOCKED/);

// The same runtime code must refuse a QA config when hosted publicly or pointed at
// production/shared staging. Normal runtime modes stay pinned.
const qaConfig = { mode: "qa", supabase: { projectRef: ref,
  url: `https://${ref}.supabase.co`, publishableKey: key } };
globalThis.window = { location: { hostname: "127.0.0.1" }, STUDIO_LAS_CONFIG: qaConfig };
assert.equal(getRuntimeConfig().projectRef, ref);
assert.equal(runtimeEnvironmentLabel("qa"), "IZOLOWANE QA");
window.location.hostname = "studio-las-os.netlify.app";
assert.throws(() => getRuntimeConfig(), /Izolowane QA wymaga lokalnego podglądu/);
window.location.hostname = "localhost";
window.STUDIO_LAS_CONFIG = { mode: "qa", supabase: { projectRef: "ulauyoqjoetjqktegeuq",
  url: "https://ulauyoqjoetjqktegeuq.supabase.co", publishableKey: key } };
assert.throws(() => getRuntimeConfig(), /Izolowane QA wymaga lokalnego podglądu/);
window.STUDIO_LAS_CONFIG = { mode: "production", supabase: qaConfig.supabase };
assert.throws(() => getRuntimeConfig(), /Błędna konfiguracja wersji produkcyjnej/);
delete globalThis.window;

// Public canonical source config remains unchanged; the QA preview is a separate artifact.
const sourceConfig = readFileSync("studio-las-config.js", "utf8");
assert(sourceConfig.includes('mode: "production"'));
assert(sourceConfig.includes('projectRef: "ufcumhbnuyernuwepcij"'));
console.log("PASS: local isolated QA preview, strict runtime on localhost, production/staging refusal, exact backend CSP, untouched production config");
