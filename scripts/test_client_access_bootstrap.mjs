import { readFile } from "node:fs/promises";

const html = await readFile("tools/client-access-admin.html", "utf8");
const bootstrap = await readFile("tools/client-access-bootstrap.js", "utf8");
const build = await readFile("scripts/build_studio_las_os_deploy.mjs", "utf8");

const required = [
  [html.includes('type="module" src="./client-access-admin.js"'), "admin html preserves ES module contract"],
  [html.includes('client-access-bootstrap.js'), "admin html loads independent watchdog"],
  [bootstrap.includes("MutationObserver"), "watchdog detects successful render"],
  [bootstrap.includes("12000"), "watchdog has bounded startup timeout"],
  [bootstrap.includes('sessionStorage.removeItem("studio-las-auth-session")'), "watchdog offers safe re-login path"],
  [bootstrap.includes("Nie wykonano żadnej operacji na koncie klienta"), "failure copy is fail-closed"],
  [build.includes('"tools/client-access-bootstrap.js"'), "deploy allowlist includes watchdog"]
];

for (const [ok, label] of required) {
  if (!ok) throw new Error(`CLIENT_ACCESS_BOOTSTRAP_FAIL: ${label}`);
}

console.log("CLIENT_ACCESS_BOOTSTRAP_PASS");
