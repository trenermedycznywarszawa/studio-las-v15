# Studio Las OS isolated disposable QA — Windows launcher (no Docker/WSL).
# This does not run automatic data-writing E2E tests.
[CmdletBinding()]
param([switch]$CheckOnly)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$expectedBranch = 'codex/isolated-qa-e2e-preparation-20261116'
$previousLocation = Get-Location
$oldRef = [Environment]::GetEnvironmentVariable('STUDIO_LAS_E2E_PROJECT_REF', 'Process')
$oldUrl = [Environment]::GetEnvironmentVariable('STUDIO_LAS_E2E_SUPABASE_URL', 'Process')
$oldKey = [Environment]::GetEnvironmentVariable('STUDIO_LAS_E2E_PUBLISHABLE_KEY', 'Process')

try {
    Set-Location $repoRoot
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Brak Git. Otworz projekt w Antigravity z dostepem do Git.' }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Brak Node.js. Wymagana wersja 22.' }
    $actualBranch = (& git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $actualBranch -ne $expectedBranch) {
        throw "BLOCKED: oczekiwana galaz testowa: $expectedBranch (aktywna: $actualBranch)"
    }
    $version = (& node -p "process.versions.node.split('.')[0]").Trim()
    if ($LASTEXITCODE -ne 0 -or [int]$version -lt 22) {
        throw "BLOCKED: wymagany Node.js 22 lub nowszy (obecny: $version)"
    }
    $env:STUDIO_LAS_E2E_PROJECT_REF = 'yipsjvbgxdmdicijxcph'
    $env:STUDIO_LAS_E2E_SUPABASE_URL = 'https://yipsjvbgxdmdicijxcph.supabase.co'
    if (-not $env:STUDIO_LAS_E2E_PUBLISHABLE_KEY) {
        Write-Host 'Wklej tylko klucz PUBLICZNY (sb_publishable_...) z Supabase QA > Project Settings > API Keys.'
        Write-Host 'NIE uzywaj klucza sb_secret_, service_role ani zadnego hasla!'
        $env:STUDIO_LAS_E2E_PUBLISHABLE_KEY = Read-Host 'Klucz publiczny QA'
    }
    if (-not $env:STUDIO_LAS_E2E_PUBLISHABLE_KEY.StartsWith('sb_publishable_')) {
        throw 'BLOCKED: dozwolony jest wylacznie klucz publiczny sb_publishable_ z QA'
    }
    if ($CheckOnly) {
        & node (Join-Path $PSScriptRoot 'start_isolated_qa_preview.mjs') --check-only
    } else {
        Write-Host 'Budowanie i uruchamianie QA na http://127.0.0.1:8790/'
        Write-Host 'Po starcie otworz adres w przegladarce. Ctrl+C zatrzymuje serwer.'
        & node (Join-Path $PSScriptRoot 'start_isolated_qa_preview.mjs')
    }
    if ($LASTEXITCODE -ne 0) { throw "BLOCKED: launcher QA zakonczyl prace kodem $LASTEXITCODE" }
}
finally {
    [Environment]::SetEnvironmentVariable('STUDIO_LAS_E2E_PROJECT_REF', $oldRef, 'Process')
    [Environment]::SetEnvironmentVariable('STUDIO_LAS_E2E_SUPABASE_URL', $oldUrl, 'Process')
    [Environment]::SetEnvironmentVariable('STUDIO_LAS_E2E_PUBLISHABLE_KEY', $oldKey, 'Process')
    Set-Location $previousLocation
}
