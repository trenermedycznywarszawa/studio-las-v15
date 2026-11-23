[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,

    [switch]$VerifyRestore,

    [switch]$ConfirmEncryptedStorage,

    [switch]$AllowPotentialCloudSync,

    [switch]$KeepFailedArtifacts,

    [switch]$PreserveCredentialEnvironment,

    [string]$SourceProjectRef = "ufcumhbnuyernuwepcij"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$SourceUrlEnvironment = "STUDIO_LAS_TARGET_DB_URL"
$RestoreUrlEnvironment = "STUDIO_LAS_RESTORE_DB_URL"
$BackupPrefix = "studio-las-target-backup-"
$CompletionMarker = "Studio Las OS target read-only preflight completed"

function Get-NormalizedPath {
    param([Parameter(Mandatory = $true)][string]$Path)

    return [System.IO.Path]::GetFullPath($Path).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    )
}

function Test-PathInside {
    param(
        [Parameter(Mandatory = $true)][string]$Candidate,
        [Parameter(Mandatory = $true)][string]$Parent
    )

    $candidatePath = Get-NormalizedPath -Path $Candidate
    $parentPath = Get-NormalizedPath -Path $Parent
    $separator = [System.IO.Path]::DirectorySeparatorChar

    return $candidatePath.Equals($parentPath, [System.StringComparison]::OrdinalIgnoreCase) -or
        $candidatePath.StartsWith("$parentPath$separator", [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-RequiredEnvironmentValue {
    param([Parameter(Mandatory = $true)][string]$Name)

    $value = [Environment]::GetEnvironmentVariable($Name, "Process")
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Required process environment variable '$Name' is missing. Load it from a password manager for this PowerShell session only."
    }

    return $value.Trim()
}

function ConvertTo-DatabaseUri {
    param(
        [Parameter(Mandatory = $true)][string]$Value,
        [Parameter(Mandatory = $true)][string]$Label
    )

    try {
        $uri = [System.Uri]$Value
    }
    catch {
        throw "$Label is not a valid PostgreSQL URI. URL-encode special characters in the password."
    }

    if ($uri.Scheme -notin @("postgres", "postgresql")) {
        throw "$Label must use the postgres or postgresql scheme."
    }

    if ([string]::IsNullOrWhiteSpace($uri.Host)) {
        throw "$Label has no host."
    }

    return $uri
}

function Invoke-ExternalCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Label
    )

    # Deliberately suppress command output. Database URLs are passed to official
    # local CLIs and must never be copied into GitHub, chat, or console logs.
    $null = & $Executable @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE. Review the protected local environment; no connection string is printed."
    }
}

function Invoke-ExternalCommandToFile {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][string]$OutputPath
    )

    & $Executable @Arguments *> $OutputPath
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE. Details remain only in the protected local log."
    }
}

function Assert-NonEmptyFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Expected backup artifact was not created: $([System.IO.Path]::GetFileName($Path))"
    }

    $item = Get-Item -LiteralPath $Path
    if ($item.Length -le 0) {
        throw "Backup artifact is empty: $($item.Name)"
    }
}

function Get-ArtifactMetadata {
    param([Parameter(Mandatory = $true)][string]$Path)

    $item = Get-Item -LiteralPath $Path
    $hash = Get-FileHash -LiteralPath $Path -Algorithm SHA256

    return [ordered]@{
        fileName = $item.Name
        sizeBytes = $item.Length
        sha256 = $hash.Hash.ToLowerInvariant()
    }
}

$repoRoot = Get-NormalizedPath -Path (Join-Path $PSScriptRoot "..")
$preflightPath = Join-Path $repoRoot "supabase/tests/target_read_only_preflight.sql"
$sourceDbUrl = $null
$restoreDbUrl = $null
$backupDirectory = $null
$completed = $false

