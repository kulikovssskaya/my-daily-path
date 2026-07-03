# Clears Next.js cache and optionally frees port 3000 (fixes "missing error components").

param([switch]$KillPort)



$ProjectRoot = Split-Path -Parent $PSScriptRoot

$NextDir = Join-Path $ProjectRoot ".next"



. (Join-Path $PSScriptRoot "app-common.ps1")



if (Test-Path $NextDir) {

  Remove-Item -Recurse -Force $NextDir

  Write-Host "Removed .next cache"

}



if ($KillPort) {

  Free-DevPort3000

}



Write-Host "Done. Run: npm run dev"

