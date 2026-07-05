# Creates a private GitHub repo and pushes the current branch.
# Run once after: gh auth login

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

function Resolve-Gh {
    $cmd = Get-Command gh -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $default = "${env:ProgramFiles}\GitHub CLI\gh.exe"
    if (Test-Path $default) { return $default }
    Write-Error "GitHub CLI (gh) is not installed. Install with: winget install GitHub.cli"
}

$gh = Resolve-Gh
function Invoke-Gh { & $gh @args }

Invoke-Gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in to GitHub. Run:" -ForegroundColor Yellow
    Write-Host "  & `"$gh`" auth login" -ForegroundColor Cyan
    exit 1
}

$repoName = "my-daily-path"
Invoke-Gh repo view $repoName --json name 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Repo $repoName already exists on GitHub."
    if (-not (git remote get-url origin 2>$null)) {
        $login = Invoke-Gh api user -q .login
        git remote add origin "https://github.com/$login/$repoName.git"
    }
} else {
    Invoke-Gh repo create $repoName --private --source=. --remote=origin `
        --description "My Daily Path — personal AI assistant for life, learning and career"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

git push -u origin main
if ($LASTEXITCODE -eq 0) {
    $url = Invoke-Gh repo view --json url -q .url
    Write-Host "Done. Backup is at: $url" -ForegroundColor Green
}
