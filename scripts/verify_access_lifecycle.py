#!/usr/bin/env python3
"""Static checks for Studio Las account lifecycle, audit, and document storage.

This script validates repository contracts only. It does not prove that migrations
or Edge Functions are deployed in the target Supabase project.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def read(relative: str) -> str:
    path = ROOT / relative
    require(path.is_file(), f"missing required file: {relative}")
    return path.read_text(encoding="utf-8")


def check_access_migration() -> None:
    source = read("supabase/migrations/013_access_lifecycle_and_audit.sql").lower()
    required = [
        "admin_link_client_account",
        "admin_revoke_client_account",
        "trainer_client_access_status",
        "auth.role() <> 'service_role'",
        "grant execute on function public.admin_link_client_account",
        "to service_role",
        "security_audit_events",
        "force row level security",
        "audit_sensitive_row_change",
        "changed_columns",
        "revoke all on table public.security_audit_events from public, anon, authenticated",
    ]
    for fragment in required:
        require(fragment in source, f"access/audit migration missing: {fragment}")

    forbidden_audit_columns = [
        "old_data jsonb",
        "new_data jsonb",
        "payload jsonb",
        "health_status text",
        "trainer_note text",
        "report_content text",
    ]
    for fragment in forbidden_audit_columns:
        require(fragment not in source, f"audit table duplicates sensitive data: {fragment}")

    require(
        "active owner-controlled client with matching email required" in source,
        "account linking does not bind invitation email to the client record",
    )


def check_storage_migration() -> None:
    source = read("supabase/migrations/014_private_client_documents.sql").lower()
    required = [
        "studio-las-client-documents",
        "public,",
        "10485760",
        "application/pdf",
        "client_can_read_document_object",
        "audience = 'client'",
        "status = 'published'",
        "published_at is not null",
        "studio_las_documents_trainer_insert",
        "studio_las_documents_client_select",
    ]
    for fragment in required:
        require(fragment in source, f"document storage migration missing: {fragment}")

    require(
        re.search(r"values\s*\(\s*'studio-las-client-documents'.*?false", source, re.S) is not None,
        "document bucket is not explicitly private",
    )
    require(
        "studio_las_documents_client_insert" not in source
        and "studio_las_documents_client_update" not in source
        and "studio_las_documents_client_delete" not in source,
        "client document write policy detected",
    )


def check_edge_function() -> None:
    source = read("supabase/functions/client-access/index.ts")
    lower = source.lower()
    compact = re.sub(r"\s+", "", lower)

    required_plain = [
        "admin_link_client_account",
        "admin_revoke_client_account",
        "trainer_client_access_status",
        "studio_las_allowed_origins",
        "email_must_match_client_record",
        "client_redirect_not_configured",
        '"cache-control": "no-store"',
    ]
    for fragment in required_plain:
        require(fragment in lower, f"client-access Edge Function missing: {fragment}")

    required_compact = [
        'withsupabase({auth:"user"}',
        "admin.auth.admin.inviteuserbyemail",
        "if(configured.length===0)returnfalse",
    ]
    for fragment in required_compact:
        require(fragment in compact, f"client-access Edge Function missing: {fragment}")

    require('auth: "none"' not in source, "client-access function accepts unauthenticated callers")
    require("service_role_key" not in lower, "service-role secret name hardcoded in Edge Function")
    require("supabase_service_role_key" not in lower, "service-role environment lookup duplicated in function")

    leaked_identifier_property = re.search(
        r"[\"'](?:authUserId|profileId|userId)[\"']\s*:",
        source,
    )
    require(leaked_identifier_property is None, "technical account identifier returned to browser")


def check_function_config() -> None:
    source = read("supabase/config.toml")
    compact = re.sub(r"\s+", "", source.lower())
    require("[functions.client-access]" in source, "client-access function config missing")
    require("verify_jwt=true" in compact, "client-access JWT verification is not pinned on")
    require("verify_jwt=false" not in compact, "client-access JWT verification is disabled")


def check_admin_tool() -> None:
    html = read("tools/client-access-admin.html").lower()
    script = read("tools/client-access-admin.js").lower()

    require("content-security-policy" in html, "client access admin has no CSP")
    require("studio-las-config.js" in html, "client access admin does not load production config")
    require('type="module"' in html, "client access admin is not loaded as an ES module")
    require("client-access-admin.js" in html, "client access admin module missing from HTML")
    require("functions/v1/client-access" in script, "client access admin does not call the Edge Function")
    require("authorization" in script and "bearer" in script, "client access admin does not send the user JWT")
    require("localstorage" not in script, "client access admin writes to localStorage")
    require("service_role" not in script, "client access admin contains a service-role marker")
    require("inviteuserbyemail" not in script, "client access admin calls Auth admin API directly")


def check_browser_boundary() -> None:
    browser_files = [
        "assets/os/runtime.js",
        "assets/os/data.js",
        "assets/os/app.js",
        "assets/os/ui/common.js",
        "assets/os/ui/forms.js",
        "assets/os/ui/trainer.js",
        "assets/os/ui/client.js",
        "tools/client-access-admin.js",
        "studio-las-config.js",
    ]
    combined = "\n".join(read(path) for path in browser_files).lower()
    require("service_role" not in combined, "service-role marker found in browser runtime")
    require("inviteuserbyemail" not in combined, "Auth admin invitation API found in browser runtime")


def main() -> int:
    check_access_migration()
    check_storage_migration()
    check_edge_function()
    check_function_config()
    check_admin_tool()
    check_browser_boundary()
    print("Studio Las OS access lifecycle static checks completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
