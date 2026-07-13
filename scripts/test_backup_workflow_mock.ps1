[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$workflowPath = Join-Path $PSScriptRoot "backup_and_verify_target.ps1"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("studio-las-backup-mock-" + [guid]::NewGuid().ToString("N"))
$mockBin = Join-Path $tempRoot "bin"
$outputRoot = Join-Path $tempRoot "secure-output"
$originalPath = $env:PATH

try {
    New-Item -ItemType Directory -Path $mockBin -Force | Out-Null
    New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

    $mockSupabase = Join-Path $mockBin "supabase"
    $mockPsql = Join-Path $mockBin "psql"

    @'
#!/usr/bin/env bash
set -euo pipefail
output=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)
      output="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done
if [[ -z "$output" ]]; then
  exit 41
fi
printf '%s\n' '-- fictional offline backup artifact' > "$output"
'@ | Set-Content -LiteralPath $mockSupabase -Encoding utf8NoBOM

    @'
#!/usr/bin/env bash
set -euo pipefail
preflight=false
for argument in "$@"; do
  if [[ "$argument" == *"target_read_only_preflight.sql" ]]; then
    preflight=true
  fi
done
if [[ "$preflight" == "true" ]]; then
  printf '%s\n' 'Studio Las OS target read-only preflight completed'
fi
'@ | Set-Content -LiteralPath $mockPsql -Encoding utf8NoBOM

    & chmod +x $mockSupabase $mockPsql
    if ($LASTEXITCODE -ne 0) {
        throw "Could not mark mock commands executable."
    }

    $env:PATH = "$mockBin$([System.IO.Path]::PathSeparator)$originalPath"
    $env:STUDIO_LAS_TARGET_DB_URL = "postgresql://fixture:fixture@db.ufcumhbnuyernuwepcij.example.invalid:5432/postgres"
    $env:STUDIO_LAS_RESTORE_DB_URL = "postgresql://fixture:fixture@127.0.0.1:54322/postgres"

    & $workflowPath `
        -OutputDirectory $outputRoot `
        -ConfirmEncryptedStorage `
        -VerifyRestore

    if ($LASTEXITCODE -ne 0) {
        throw "Backup workflow returned a failure exit code during the offline mock test."
    }

    $backupDirectories = @(Get-ChildItem -LiteralPath $outputRoot -Directory -Filter "studio-las-target-backup-*")
    if ($backupDirectories.Count -ne 1) {
        throw "Expected exactly one mock backup directory, found $($backupDirectories.Count)."
    }

    $backupDirectory = $backupDirectories[0].FullName
    $manifestPath = Join-Path $backupDirectory "studio-las-backup-manifest.json"
    $preflightLogPath = Join-Path $backupDirectory "studio-las-restore-preflight.log"

    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw "Mock workflow did not create a manifest."
    }
    if (-not (Test-Path -LiteralPath $preflightLogPath -PathType Leaf)) {
        throw "Mock workflow did not create a preflight log."
    }

    $manifestText = Get-Content -LiteralPath $manifestPath -Raw
    $manifest = $manifestText | ConvertFrom-Json

    if (-not $manifest.restoreVerified) {
        throw "Mock manifest did not record restoreVerified=true."
    }
    if ($manifest.storageObjectsIncluded) {
        throw "Mock manifest incorrectly claims that Storage objects are included."
    }
    if ($manifest.sourceProjectRef -ne "ufcumhbnuyernuwepcij") {
        throw "Mock manifest contains the wrong source project ref."
    }
    if (@($manifest.artifacts).Count -ne 3) {
        throw "Mock manifest does not contain exactly three dump artifacts."
    }

    foreach ($artifact in @($manifest.artifacts)) {
        if ([string]::IsNullOrWhiteSpace($artifact.sha256) -or $artifact.sha256.Length -ne 64) {
            throw "Mock manifest contains an invalid SHA-256 hash."
        }
        if ([long]$artifact.sizeBytes -le 0) {
            throw "Mock manifest contains an empty artifact."
        }
    }

    if ($manifestText -match "fixture:fixture" -or $manifestText -match "postgres(?:ql)?://") {
        throw "Mock manifest leaked a database connection URL or credential."
    }

    $preflightText = Get-Content -LiteralPath $preflightLogPath -Raw
    if ($preflightText -notmatch "Studio Las OS target read-only preflight completed") {
        throw "Mock preflight completion marker is missing."
    }

    if (Test-Path Env:STUDIO_LAS_TARGET_DB_URL) {
        throw "Backup workflow did not clear the source URL environment variable."
    }
    if (Test-Path Env:STUDIO_LAS_RESTORE_DB_URL) {
        throw "Backup workflow did not clear the restore URL environment variable."
    }

    Write-Host "Studio Las OS backup workflow offline mock test completed"
}
finally {
    $env:PATH = $originalPath
    Remove-Item Env:STUDIO_LAS_TARGET_DB_URL -ErrorAction SilentlyContinue
    Remove-Item Env:STUDIO_LAS_RESTORE_DB_URL -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
