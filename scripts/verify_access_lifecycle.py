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


def check_reassignment_guard() -> None:
    source = read("supabase/migrations/015_reject_client_account_reassignment.sql").lower()
    required = [
        "account already linked to another active client; revoke first",
        "client already linked to another active account; revoke first",
        "cu.user_id = v_profile.id",
        "cu.client_id <> p_client_id",
        "cu.client_id = p_client_id",
        "cu.user_id <> v_profile.id",
        "grant execute on function public.admin_link_client_account",
        "to service_role",
    ]
    for fragment in required:
        require(fragment in source, f"account reassignment guard missing: {fragment}")

    require(
        "set status = 'revoked'" not in source,
        "account link function still silently revokes a different active relationship",
    )


def check_service_audit_attribution() -> None:
    source = read("supabase/migrations/016_attribute_service_operations_to_trainer.sql").lower()
    required = [
        "studio_las.audit_actor_profile_id",
        "current_setting('studio_las.audit_actor_profile_id', true)",
        "set_config(",
        "p_owner_trainer_id::text",
        "v_actor_auth_user_id uuid := auth.uid()",
        "owner_profile.role = 'trainer'",
        "admin_link_client_account",
        "admin_revoke_client_account",
    ]
    for fragment in required:
        require(fragment in source, f"service audit attribution missing: {fragment}")

    require(
        "raw_payload" not in source and "report_content" not in source,
        "service audit attribution migration copies sensitive payloads",
    )

    tests = read("supabase/tests/016_attribute_service_operations_to_trainer.sql").lower()
    require("service-role revocation was not attributed to owner trainer a" in tests, "revoke attribution test missing")
    require("service-role link was not attributed to owner trainer a" in tests, "link attribution test missing")
    require("client profile accepted as owner trainer audit context" in tests, "invalid actor context test missing")


