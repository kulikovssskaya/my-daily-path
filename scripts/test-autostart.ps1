# Run the autostart script immediately (same as after login).

$ErrorActionPreference = "Stop"
$StartScript = Join-Path $PSScriptRoot "start-dev.ps1"
Write-Host "Running start-dev.ps1 (same as login autostart)..."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $StartScript
