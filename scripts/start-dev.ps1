# Starts dev server supervisor and opens My Daily Path (used by autostart).

$ProjectRoot = Split-Path -Parent $PSScriptRoot

Set-Location $ProjectRoot



$LogFile = Join-Path $ProjectRoot "dev-autostart.log"

$ExePath = Join-Path $ProjectRoot "MyDailyPath.exe"



function Log([string]$Msg) {

  $line = (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + " " + $Msg

  Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue

}



. (Join-Path $PSScriptRoot "app-common.ps1")



Log "=== start-dev.ps1 ==="



if (Test-DevServerRunning) {

  Log "Server already running on port 3000 - opening app"

  if (Test-Path $ExePath) { Start-Process $ExePath } else { Start-Process "http://localhost:3000/schedule" }

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

  Log "Server ready - opening app"

  if (Test-Path $ExePath) { Start-Process $ExePath } else { Start-Process "http://localhost:3000/schedule" }

} else {

  Log "WARN: server not ready after 90s"

  if (Test-Path $ExePath) { Start-Process $ExePath }

}

