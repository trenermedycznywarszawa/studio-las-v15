import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
const source=await readFile("studio-las-config.js","utf8");
const build=()=>execFileSync(process.execPath,["scripts/build_studio_las_os_deploy.mjs","--staging"],{stdio:"pipe"});
build();
const first=JSON.parse(await readFile(".deploy/studio-las-os/deploy-manifest.json","utf8"));
for(const file of ["index.html","studio-las-os.html","tools/client-access-admin.html"]) {
 const html=await readFile(".deploy/studio-las-os/"+file,"utf8");
 assert.match(html,/connect-src https:\/\/ulauyoqjoetjqktegeuq.supabase.co/);
 assert.ok(!html.includes("connect-src https://ufcumhbnuyernuwepcij"));
}
const config=await readFile(".deploy/studio-las-os/studio-las-config.js","utf8");
assert.ok(config.includes('"mode": "staging"'));
assert.ok(!config.includes("ufcumhbnuyernuwepcij"));
assert.equal(await readFile("studio-las-config.js","utf8"),source);
assert.equal(first.sourceSha,execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim());
assert.equal(first.environment,"staging");
build();
const second=JSON.parse(await readFile(".deploy/studio-las-os/deploy-manifest.json","utf8"));
assert.equal(second.artifactSha256,first.artifactSha256);
assert.ok(!Object.keys(first.filesSha256).some(path=>path.startsWith("supabase/")||path.startsWith("docs/")||path.includes("ankieta")));
console.log("STAGING_ARTIFACT_PASS: correct CSP/config, source untouched, reproducible payload hash, allowlist");
