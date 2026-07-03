# Register My Daily Path to start on Windows login (current user).
# Run once: npm run autostart:install
# Test now: npm run autostart:test   (without re-login)
# Remove:   npm run autostart:remove

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$StartScript = Join-Path $PSScriptRoot "start-dev.ps1"
$PathsFile = Join-Path $PSScriptRoot "autostart-paths.ps1"
$TaskName = "MyDailyPath-DevServer"

if (-not (Test-Path $StartScript)) {
  Write-Error "Missing start-dev.ps1"
}

# Save full paths to npm/node while PATH works in this terminal.
$npmSource = $null
$cmdCandidate = Join-Path ${env:ProgramFiles} "nodejs\npm.cmd"
if (Test-Path $cmdCandidate) {
  $npmSource = $cmdCandidate
} else {
  $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($npmCmd) { $npmSource = $npmCmd.Source }
  else {
    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
    if ($npmCmd) { $npmSource = $npmCmd.Source }
  }
}
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($npmSource) {
  $npmEsc = $npmSource -replace "'", "''"
  $nodeEsc = if ($nodeCmd) { $nodeCmd.Source -replace "'", "''" } else { "" }
  @"
`$script:NpmPath = '$npmEsc'
`$script:NodePath = '$nodeEsc'
"@ | Set-Content -Path $PathsFile -Encoding UTF8
  Write-Host "Saved npm path: $npmSource"
} else {
  Write-Warning "npm not in PATH now - autostart-paths.ps1 not written. Fix PATH first."
}

$Action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$StartScript`"" `
  -WorkingDirectory $ProjectRoot

$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Trigger.Delay = "PT20S"

$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

$Principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Principal $Principal `
  -Force | Out-Null

Write-Host ""
Write-Host "Installed scheduled task '$TaskName'."
Write-Host "  - Runs 20 seconds after you sign in to Windows"
Write-Host "  - Opens a PowerShell dev server window (auto-restart, port 3000)"
Write-Host "  - Log files: dev-autostart.log, dev-server.log"
Write-Host ""
Write-Host "IMPORTANT: The task runs on the NEXT login, not immediately."
Write-Host "Test right now without re-login:  npm run autostart:test"
Write-Host "Stop server: close the dev server PowerShell window"
Write-Host "Remove: npm run autostart:remove"
