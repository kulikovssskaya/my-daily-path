# Starts dev server supervisor. Use -OpenApp to also launch MyDailyPath / browser.
param([switch]$OpenApp)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$LogFile = Join-Path $ProjectRoot "dev-autostart.log"
$ExePath = Join-Path $ProjectRoot "MyDailyPath.exe"

function Log([string]$Msg) {
  $line = (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + " " + $Msg
  Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
}

function Open-App {
  if (Test-Path $ExePath) {
    Start-Process $ExePath
  } else {
    Start-Process "http://localhost:3000/schedule"
  }
}

. (Join-Path $PSScriptRoot "app-common.ps1")

Log "=== start-dev.ps1 (OpenApp=$OpenApp) ==="

if (Test-DevServerRunning) {
  Log "Server already running on port 3000"
  if ($OpenApp) {
    Log "Opening app"
    Open-App
  }
  exit 0
}

try {
  if (-not (Test-DevSupervisorRunning -ProjectRoot $ProjectRoot)) {
    Log "Starting dev server supervisor window"
    Start-DevServerSupervisor -ProjectRoot $ProjectRoot -Lan
  } else {
    Log "Supervisor already open - waiting for port 3000"
  }
} catch {
  Log ("ERROR: " + $_.Exception.Message)
  exit 1
}

Log "Waiting for server on port 3000..."
if (Wait-DevServer -TimeoutSec 90) {
  Log "Server ready"
  if ($OpenApp) {
    Log "Opening app"
    Open-App
  }
} else {
  Log "WARN: server not ready after 90s"
  if ($OpenApp) { Open-App }
}
