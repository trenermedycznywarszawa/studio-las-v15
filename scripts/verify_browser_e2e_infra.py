from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGING_REF = "ulauyoqjoetjqktegeuq"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def require(source: str, needle: str, message: str) -> None:
    if needle not in source:
        raise AssertionError(message)


def forbid(source: str, needle: str, message: str) -> None:
    if needle in source:
        raise AssertionError(message)


def main() -> None:
    cleanup_path = ROOT / "supabase/dev/staging_browser_e2e_cleanup.sql"
    if not cleanup_path.exists():
        raise AssertionError("staging-only synthetic cleanup SQL is missing")

    if list((ROOT / "supabase/migrations").glob("*synthetic_pwd_e2e_cleanup*.sql")):
        raise AssertionError("synthetic browser E2E cleanup must not be a production migration")

    cleanup = cleanup_path.read_text(encoding="utf-8")
    browser = read("scripts/e2e_pwd_staging.mjs")
    mfa = read("scripts/e2e_mfa_bootstrap.mjs")
    workflow = read(".github/workflows/studio-las-browser-e2e.yml")

    require(cleanup, "STAGING / QA ONLY", "cleanup SQL must declare staging-only scope")
    require(cleanup, "private.cleanup_synthetic_pwd_e2e", "privileged cleanup implementation must stay private")
    require(cleanup, "security definer", "private cleanup implementation must own the narrowly scoped write")
    require(cleanup, "security invoker", "public cleanup wrapper must remain SECURITY INVOKER")
    require(cleanup, "auth.jwt() ->> 'aal'", "cleanup must check AAL")
    require(cleanup, "<> 'aal2'", "cleanup must require AAL2")
    require(cleanup, "private.is_trainer()", "cleanup must require trainer role")
    require(cleanup, "private.trainer_owns_client(p_client_id)", "cleanup must require client ownership")
    require(cleanup, "^E2E-GHA-[A-Za-z0-9_-]{1,100}$", "cleanup must require synthetic GHA marker")
    require(cleanup, "QA PWD Client (synthetic)", "cleanup must be limited to the exact synthetic QA client")
    require(cleanup, "revoke all on function private.cleanup_synthetic_pwd_e2e", "private cleanup must revoke default execution")
    require(cleanup, "revoke all on function public.cleanup_synthetic_pwd_e2e", "public wrapper must revoke default execution")
    require(cleanup, "from public, anon", "cleanup must explicitly deny PUBLIC/anon")
    require(cleanup, "to authenticated", "cleanup must require an authenticated caller")

    require(browser, f'const STAGING_REF = "{STAGING_REF}"', "browser E2E must be pinned to canonical staging")
    require(browser, '/rest/v1/rpc/cleanup_synthetic_pwd_e2e', "browser E2E must use constrained cleanup RPC")
    require(browser, ':scope > article.record', "PWD reload checks must target top-level session records only")
    require(browser, 'rpcRequests.length === 2', "browser E2E must enforce exact successful PWD RPC count")
    require(browser, 'directPwdWrites.length === 0', "browser E2E must reject direct PWD table writes")

    require(mfa, f'const STAGING_REF = "{STAGING_REF}"', "MFA bootstrap must be pinned to canonical staging")
    require(mfa, 'FACTOR_PREFIX = "Studio Las · QA E2E"', "MFA bootstrap must namespace its own factors")
    require(mfa, "verified.length === 0", "MFA bootstrap must fail closed when persistent verified MFA exists")
    require(mfa, "friendlyName.startsWith(FACTOR_PREFIX)", "MFA bootstrap must refuse non-E2E factors")
    require(mfa, "GITHUB_ENV", "ephemeral TOTP secret must be handed off only within the workflow run")
    forbid(mfa, "id !== ephemeral.id", "MFA bootstrap must not delete arbitrary other factors")

    require(workflow, f"STAGING_REF: {STAGING_REF}", "workflow must pin canonical staging")
    require(workflow, "permissions:\n  contents: read", "workflow token must remain read-only")
    require(workflow, "persist-credentials: false", "checkout credentials must not persist")
    require(workflow, '"supabase/dev/staging_browser_e2e_cleanup.sql"', "workflow must rerun when staging cleanup infrastructure changes")
    forbid(workflow, "secrets.STUDIO_LAS_QA_TOTP_SECRET", "workflow must not depend on a long-lived TOTP secret")

    combined = "\n".join((cleanup, browser, mfa, workflow)).lower()
    forbid(combined, "service_role", "browser E2E infrastructure must not use service_role")

    print("BROWSER_E2E_INFRA_CONTRACT_SUCCESS")


if __name__ == "__main__":
    main()
