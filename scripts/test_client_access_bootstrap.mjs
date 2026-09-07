import { readFile } from "node:fs/promises";

const html = await readFile("tools/client-access-admin.html", "utf8");
const bootstrap = await readFile("tools/client-access-bootstrap.js", "utf8");
const build = await readFile("scripts/build_studio_las_os_deploy.mjs", "utf8");

const required = [
  [html.includes('client-access-bootstrap.js'), "admin html loads bootstrap"],
  [!html.includes('type="module" src="./client-access-admin.js"'), "admin html no longer directly owns module bootstrap"],
  [bootstrap.includes('import("./client-access-admin.js")'), "bootstrap dynamically imports admin module"],
  [bootstrap.includes("MutationObserver"), "bootstrap detects successful render"],
  [bootstrap.includes("12000"), "bootstrap has bounded startup timeout"],
  [bootstrap.includes("Nie wykonano żadnej operacji na koncie klienta"), "failure copy is fail-closed"],
  [build.includes('"tools/client-access-bootstrap.js"'), "deploy allowlist includes bootstrap"]
];

for (const [ok, label] of required) {
  if (!ok) throw new Error(`CLIENT_ACCESS_BOOTSTRAP_FAIL: ${label}`);
}

console.log("CLIENT_ACCESS_BOOTSTRAP_PASS");
