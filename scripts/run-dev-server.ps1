# Visible dev server on port 3000 with auto-restart and logging.
param([switch]$Lan)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

. (Join-Path $PSScriptRoot "app-common.ps1")

Initialize-ShellPath

$LogFile = Join-Path $ProjectRoot "dev-server.log"
$LockFile = Get-DevSupervisorLockPath -ProjectRoot $ProjectRoot
$LockDir = Split-Path $LockFile -Parent
$RestartDelaySec = 3
$DevScript = if ($Lan) { "dev:lan" } else { "dev" }

function Write-DevLog {
  param([string]$Message)
  $line = (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + " " + $Message
  Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
}

if (Test-DevSupervisorRunning -ProjectRoot $ProjectRoot) {
  Write-Host "Dev server supervisor is already running in another window."
  exit 0
}

New-Item -ItemType Directory -Force -Path $LockDir | Out-Null
Set-Content -Path $LockFile -Value $PID -Encoding ascii

try {
  Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Remove-Item -LiteralPath $using:LockFile -Force -ErrorAction SilentlyContinue
  } | Out-Null
} catch {
  # Older hosts may not support engine events; lock file is cleaned on next start.
}

Write-DevLog "=== supervisor started (PID $PID, script=$DevScript) ==="

$npm = Resolve-Npm
if (-not $npm) {
  Write-Host "ERROR: npm not found. Install Node.js first." -ForegroundColor Red
  Write-DevLog "ERROR: npm not found"
  Remove-Item -LiteralPath $LockFile -Force -ErrorAction SilentlyContinue
  exit 1
}

Write-Host ""
Write-Host "My Daily Path - dev server (http://localhost:3000)" -ForegroundColor Cyan
Write-Host "This window keeps the server alive and restarts it after crashes." -ForegroundColor DarkGray
Write-Host "Close this window to stop the server." -ForegroundColor DarkGray
Write-Host "Log file: $LogFile" -ForegroundColor DarkGray
Write-Host ""

while ($true) {
  Free-DevPort3000

  Write-DevLog "Starting npm run $DevScript"
  Write-Host ("[" + (Get-Date -Format "HH:mm:ss") + "] Starting npm run $DevScript ...") -ForegroundColor Green

  $proc = Start-Process -FilePath $npm `
    -ArgumentList @("run", $DevScript) `
    -WorkingDirectory $ProjectRoot `
    -NoNewWindow `
    -PassThru `
    -Wait

  $exitCode = if ($null -ne $proc) { $proc.ExitCode } else { -1 }
  Write-DevLog ("Server exited with code " + $exitCode)

  Write-Host ""
  Write-Host ("Server stopped (exit code " + $exitCode + ").") -ForegroundColor Yellow
  Write-Host ("Restarting in " + $RestartDelaySec + " seconds. Press Ctrl+C to stop supervisor.") -ForegroundColor DarkGray
  Write-Host ""

  Start-Sleep -Seconds $RestartDelaySec
}
