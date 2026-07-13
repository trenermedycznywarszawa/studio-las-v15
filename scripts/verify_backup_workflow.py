#!/usr/bin/env python3
"""Static safety checks for the local target backup and restore workflow.

This verifier does not execute a backup. It prevents obvious regressions such as
remote restore destinations, repository-local dumps, secret logging, upload tools,
or a backup gate that passes without restore verification.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = ROOT / "scripts/backup_and_verify_target.ps1"
RUNBOOK_PATH = ROOT / "docs/deployment/06_TARGET_BACKUP_AND_RESTORE.md"
GITIGNORE_PATH = ROOT / ".gitignore"


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def read(path: Path) -> str:
    require(path.is_file(), f"missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def main() -> int:
    script = read(SCRIPT_PATH)
    lower = script.lower()
    compact = re.sub(r"\s+", "", lower)
    runbook = read(RUNBOOK_PATH).lower()
    gitignore = read(GITIGNORE_PATH).lower()

    required_script_fragments = [
        '"studio_las_target_db_url"',
        '"studio_las_restore_db_url"',
        '"ufcumhbnuyernuwepcij"',
        "-confirmencryptedstorage",
        "-verifyrestore",
        '"--role-only"',
        '"--data-only"',
        '"--use-copy"',
        '"--single-transaction"',
        '"on_error_stop=1"',
        '"set session_replication_role = replica;"',
        "get-filehash",
        "sha256",
        "target_read_only_preflight.sql",
        "studio las os target read-only preflight completed",
        "restoreverified = $restoreverified",
        "storagobjectsincluded = $false" if False else "storageobjectsincluded = $false",
        "remove-item -literalpath $backupdirectory -recurse -force",
        'remove-item "env:$sourceurlenvironment"',
        'remove-item "env:$restoreurlenvironment"',
    ]
    for fragment in required_script_fragments:
        require(fragment in lower, f"backup workflow missing safety contract: {fragment}")

    require(
        "test-pathinside -candidate $outputroot -parent $reporoot" in compact,
        "backup workflow does not reject repository-local output",
    )
    require(
        '$localhosts=@("localhost","127.0.0.1","::1","[::1]")' in compact,
        "backup workflow does not pin restore hosts to local addresses",
    )
    require(
        "$localhosts-notcontains$restoreuri.host.tolowerinvariant()" in compact,
        "backup workflow does not reject remote restore destinations",
    )
    require(
        "$restoredburl.equals($sourcedburl" in compact,
        "backup workflow does not reject an identical source and restore URL",
    )
    require(
        "if(-not$verifyrestore)" in compact
        and "backupgate remains open until -verifyrestore succeeds" in lower,
        "backup-only run could be mistaken for a verified backup gate",
    )

    forbidden_upload_tools = [
        "invoke-webrequest",
        "invoke-restmethod",
        "curl ",
        "curl.exe",
        "wget ",
        "scp ",
        "sftp ",
        "ftp ",
        "rclone ",
        "aws s3",
        "gsutil",
        "az storage",
        "github",
    ]
    for fragment in forbidden_upload_tools:
        require(fragment not in lower, f"backup workflow contains prohibited upload/network tool: {fragment}")

    forbidden_secret_output_patterns = [
        r"write-(?:host|output|verbose|information)[^\n]*(?:source|restore)dburl",
        r"write-(?:host|output|verbose|information)[^\n]*sourceuri",
        r"write-(?:host|output|verbose|information)[^\n]*restoreuri",
        r"convertto-json[^\n]*(?:source|restore)dburl",
        r"set-content[^\n]*(?:source|restore)dburl",
        r"add-content[^\n]*(?:source|restore)dburl",
    ]
    for pattern in forbidden_secret_output_patterns:
        require(
            re.search(pattern, lower) is None,
            f"backup workflow may print or persist a database URL: {pattern}",
        )

    require(
        re.search(r"postgres(?:ql)?://[^\s'\"]+", script, flags=re.I) is None,
        "literal PostgreSQL connection URL found in committed workflow",
    )
    require(
        "start-process" not in lower,
        "backup workflow uses Start-Process, which can make argument handling/logging harder to audit",
    )
    require(
        "--project-ref" not in lower,
        "backup workflow should use the explicit protected db-url and not mutate linked project state",
    )

    required_runbook_fragments = [
        "workflow prepared; backup gate not yet passed",
        "trusted local windows computer",
        "creating dump files without `-verifyrestore` does not pass this gate",
        "disposable local",
        "does not copy the binary objects stored by supabase storage",
        "do not attach",
        "production remained unchanged",
        "no target migration may begin",
    ]
    for fragment in required_runbook_fragments:
        require(fragment in runbook, f"backup runbook missing: {fragment}")

    for pattern in [
        "studio-las-target-backup-*/",
        "*.studio-las-backup.sql",
        "studio-las-backup-manifest.json",
        "studio-las-restore-preflight.log",
    ]:
        require(pattern in gitignore, f".gitignore does not protect backup artifact: {pattern}")

    print("Studio Las OS backup workflow static checks completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