try {
    if (-not $ConfirmEncryptedStorage) {
        throw "Refusing to create a plaintext logical backup without -ConfirmEncryptedStorage. Use a BitLocker-encrypted or equivalently protected, non-shared local volume."
    }

    $outputRoot = Get-NormalizedPath -Path $OutputDirectory
    if (Test-PathInside -Candidate $outputRoot -Parent $repoRoot) {
        throw "Refusing to store a target backup inside the Git repository."
    }

    $cloudMarkers = @("OneDrive", "Dropbox", "Google Drive", "iCloudDrive", "Box Sync")
    $looksCloudSynced = $false
    foreach ($marker in $cloudMarkers) {
        if ($outputRoot.IndexOf($marker, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            $looksCloudSynced = $true
            break
        }
    }
    if ($looksCloudSynced -and -not $AllowPotentialCloudSync) {
        throw "Output path appears to be cloud-synchronized. Use a protected local volume or explicitly pass -AllowPotentialCloudSync after reviewing processor and transfer obligations."
    }

    if (-not (Test-Path -LiteralPath $outputRoot)) {
        New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
    }
    if (-not (Test-Path -LiteralPath $outputRoot -PathType Container)) {
        throw "OutputDirectory is not a directory."
    }

    if (-not (Test-Path -LiteralPath $preflightPath -PathType Leaf)) {
        throw "Committed target read-only preflight is missing."
    }

    $supabaseCommand = Get-Command "supabase" -ErrorAction Stop
    $psqlCommand = $null
    if ($VerifyRestore) {
        $psqlCommand = Get-Command "psql" -ErrorAction Stop
    }

    $sourceDbUrl = Get-RequiredEnvironmentValue -Name $SourceUrlEnvironment
    $sourceUri = ConvertTo-DatabaseUri -Value $sourceDbUrl -Label "Target database URL"

    if ($sourceDbUrl.IndexOf($SourceProjectRef, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
        throw "Target database URL does not contain the expected project reference. Refusing to back up an unidentified database."
    }

    $localHosts = @("localhost", "127.0.0.1", "::1", "[::1]")
    if ($localHosts -contains $sourceUri.Host.ToLowerInvariant()) {
        throw "Target database URL unexpectedly points to localhost. Refusing ambiguous source configuration."
    }

    if ($VerifyRestore) {
        $restoreDbUrl = Get-RequiredEnvironmentValue -Name $RestoreUrlEnvironment
        $restoreUri = ConvertTo-DatabaseUri -Value $restoreDbUrl -Label "Restore database URL"
        if ($localHosts -notcontains $restoreUri.Host.ToLowerInvariant()) {
            throw "Restore database must be disposable and local (localhost, 127.0.0.1, or ::1). Remote restore targets are prohibited."
        }
        if ($restoreDbUrl.Equals($sourceDbUrl, [System.StringComparison]::Ordinal)) {
            throw "Restore and source database URLs are identical."
        }
    }

    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
    $backupDirectory = Join-Path $outputRoot "$BackupPrefix$timestamp"
    if (Test-Path -LiteralPath $backupDirectory) {
        throw "Backup directory already exists."
    }
    New-Item -ItemType Directory -Path $backupDirectory | Out-Null

    $rolesPath = Join-Path $backupDirectory "roles.studio-las-backup.sql"
    $schemaPath = Join-Path $backupDirectory "schema.studio-las-backup.sql"
    $dataPath = Join-Path $backupDirectory "data.studio-las-backup.sql"
    $manifestPath = Join-Path $backupDirectory "studio-las-backup-manifest.json"
    $preflightLogPath = Join-Path $backupDirectory "studio-las-restore-preflight.log"

    Write-Host "Creating encrypted-local logical backup artifacts. Connection details remain hidden."

    Invoke-ExternalCommand -Executable $supabaseCommand.Source -Label "Role dump" -Arguments @(
        "db", "dump",
        "--db-url", $sourceDbUrl,
        "--file", $rolesPath,
        "--role-only"
    )

    Invoke-ExternalCommand -Executable $supabaseCommand.Source -Label "Schema dump" -Arguments @(
        "db", "dump",
        "--db-url", $sourceDbUrl,
        "--file", $schemaPath
    )

    Invoke-ExternalCommand -Executable $supabaseCommand.Source -Label "Data dump" -Arguments @(
        "db", "dump",
        "--db-url", $sourceDbUrl,
        "--file", $dataPath,
        "--use-copy",
        "--data-only"
    )

    foreach ($artifact in @($rolesPath, $schemaPath, $dataPath)) {
        Assert-NonEmptyFile -Path $artifact
    }

    $restoreVerified = $false
    if ($VerifyRestore) {
        Write-Host "Restoring only into the explicitly configured disposable local database."

        Invoke-ExternalCommand -Executable $psqlCommand.Source -Label "Local restore verification" -Arguments @(
            "--dbname", $restoreDbUrl,
            "--single-transaction",
            "--variable", "ON_ERROR_STOP=1",
            "--file", $rolesPath,
            "--file", $schemaPath,
            "--command", "SET session_replication_role = replica;",
            "--file", $dataPath
        )

        Invoke-ExternalCommandToFile -Executable $psqlCommand.Source -Label "Restored database read-only preflight" -OutputPath $preflightLogPath -Arguments @(
            "--dbname", $restoreDbUrl,
            "--variable", "ON_ERROR_STOP=1",
            "--file", $preflightPath
        )

        Assert-NonEmptyFile -Path $preflightLogPath
        $preflightText = Get-Content -LiteralPath $preflightLogPath -Raw
        if ($preflightText -notmatch [regex]::Escape($CompletionMarker)) {
            throw "Restored database preflight did not reach its completion marker."
        }

        $restoreVerified = $true
    }

    $manifest = [ordered]@{
        manifestVersion = 1
        createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
        sourceProjectRef = $SourceProjectRef
        format = "Supabase CLI logical SQL"
        containsSensitiveClientData = $true
        storageObjectsIncluded = $false
        restoreVerificationRequested = [bool]$VerifyRestore
        restoreVerified = $restoreVerified
        preflightFile = "supabase/tests/target_read_only_preflight.sql"
        artifacts = @(
            Get-ArtifactMetadata -Path $rolesPath
            Get-ArtifactMetadata -Path $schemaPath
            Get-ArtifactMetadata -Path $dataPath
        )
    }

    if ($VerifyRestore) {
        $manifest.restorePreflightLog = [ordered]@{
            fileName = [System.IO.Path]::GetFileName($preflightLogPath)
            sizeBytes = (Get-Item -LiteralPath $preflightLogPath).Length
            completionMarkerFound = $true
        }
    }

    $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    Assert-NonEmptyFile -Path $manifestPath

    $completed = $true
    Write-Host "Backup workflow completed. Sensitive artifacts remain only in the protected local directory:"
    Write-Host $backupDirectory
    if (-not $VerifyRestore) {
        Write-Warning "Backup was created but not restored. The production backup gate remains OPEN until -VerifyRestore succeeds."
    }
}
catch {
    if ($backupDirectory -and (Test-Path -LiteralPath $backupDirectory)) {
        if ($KeepFailedArtifacts) {
            Write-Warning "Workflow failed. Sensitive partial artifacts were retained by explicit request at: $backupDirectory"
        }
        else {
            if ((Split-Path -Leaf $backupDirectory).StartsWith($BackupPrefix, [System.StringComparison]::Ordinal) -and
                (Test-PathInside -Candidate $backupDirectory -Parent (Split-Path -Parent $backupDirectory))) {
                Remove-Item -LiteralPath $backupDirectory -Recurse -Force
            }
            Write-Warning "Workflow failed. Newly created partial backup artifacts were removed."
        }
    }

    Write-Error $_.Exception.Message
    exit 1
}
finally {
    $sourceDbUrl = $null
    $restoreDbUrl = $null

    if (-not $PreserveCredentialEnvironment) {
        Remove-Item "Env:$SourceUrlEnvironment" -ErrorAction SilentlyContinue
        Remove-Item "Env:$RestoreUrlEnvironment" -ErrorAction SilentlyContinue
    }
}

if (-not $completed) {
    exit 1
}
