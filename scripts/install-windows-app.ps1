# Builds icon + MyDailyPath.exe + desktop/start-menu shortcuts.
param([string]$AppName = "My Daily Path")

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ExePath = Join-Path $ProjectRoot "MyDailyPath.exe"
$IcoPath = Join-Path $ProjectRoot "public\app-icon.ico"

. (Join-Path $PSScriptRoot "app-common.ps1")

& (Join-Path $PSScriptRoot "generate-app-icon.ps1")
& (Join-Path $PSScriptRoot "build-launcher.ps1")

if (-not (Test-Path $ExePath)) {
  Write-Host "ERROR: MyDailyPath.exe was not built."
  exit 1
}

$Desktop = [Environment]::GetFolderPath("Desktop")
$StartMenu = [Environment]::GetFolderPath("Programs")

New-AppShortcut -ShortcutPath (Join-Path $Desktop ($AppName + ".lnk")) `
  -ProjectRoot $ProjectRoot -IcoPath $IcoPath -LauncherExe $ExePath

New-AppShortcut -ShortcutPath (Join-Path $StartMenu ($AppName + ".lnk")) `
  -ProjectRoot $ProjectRoot -IcoPath $IcoPath -LauncherExe $ExePath

Write-Host ""
Write-Host ("Desktop:  " + (Join-Path $Desktop ($AppName + ".lnk")))
Write-Host ("Launcher: " + $ExePath)
Write-Host ""
Write-Host "Pin to taskbar: drag MyDailyPath.exe onto the taskbar."
Write-Host "Dev server: opens a visible PowerShell window with auto-restart on port 3000."
Write-Host ""
