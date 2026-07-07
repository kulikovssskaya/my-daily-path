# Upload .data/sync-state.json to Vercel cloud sync.
# Usage:
#   $env:SYNC_SECRET = "your-code"
#   powershell -ExecutionPolicy Bypass -File scripts/restore-backup-to-cloud.ps1

param(
  [string]$SyncSecret = $env:SYNC_SECRET
)

$ErrorActionPreference = "Stop"

if ($SyncSecret) {
  $env:SYNC_SECRET = $SyncSecret
}

if (-not $env:SYNC_SECRET) {
  Write-Error "Set SYNC_SECRET env var first."
}

$nodeScript = Join-Path $PSScriptRoot "sync-restore.mjs"
if (-not (Test-Path $nodeScript)) {
  Write-Error "Missing scripts/sync-restore.mjs"
}

Write-Host "Uploading backup via Node (avoids PowerShell JSON issues)..."
node $nodeScript
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
