# Production Target Backup and Restore Verification

Date prepared: 2026-07-13
Target project ref: `ufcumhbnuyernuwepcij`
Status: workflow prepared; backup gate not yet passed

## Purpose

A schema comparison is not a backup. Before any production-target migration, Studio Las needs a logical database backup that has been successfully restored into a disposable local database and checked with the committed read-only preflight.

The operator workflow is:

`scripts/backup_and_verify_target.ps1`

This workflow must run only on a trusted local Windows computer. It must not run in GitHub Actions, a cloud code runner, chat, or an untrusted Codex environment because the dump contains real client data.

## What passing this gate means

The backup gate passes only when all of the following are true:

1. The output directory is on an encrypted, access-controlled local volume.
2. The directory is outside the Git repository and is not casually cloud-synchronized.
3. The source URL is the production-sensitive project `ufcumhbnuyernuwepcij`.
4. Three non-empty logical dump files are created:
   - roles,
   - schema,
   - data.
5. SHA-256 hashes and sizes are written to a local manifest.
6. The dump restores successfully into an empty disposable local PostgreSQL/Supabase database.
7. `supabase/tests/target_read_only_preflight.sql` completes against the restored database.
8. The local preflight log contains:

   `Studio Las OS target read-only preflight completed`

9. No credentials, database URLs, dump files, client rows, or restore logs are committed or uploaded.
10. The production-sensitive source remains unchanged.

Creating dump files without `-VerifyRestore` does not pass this gate.

## Security properties of the script

The script:

- reads source and restore URLs only from process environment variables,
- never prints the URLs,
- requires explicit confirmation of encrypted local storage,
- refuses to write inside the repository,
- rejects obvious cloud-synchronized paths unless the operator deliberately overrides after legal/privacy review,
- verifies the expected production project reference before dumping,
- permits restore only to `localhost`, `127.0.0.1`, or `::1`,
- refuses when source and restore URLs are identical,
- suppresses external command output that might expose connection details,
- uses an all-or-nothing local restore transaction,
- runs only the committed SELECT-only preflight after restore,
- records file names, sizes, hashes, and verification status rather than credentials,
- removes newly created partial artifacts on failure unless the operator explicitly requests retention,
- clears credential environment variables from the PowerShell process by default.

The script cannot prove that a disk is encrypted. `-ConfirmEncryptedStorage` is an operator attestation, not a technical detection mechanism.

## Prerequisites

On the trusted local computer:

- BitLocker or equivalent full-volume encryption,
- an output directory outside OneDrive/Dropbox/Google Drive/iCloud/Box unless separately approved,
- enough free disk space for the logical dump and restored database,
- current Supabase CLI,
- PostgreSQL `psql`,
- Docker and local Supabase or another empty disposable local PostgreSQL instance,
- protected production database connection details from a password manager,
- no screen sharing, terminal recording, or shell-history capture that exposes secrets.

Use an empty local restore database. Do not restore over a development database that contains work worth preserving.

## Prepare the disposable local database

One acceptable option is a local Supabase stack started from a clean disposable working directory. Record the local database URL only in the current PowerShell process.

The restore URL must resolve to a local host. The script rejects remote restore destinations even when they appear to be test projects.

## Run the verified workflow

Open a fresh PowerShell session. Load credentials from the password manager without pasting them into GitHub, chat, a script file, PowerShell profile, or committed `.env` file.

```powershell
$env:STUDIO_LAS_TARGET_DB_URL = Read-Host "Target database URL"
$env:STUDIO_LAS_RESTORE_DB_URL = Read-Host "Disposable local restore database URL"

.\scripts\backup_and_verify_target.ps1 `
  -OutputDirectory "E:\StudioLasSecure" `
  -ConfirmEncryptedStorage `
  -VerifyRestore
```

`Read-Host` does not make a connection URL cryptographically hidden from the console process. Prefer a password-manager integration that sets process environment variables directly when available.

The official Supabase CLI receives the source URL as a local process argument during `db dump`. Therefore the workflow must run only on a trusted computer where other users cannot inspect process arguments.

The script clears both process environment variables when it finishes unless `-PreserveCredentialEnvironment` was explicitly used.

## Expected local directory

The script creates a timestamped directory similar to:

```text
studio-las-target-backup-YYYYMMDD-HHMMSS/
  roles.studio-las-backup.sql
  schema.studio-las-backup.sql
  data.studio-las-backup.sql
  studio-las-backup-manifest.json
  studio-las-restore-preflight.log
```

Every file in this directory is sensitive. The manifest does not contain a connection URL or password, but it identifies a backup of a health/process database and must still be protected.

## Restore verification

The script restores in this order:

1. roles,
2. schema,
3. `session_replication_role = replica` for data loading,
4. data,
5. read-only target preflight.

`psql` is invoked with:

- one transaction,
- `ON_ERROR_STOP=1`,
- a local-only database URL.

Any SQL or preflight error fails the workflow. Newly created partial artifacts are deleted by default.

## Evidence allowed on PR #9

Post only a non-sensitive summary:

- UTC completion timestamp,
- source project ref,
- manifest version,
- whether all three dump artifacts are non-empty,
- whether SHA-256 hashes were generated,
- `restoreVerified: true`,
- confirmation that the preflight completion marker was found,
- confirmation that the restore target was local and disposable,
- confirmation that production remained unchanged.

Do not attach:

- dump files,
- manifest file,
- restore log,
- absolute local paths,
- database URLs,
- usernames or passwords,
- exact production row counts,
- screenshots containing secrets or data.

## Storage limitation

A logical PostgreSQL/Supabase database dump contains database schema and data, including Storage metadata stored in PostgreSQL. It does not copy the binary objects stored by Supabase Storage.

The production-sensitive target currently has no Storage bucket, so this does not block the present pre-migration backup. After document uploads are enabled, backup and recovery must include a separate, protected Storage-object procedure and a restore test.

## Retention and deletion

Until the privacy/RODO retention decision is approved:

- keep the minimum number of verified backups,
- restrict access to the owner/operator,
- do not place backups in consumer cloud synchronization by default,
- do not email or message backup files,
- delete the disposable restored database after verification,
- securely remove obsolete local backup copies according to the approved retention procedure,
- document who created, accessed, restored, and deleted each backup without copying client data into the log.

The script does not automatically delete a successfully verified backup. Retention is a controlled owner/legal decision.

## Failure handling

A failed workflow is a stop condition.

Do not:

- continue with the production migration,
- disable `ON_ERROR_STOP`,
- restore into the production source,
- use a remote restore destination,
- commit partial dumps,
- weaken the read-only preflight,
- mark the backup gate complete based only on file creation.

Fix the local tooling or database compatibility issue and rerun the entire workflow. Use `-KeepFailedArtifacts` only when the encrypted local directory is being actively investigated and the sensitive partial files are necessary.

## Current gate status

Prepared:

- secure local script,
- gitignore protection,
- SELECT-only target preflight,
- CI guard for the preflight,
- non-destructive target drift report.

Not yet completed:

- actual target dump,
- local restore,
- restored-database preflight,
- non-sensitive backup verification evidence on PR #9.

No target migration may begin before those steps pass.
