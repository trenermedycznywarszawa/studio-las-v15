import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

const root = resolve(process.cwd());
const output = join(root, ".deploy", "studio-las-os");

const files = [
  "studio-las-os.html",
  "studio-las-config.js",
  "tools/client-access-admin.html",
  "tools/client-access-admin.js",
  "tools/client-access-bootstrap.js"
];

const directories = ["assets/os"];
const forbiddenFragments = [
  `${sep}docs${sep}`,
  `${sep}prototypes${sep}`,
  `${sep}supabase${sep}`,
  `${sep}images${sep}`,
  "ankieta-kontakt.html",
  "ankieta-pelna.html",
  "studio-management-os-3.0.html"
];

function assertInsideRoot(path) {
  const rel = relative(root, path);
  if (!rel || rel.startsWith("..") || rel.includes(`..${sep}`)) {
    throw new Error(`Deployment path escapes repository root: ${path}`);
  }
}

async function copyFile(sourcePath, targetPath) {
  assertInsideRoot(sourcePath);
  await mkdir(dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, { force: true });
}

assertInsideRoot(output);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const path of files) {
  await copyFile(join(root, path), join(output, path));
}

for (const path of directories) {
  const sourcePath = join(root, path);
  assertInsideRoot(sourcePath);
  await cp(sourcePath, join(output, path), { recursive: true, force: true });
}

const staging = process.argv.includes("--staging");
if (staging) {
  const config = {mode: "staging", supabase: {
    projectRef: "ulauyoqjoetjqktegeuq", url: "https://ulauyoqjoetjqktegeuq.supabase.co",
    publishableKey: "sb_publishable_5IVYDd1a02rye5szV80sLA_UWzwjZRk"
  }};
  await writeFile(join(output, "studio-las-config.js"), `window.STUDIO_LAS_CONFIG = Object.freeze(${JSON.stringify(config, null, 2)});\n`);
}
const appHtml = await readFile(join(root, "studio-las-os.html"), "utf8");
await writeFile(join(output, "index.html"), appHtml, "utf8");
if (staging) {
  for (const file of ["index.html", "studio-las-os.html", "tools/client-access-admin.html"]) {
    const path = join(output, file);
    const html = (await readFile(path, "utf8")).replaceAll(
      "connect-src https://ufcumhbnuyernuwepcij.supabase.co",
      "connect-src https://ulauyoqjoetjqktegeuq.supabase.co");
    await writeFile(path, html, "utf8");
  }
}

const headers = `/*
  Cache-Control: no-store, max-age=0
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  X-Robots-Tag: noindex, nofollow, noarchive

/assets/*
  Cache-Control: no-store, max-age=0
`;
await writeFile(join(output, "_headers"), headers, "utf8");

const git = (...args) => execFileSync("git", args, {cwd: root, encoding: "utf8"}).trim();
const sha256 = data => createHash("sha256").update(data).digest("hex");
const payloadFiles = (await readdir(output, {recursive: true, withFileTypes: true}))
  .filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name)).sort();
const hashes = {};
for (const path of payloadFiles) hashes[relative(output, path).split(sep).join("/")] = sha256(await readFile(path));
const manifest = {
  sourceSha: git("rev-parse", "HEAD"),
  sourceBranch: git("branch", "--show-current"),
  sourceDirty: Boolean(git("status", "--porcelain", "--untracked-files=normal")),
  environment: staging ? "staging" : "source-config",
  artifactSha256: sha256(JSON.stringify(hashes)),
  artifactHashDefinition: "SHA256 of JSON file-hash map in sorted absolute-path order; excludes this manifest",
  filesSha256: hashes,
  generatedAt: new Date().toISOString(),
  purpose: "Studio Las OS static application bundle",
  source: "allowlisted runtime files only",
  included: [...files, ...directories, "index.html", "_headers"]
};
await writeFile(join(output, "deploy-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const manifestText = JSON.stringify(manifest);
for (const fragment of forbiddenFragments) {
  if (manifestText.includes(fragment)) {
    throw new Error(`Forbidden deployment content detected: ${fragment}`);
  }
}

console.log(`STUDIO_LAS_OS_DEPLOY_READY=${relative(root, output)}`);
console.log(`ALLOWLIST_FILES=${files.length}`);
console.log(`ALLOWLIST_DIRECTORIES=${directories.length}`);
