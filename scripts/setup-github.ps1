# Creates a private GitHub repo and pushes the current branch.
# Run once after: gh auth login

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI (gh) is not installed. Install with: winget install GitHub.cli"
}

$auth = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in to GitHub. Run:" -ForegroundColor Yellow
    Write-Host "  gh auth login" -ForegroundColor Cyan
    exit 1
}

$repoName = "my-daily-path"
$existing = gh repo view $repoName --json name 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Repo $repoName already exists on GitHub."
} else {
    gh repo create $repoName --private --source=. --remote=origin --description "My Daily Path — personal AI assistant for life, learning and career"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

git push -u origin main
if ($LASTEXITCODE -eq 0) {
    $url = gh repo view --json url -q .url
    Write-Host "Done. Backup is at: $url" -ForegroundColor Green
}