def check_staging_discovered_fixes() -> None:
    role_helper = read("supabase/migrations/017_owner_assignment_role_helper.sql").lower()
    for fragment in [
        "create schema if not exists private",
        "private.profile_has_role",
        "security definer",
        "client_trainers_insert_owner",
        "client_trainers_update_owner",
        "client_users_insert_owner",
        "client_users_update_owner",
        "revoke all on function private.profile_has_role(uuid, text) from public, anon, authenticated",
    ]:
        require(fragment in role_helper, f"forced-RLS assignment fix missing: {fragment}")
    require(
        "returns no profile attributes" in role_helper,
        "assignment role helper is not documented as a narrow predicate",
    )

    role_helper_tests = read("supabase/tests/017_owner_assignment_role_helper.sql").lower()
    require("owner trainer could not revoke own client link" in role_helper_tests, "owner revoke regression test missing")
    require("foreign trainer changed client link" in role_helper_tests, "foreign trainer regression test missing")
    require("anon can execute role helper" in role_helper_tests, "role helper privilege test missing")

    checkin_fix = read("supabase/migrations/018_fix_checkin_rpc_conflict.sql").lower()
    for fragment in [
        "create or replace function public.save_client_checkin(",
        "returns table(event_date date, created_at timestamptz)",
        "exception when unique_violation",
        "check-in already recorded for this item today",
        "grant execute on function public.save_client_checkin",
    ]:
        require(fragment in checkin_fix, f"check-in RPC conflict fix missing: {fragment}")
    require(
        "on conflict (client_id, home_plan_item_id, kind, event_date)" not in checkin_fix,
        "ambiguous check-in ON CONFLICT target returned",
    )

    checkin_tests = read("supabase/tests/018_checkin_rpc_conflict.sql").lower()
    require("first check-in was not recorded" in checkin_tests, "first check-in regression test missing")
    require("duplicate check-in did not fail" in checkin_tests, "duplicate check-in regression test missing")
    require("6::smallint" in checkin_tests and "2::smallint" in checkin_tests, "check-in test does not use exact RPC types")

    private_helpers = read("supabase/migrations/019_minimize_exposed_rpc_helpers.sql").lower()
    for fragment in [
        "alter function public.current_profile_id() set schema private",
        "alter function public.is_trainer() set schema private",
        "alter function public.is_client() set schema private",
        "alter function public.trainer_owns_client(uuid) set schema private",
        "alter function public.trainer_can_access_client(uuid) set schema private",
        "alter function public.client_can_access_client(uuid) set schema private",
        "alter function public.storage_object_client_id(text) set schema private",
        "alter function public.client_can_read_document_object(text, text) set schema private",
        "security invoker",
        "revoke all on function public.current_profile_id() from public, anon, authenticated",
        "alter function public.set_updated_at() set search_path = pg_catalog, public",
        "must not be added to postgrest exposed schemas",
    ]:
        require(fragment in private_helpers, f"private helper boundary missing: {fragment}")

    private_helper_tests = read("supabase/tests/019_private_helper_boundary.sql").lower()
    require("internal security definer helper remains public" in private_helper_tests, "public definer regression test missing")
    require("stored policies did not follow helpers into private schema" in private_helper_tests, "policy dependency regression test missing")
    require("authenticated caller executed public helper wrapper" in private_helper_tests, "public wrapper execute test missing")

    performance = read("supabase/migrations/020_performance_safety_indexes.sql").lower()
    require("(select auth.uid())" in performance, "profile RLS initplan optimization missing")
    required_indexes = [
        "body_measurements_document_id_idx",
        "guidance_events_created_by_idx",
        "guidance_events_item_client_fk_idx",
        "home_plan_items_exercise_id_idx",
        "home_plan_items_plan_client_fk_idx",
        "legacy_import_records_client_id_idx",
        "post_session_observations_session_id_idx",
        "reports_created_by_idx",
        "training_load_observations_session_id_idx",
    ]
    for index_name in required_indexes:
        require(index_name in performance, f"performance safety index missing: {index_name}")
    require("drop index" not in performance, "fresh-staging unused-index statistics caused an index deletion")

    performance_tests = read("supabase/tests/020_performance_safety_indexes.sql").lower()
    require("required fk indexes are missing" in performance_tests, "covering-index regression test missing")
    require("profile rls still evaluates auth.uid() per row" in performance_tests, "profile RLS planner test missing")
    require("optimized profile rls changed isolation" in performance_tests, "profile isolation regression test missing")


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
        "account_already_linked_revoke_first",
        "client_already_linked_revoke_first",
        "trainer_account_cannot_be_linked_as_client",
        '"cache-control": "no-store"',
        "mfa_aal2_required",
        'actoraal !== "aal2"',
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

    invite_position = lower.find("inviteuserbyemail")
    account_conflict_position = lower.find("account_already_linked_revoke_first")
    client_conflict_position = lower.find("client_already_linked_revoke_first")
    require(invite_position >= 0, "invitation API call missing")
    require(0 <= account_conflict_position < invite_position, "account conflict is checked after invitation email is sent")
    require(0 <= client_conflict_position < invite_position, "client conflict is checked after invitation email is sent")
    aal_gate_position = lower.find('actoraal !== "aal2"')
    first_admin_query = lower.find('.from("profiles")')
    require(aal_gate_position >= 0, "client-access AAL2 gate missing")
    require(0 <= aal_gate_position < first_admin_query, "client-access checks AAL2 after admin query")


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
    require("trainermfacontroller" in script, "client access admin has no trainer MFA controller")
    require("{ persist: false }" in script, "client access admin persists password-only session")
    require("enforcetrainermfa" in script, "client access admin does not enforce trainer MFA")


def check_browser_boundary() -> None:
    browser_files = [
        "assets/os/runtime.js",
        "assets/os/data.js",
        "assets/os/trainer-mfa.js",
        "assets/os/app.js",
        "assets/os/password-auth.js",
        "assets/os/ui/common.js",
        "assets/os/ui/trainer-mfa.js",
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
    check_reassignment_guard()
    check_service_audit_attribution()
    check_staging_discovered_fixes()
    check_storage_migration()
    check_edge_function()
    check_function_config()
    check_admin_tool()
    check_browser_boundary()
    print("Studio Las OS access lifecycle static checks completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
