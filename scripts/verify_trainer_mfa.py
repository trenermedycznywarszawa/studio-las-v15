#!/usr/bin/env python3
"""Static contract checks for mandatory trainer TOTP MFA / AAL2.

These checks validate repository artifacts only. They do not claim that migration
021 or the Edge Function is deployed to a Supabase project.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MFA_TABLES = {
    "clients",
    "client_trainers",
    "client_users",
    "client_intakes",
    "sessions",
    "pre_session_checks",
    "post_session_observations",
    "client_tasks",
    "client_documents",
    "body_measurements",
    "training_load_observations",
    "assessment_results",
    "exercises",
    "home_plans",
    "home_plan_items",
    "guidance_events",
    "guidance_pilots",
    "guidance_pilot_feedback",
    "reports",
    "legacy_import_batches",
    "legacy_import_records",
}


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


def check_migration() -> None:
    source = read("supabase/migrations/021_trainer_totp_mfa_aal2.sql")
    lower = source.lower()
    required = [
        "private.trainer_mfa_satisfied()",
        "auth.jwt() ->> 'aal'",
        "'aal2'",
        "as restrictive",
        "trainer_totp_aal2_gate",
        "studio_las_documents_trainer_totp_aal2_gate",
        "storage.objects",
        "bucket_id <> 'studio-las-client-documents'",
        "trainer aal2 required",
        "private.trainer_owns_client",
        "revoke all on function public.trainer_client_access_status",
    ]
    for fragment in required:
        require(fragment in lower, f"MFA migration missing: {fragment}")

    listed_tables = set(re.findall(r"'([a-z_]+)'", source.split("loop", 1)[0]))
    require(MFA_TABLES <= listed_tables, f"MFA policy table list incomplete: {MFA_TABLES - listed_tables}")
    require("'profiles'" not in source.split("loop", 1)[0], "profile bootstrap was incorrectly gated at AAL2")
    require("not private.is_trainer()" in lower, "client AAL1 exception is missing from restrictive gate")
    require(
        lower.find("trainer aal2 required") < lower.find("select jsonb_build_object"),
        "access status RPC checks AAL2 after reading protected data",
    )


def check_browser_flow() -> None:
    data = read("assets/os/data.js")
    controller = read("assets/os/trainer-mfa.js")
    ui = read("assets/os/ui/trainer-mfa.js")
    app = read("assets/os/app.js")
    admin = read("tools/client-access-admin.js")
    runtime = read("assets/os/runtime.js")

    for fragment in [
        '"/auth/v1/factors"',
        "/challenge",
        "/verify",
        'method: "DELETE"',
        "getAuthenticatorAssuranceLevel",
        "suspendSessionPersistence",
        "persistCurrentSession",
        '!== "aal2"',
    ]:
        require(fragment in data, f"Supabase Auth MFA client missing: {fragment}")

    require("saveAuthSession(this.session)" in data, "verified AAL2 session is not saved")
    require(
        data.find('!== "aal2"') < data.find("saveAuthSession(this.session)", data.find("verifyTotp")),
        "MFA verification saves a session before checking AAL2",
    )
    require('{ persist: false }' in app, "main login persists password-only trainer session")
    require('{ persist: false }' in admin, "admin login persists password-only trainer session")
    require("persistCurrentSession()" in app, "client AAL1 session is not restored to the session boundary")

    for source, label in [(controller, "controller"), (ui, "UI")]:
        lower = source.lower()
        require("localstorage" not in lower, f"MFA {label} uses localStorage")
        require("sessionstorage" not in lower, f"MFA {label} persists challenge state")
        require("console." not in lower, f"MFA {label} logs runtime state")

    require("factorId" not in ui, "technical MFA factor identifier is rendered by the UI module")
    require("challengeId" not in ui, "technical MFA challenge identifier is rendered by the UI module")
    require('status: "factor_cleanup_required"' in controller, "multiple-factor fail-closed state missing")
    require("async removeFactor(index)" in controller, "MFA factor management is missing")
    begin_enrollment = controller[
        controller.find("async beginEnrollment()"):controller.find("async verify(code)")
    ]
    verify_flow = controller[
        controller.find("async verify(code)"):controller.find("async management()")
    ]
    remove_flow = controller[controller.find("async removeFactor(index)"):]
    for flow, mutation, label in [
        (begin_enrollment, "unenrollTotp", "unenrollment during enrollment"),
        (begin_enrollment, "enrollTotp", "enrollment"),
        (verify_flow, "verifyTotp", "verification"),
        (remove_flow, "unenrollTotp", "factor removal"),
    ]:
        mutation_position = flow.find(mutation)
        refresh_position = flow.find("listTotpFactors", mutation_position)
        prepare_position = flow.find("return this.prepare()", mutation_position)
        require(
            mutation_position >= 0 and (refresh_position > mutation_position or prepare_position > mutation_position),
            f"{label} does not refresh factors after the mutation",
        )

    load_trainer = app[app.find("async function loadTrainer"):app.find("async function selectClient")]
    factor_gate = load_trainer.find("state.mfa.prepare()")
    protected_read = load_trainer.find("state.repository.listClients()")
    require(0 <= factor_gate < protected_read, "trainer panel reads data before refreshing the MFA gate")
    require("qrCode" in ui and "one-time-code" in ui, "TOTP enrollment/challenge UI is incomplete")

    safe_session = runtime[runtime.find("const safeSession"):runtime.find(
        "sessionStorage.setItem", runtime.find("const safeSession")
    )]
    require("factor" not in safe_session.lower(), "factor identifier entered the persisted auth session")
    require("challenge" not in safe_session.lower(), "challenge identifier entered the persisted auth session")


def check_server_and_tests() -> None:
    edge = read("supabase/functions/client-access/index.ts")
    lower = edge.lower()
    gate_position = lower.find('actorAal !== "aal2"'.lower())
    first_admin_query = lower.find('.from("profiles")')
    require(gate_position >= 0, "Edge Function has no AAL2 gate")
    require("mfa_aal2_required" in lower, "Edge Function has no stable AAL2 error")
    require(0 <= gate_position < first_admin_query, "Edge Function checks AAL2 after an admin query")

    sql_test = read("supabase/tests/021_trainer_totp_mfa_aal2.sql").lower()
    for fragment in [
        '"aal":"aal1"',
        '"aal":"aal2"',
        "trainer aal1 can read clients",
        "trainer aal2 cannot read own client",
        "client aal1 portal snapshot failed",
        "expected 21 restrictive trainer aal2 policies",
    ]:
        require(fragment in sql_test, f"SQL MFA regression scenario missing: {fragment}")

    browser_test = read("scripts/test_trainer_mfa.mjs")
    require("AAL1 refresh bypassed the persistence gate" in browser_test, "refresh-during-challenge test missing")
    require("factor_cleanup_required" in browser_test, "multiple-factor browser test missing")
    require("enrollment_required" in browser_test, "enrollment browser test missing")
    for fragment in [
        "list:0",
        "list:1",
        "list:2",
        "assertRefetchedAfter",
    ]:
        require(fragment in browser_test, f"factor-count/refetch browser test missing: {fragment}")


def main() -> int:
    check_migration()
    check_browser_flow()
    check_server_and_tests()
    print("Studio Las trainer TOTP MFA / AAL2 static checks completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
