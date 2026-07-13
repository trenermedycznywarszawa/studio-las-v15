#!/usr/bin/env python3
"""Static security and architecture checks for Studio Las OS.

The script deliberately uses only Python's standard library and Node's parser.
It does not connect to Supabase and does not claim to validate live RLS behavior.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

JS_FILES = [
    ROOT / "assets/os/runtime.js",
    ROOT / "assets/os/data.js",
    ROOT / "assets/os/decision-support.js",
    ROOT / "assets/os/app.js",
    ROOT / "assets/os/ui/common.js",
    ROOT / "assets/os/ui/forms.js",
    ROOT / "assets/os/ui/trainer.js",
    ROOT / "assets/os/ui/client.js",
    ROOT / "demo/studio-las-os-demo.js",
]

PRODUCTION_RUNTIME_FILES = [
    ROOT / "assets/os/data.js",
    ROOT / "assets/os/decision-support.js",
    ROOT / "assets/os/app.js",
    ROOT / "assets/os/ui/common.js",
    ROOT / "assets/os/ui/forms.js",
    ROOT / "assets/os/ui/trainer.js",
    ROOT / "assets/os/ui/client.js",
]

FORBIDDEN_RUNTIME_TERMS = [
    "Write Preview",
    "VIP Clinical",
    "FUNDAMENT",
    "ROZWÓJ",
    "LAS-",
    "Studio Las OS 9.0",
    "Studio Las OS 3.0",
]


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def read(path: Path) -> str:
    require(path.is_file(), f"missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def check_js_syntax() -> None:
    for path in JS_FILES:
        require(path.is_file(), f"missing JavaScript module: {path.relative_to(ROOT)}")
        result = subprocess.run(
            ["node", "--check", str(path)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            fail(
                f"JavaScript syntax error in {path.relative_to(ROOT)}:\n"
                f"{result.stdout}{result.stderr}"
            )


def check_import_targets() -> None:
    import_pattern = re.compile(r'from\s+["\']([^"\']+)["\']')
    for path in JS_FILES:
        source = read(path)
        for target in import_pattern.findall(source):
            if not target.startswith("."):
                continue
            resolved = (path.parent / target).resolve()
            require(
                resolved.is_file(),
                f"broken import in {path.relative_to(ROOT)}: {target}",
            )


def check_runtime_boundaries() -> None:
    for path in PRODUCTION_RUNTIME_FILES:
        source = read(path)
        require("localStorage" not in source, f"localStorage used in {path.relative_to(ROOT)}")
        require("sessionStorage" not in source, f"sessionStorage used outside runtime.js in {path.relative_to(ROOT)}")
        for term in FORBIDDEN_RUNTIME_TERMS:
            require(term not in source, f"legacy term {term!r} in {path.relative_to(ROOT)}")

    runtime = read(ROOT / "assets/os/runtime.js")
    require('mode !== "production"' in runtime, "production mode is not fail-closed")
    require("assertNoPersistentHealthData" in runtime, "legacy browser-data guard missing")
    require("sessionStorage" in runtime, "auth session boundary missing")

    data = read(ROOT / "assets/os/data.js")
    require("class StudioLasRepository" in data, "Supabase repository missing")
    require("save_client_checkin" in data, "client check-in RPC missing")
    require("client_portal_snapshot" in data, "client portal RPC missing")
    require("service_role" not in data.lower(), "service-role reference found in browser data layer")


def check_entrypoints() -> None:
    production = read(ROOT / "studio-las-os.html")
    config_position = production.find("studio-las-config.js")
    app_position = production.find("assets/os/app.js")
    require(config_position >= 0, "production config script missing")
    require(app_position > config_position, "application module loads before production config")
    require("Write Preview" not in production, "legacy preview label in production entrypoint")
    require("3.0" not in production and "9.0" not in production, "version label in production entrypoint")

    config = read(ROOT / "studio-las-config.js")
    require('mode: "production"' in config, "explicit production mode missing from config")
    require("serviceRole" not in config and "service_role" not in config, "service-role key marker in config")

    legacy = read(ROOT / "studio-management-os-3.0.html")
    require(len(legacy.splitlines()) < 150, "legacy runtime is still a large executable application")
    require("localStorage" in legacy, "legacy migration warning missing")
    require("studio-las-os.html" in legacy, "legacy page does not point to the production entrypoint")
    require("<script" not in legacy.lower(), "legacy page still executes JavaScript")


def check_demo_isolation() -> None:
    demo_html = read(ROOT / "demo/studio-las-os-demo.html")
    demo_js = read(ROOT / "demo/studio-las-os-demo.js")
    combined = f"{demo_html}\n{demo_js}"

    require("DEMO" in demo_html, "demo has no persistent visual label")
    require("studio-las-config.js" not in combined, "demo loads production configuration")
    require("assets/os/data.js" not in combined, "demo imports production data layer")
    require("fetch(" not in demo_js, "demo performs runtime network calls")
    require("localStorage" not in demo_js, "demo uses localStorage")
    require("sessionStorage" not in demo_js, "demo uses sessionStorage")


def check_modularity() -> None:
    limits = {
        "assets/os/data.js": 850,
        "assets/os/app.js": 350,
        "assets/os/decision-support.js": 220,
        "assets/os/runtime.js": 240,
        "assets/os/ui/common.js": 240,
        "assets/os/ui/forms.js": 260,
        "assets/os/ui/trainer.js": 300,
        "assets/os/ui/client.js": 180,
    }
    for relative, limit in limits.items():
        line_count = len(read(ROOT / relative).splitlines())
        require(line_count <= limit, f"{relative} exceeds modularity limit: {line_count} > {limit}")


def check_security_migration_contract() -> None:
    migration = read(ROOT / "supabase/migrations/012_security_hardening.sql")
    required_fragments = [
        "force row level security",
        "drop table if exists public.client_access_credentials",
        "create or replace function public.client_portal_snapshot()",
        "create or replace function public.save_client_checkin(",
        "create or replace function public.trainer_owns_client",
        "client_users_one_active_client_per_user_idx",
        "client_users_one_active_user_per_client_idx",
        "client_trainers_insert_owner",
        "client_users_insert_owner",
        "grant update(",
    ]
    lower = migration.lower()
    for fragment in required_fragments:
        require(fragment.lower() in lower, f"security migration missing: {fragment}")

    create_checkin = migration.split(
        "create or replace function public.save_client_checkin(", 1
    )[1].split(")\nreturns table", 1)[0]
    require("p_client_id" not in create_checkin, "client check-in RPC accepts client_id from browser")

    audit = read(ROOT / "supabase/tests/012_security_hardening_audit.sql")
    require("authenticated role can update protected client identity columns" in audit, "column privilege audit missing")
    require("owner-only assignment policy" in audit, "owner-only policy audit missing")


def main() -> int:
    check_js_syntax()
    check_import_targets()
    check_runtime_boundaries()
    check_entrypoints()
    check_demo_isolation()
    check_modularity()
    check_security_migration_contract()
    print("Studio Las OS static security checks completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
