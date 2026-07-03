# Builds MyDailyPath.exe (pinnable on Windows taskbar, unlike .bat files).
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LauncherDir = Join-Path $PSScriptRoot "launcher"
$CsFile = Join-Path $LauncherDir "MyDailyPath.cs"
$ExeOut = Join-Path $ProjectRoot "MyDailyPath.exe"
$IcoPath = Join-Path $ProjectRoot "public\app-icon.ico"

$cscPaths = @(
  (Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"),
  (Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe")
)
$csc = $cscPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $csc) {
  Write-Host "WARN: csc.exe not found. Using .bat launcher instead."
  exit 1
}

$cscArgs = @(
  "/nologo",
  "/target:winexe",
  ("/out:" + $ExeOut),
  "/reference:System.Windows.Forms.dll",
  "/reference:System.Net.dll"
)

if (Test-Path $IcoPath) {
  $cscArgs += ("/win32icon:" + $IcoPath)
}

$cscArgs += $CsFile

& $csc @cscArgs

if (-not (Test-Path $ExeOut)) {
  Write-Host "ERROR: failed to build MyDailyPath.exe"
  exit 1
}

Write-Host ("Built: " + $ExeOut)
