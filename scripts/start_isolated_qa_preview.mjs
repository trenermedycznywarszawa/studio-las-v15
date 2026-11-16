// Local, read-only QA preview launcher. This DOES NOT authorize mutating E2E.
// Trainer sign-in/MFA are manual, performed by the owner in the browser.
// No passwords, tokens, MFA secrets or service-role keys are used here.
import { spawnSync } from "node:child_process";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isolatedQaTarget } from "./e2e_qa_target.mjs";

const QA_REF = "yipsjvbgxdmdicijxcph";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, ".deploy", "studio-las-os");
const qa = isolatedQaTarget(process.env);
if (qa.ref !== QA_REF) {
  throw new Error("BLOCKED: this preview is restricted to the verified Studio Las disposable QA project");
}

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check-only");
const portArg = process.argv.slice(2).find(arg => arg.startsWith("--port="));
const port = portArg === undefined ? 8790 : Number(portArg.slice("--port=".length));
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error("BLOCKED: invalid localhost port");
}

const built = spawnSync(process.execPath, ["scripts/build_studio_las_os_deploy.mjs", "--qa"], {
  cwd: root,
  env: process.env,
  encoding: "utf8",
  windowsHide: true
});
if (built.status !== 0) {
  throw new Error("BLOCKED: QA preview build failed: " + String(built.stderr || built.stdout || "").slice(0, 500));
}

const config = readFileSync(resolve(output, "studio-las-config.js"), "utf8");
const html = readFileSync(resolve(output, "index.html"), "utf8");
if (!config.includes('"mode": "qa"')
  || !config.includes(`"projectRef": "${qa.ref}"`)
  || !config.includes(`"url": "${qa.origin}"`)
  || config.includes("ufcumhbnuyernuwepcij")
  || config.includes("ulauyoqjoetjqktegeuq")
  || !html.includes(`connect-src ${qa.origin}`)
  || html.includes("connect-src https://ufcumhbnuyernuwepcij.supabase.co")) {
  throw new Error("BLOCKED: QA preview artifact is not isolated from production/shared staging");
}
if (checkOnly) {
  console.log("QA_LOCAL_PREVIEW_BUILD_PASS: exact disposable QA config; no network calls or writes");
  process.exit(0);
}

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

const server = createServer((req, res) => {
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "X-Robots-Tag": "noindex, nofollow, noarchive"
  };
  const respond = (status, message) => {
    res.writeHead(status, { ...headers, "Content-Type": "text/plain; charset=utf-8" });
    res.end(req.method === "HEAD" ? undefined : message);
  };
  if (req.method !== "GET" && req.method !== "HEAD") return respond(405, "Method not allowed");
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || "/", "http://127.0.0.1").pathname);
  } catch {
    return respond(400, "Invalid path");
  }
  if (pathname === "/") pathname = "/index.html";

  // The signed-JWT security runner is local-only and NEVER copied to .deploy.
  // It has no login proxy: credentials go directly from the browser to QA GoTrue.
  const runnerFiles = {
    "/__qa_security/": { file: "qa_http_boundary_runner.html", mime: "text/html; charset=utf-8" },
    "/__qa_security/runner.mjs": { file: "qa_http_boundary_runner.mjs", mime: "text/javascript; charset=utf-8" }
  };
  const testAsset = runnerFiles[pathname];
  if (testAsset) {
    const expectedHost = `127.0.0.1:${server.address()?.port}`;
    if (String(req.headers.host || "") !== expectedHost) {
      return respond(403, "QA preview hostname mismatch");
    }
    const safePath = resolve(root, "scripts", testAsset.file);
    const csp = [
      "default-src 'none'",
      "script-src 'self'",
      "style-src 'unsafe-inline'",
      `connect-src ${qa.origin}`,
      "form-action 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'none'"
    ].join("; ");
    res.writeHead(200, {
      ...headers,
      "Content-Type": testAsset.mime,
      "Content-Security-Policy": csp
    });
    if (req.method === "HEAD") return res.end();
    return createReadStream(safePath).on("error", () => res.destroy()).pipe(res);
  }
  if (!pathname.startsWith("/") || pathname.includes("\\") || pathname.includes("\0")
    || pathname.split("/").some(part => part === ".." || part.startsWith("."))) {
    return respond(403, "Forbidden");
  }
  if (pathname === "/_headers" || pathname === "/deploy-manifest.json") {
    return respond(403, "Forbidden");
  }
  const filePath = resolve(output, "." + pathname);
  if (!filePath.startsWith(output + sep)) return respond(403, "Forbidden");
  let info;
  try { info = statSync(filePath); } catch { return respond(404, "Not found"); }
  if (!info.isFile()) return respond(404, "Not found");
  res.writeHead(200, {
    ...headers,
    "Content-Type": contentTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream"
  });
  if (req.method === "HEAD") return res.end();
  const stream = createReadStream(filePath);
  stream.on("error", () => res.destroy());
  stream.pipe(res);
});
server.on("error", error => {
  console.error("BLOCKED: local QA preview could not bind to 127.0.0.1", error.code || error.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  console.log(`QA_PREVIEW_READY=http://127.0.0.1:${address.port}/`);
  console.log("Target: isolated QA only; trainer sign-in and MFA are manual. Press Ctrl+C to stop.");
});
