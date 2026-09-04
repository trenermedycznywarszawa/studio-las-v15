import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

const root = resolve(process.cwd());
const output = join(root, ".deploy", "studio-las-os");

const files = [
  "studio-las-os.html",
  "studio-las-config.js",
  "tools/client-access-admin.html",
  "tools/client-access-admin.js"
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

const appHtml = await readFile(join(root, "studio-las-os.html"), "utf8");
await writeFile(join(output, "index.html"), appHtml, "utf8");

const headers = `/*
  Cache-Control: no-store, max-age=0
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  X-Robots-Tag: noindex, nofollow, noarchive

/assets/*
  Cache-Control: public, max-age=3600, must-revalidate
`;
await writeFile(join(output, "_headers"), headers, "utf8");

const manifest = {
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
