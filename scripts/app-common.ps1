# Shared helpers for dev server and Windows shortcuts.
$script:DevPort = 3000
$script:DevUrl = "http://localhost:$($script:DevPort)"

function Initialize-ShellPath {
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  if ($userPath -and $machinePath) {
    $env:Path = $userPath + ";" + $machinePath
  } elseif ($userPath) {
    $env:Path = $userPath
  }
}

function Resolve-Npm {
  if ($script:NpmPath -and (Test-Path $script:NpmPath)) {
    return $script:NpmPath
  }
  $pathsFile = Join-Path $PSScriptRoot "autostart-paths.ps1"
  if (Test-Path $pathsFile) { . $pathsFile }
  if ($script:NpmPath -and (Test-Path $script:NpmPath)) {
    return $script:NpmPath
  }
  $cmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    (Join-Path $env:ProgramFiles "nodejs\npm.cmd"),
    (Join-Path ${env:ProgramFiles(x86)} "nodejs\npm.cmd"),
    (Join-Path $env:LOCALAPPDATA "Programs\node\npm.cmd")
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { return $c }
  }
  return $null
}

function Test-DevServerRunning {
  try {
    $r = Invoke-WebRequest -Uri $script:DevUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    return ($r.StatusCode -ge 200)
  } catch {
    return $false
  }
}

function Get-DevSupervisorLockPath {
  param([string]$ProjectRoot)
  return Join-Path $ProjectRoot ".data\dev-server.lock"
}

function Test-DevSupervisorRunning {
  param([string]$ProjectRoot)
  $lockFile = Get-DevSupervisorLockPath -ProjectRoot $ProjectRoot
  if (-not (Test-Path $lockFile)) { return $false }
  $raw = (Get-Content -Path $lockFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if (-not $raw) { return $false }
  $pidValue = 0
  if (-not [int]::TryParse($raw.Trim(), [ref]$pidValue)) { return $false }
  try {
    $proc = Get-Process -Id $pidValue -ErrorAction Stop
    return ($proc.ProcessName -match "powershell")
  } catch {
    return $false
  }
}

function Free-DevPort3000 {
  try {
    $conns = Get-NetTCPConnection -LocalPort $script:DevPort -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
      $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
      if ($proc -and $proc.ProcessName -match "node") {
        Write-Host ("Stopping stale node on port $($script:DevPort) (PID $($proc.Id))")
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
      }
    }
  } catch {
    Write-Host ("Could not inspect port $($script:DevPort): " + $_.Exception.Message)
  }
}

function Start-DevServerSupervisor {
  param(
    [string]$ProjectRoot,
    [switch]$Lan
  )
  if (Test-DevSupervisorRunning -ProjectRoot $ProjectRoot) {
    Write-Host "Dev server window is already open."
    return
  }

  $scriptPath = Join-Path $PSScriptRoot "run-dev-server.ps1"
  if (-not (Test-Path $scriptPath)) {
    throw "Missing run-dev-server.ps1"
  }

  $argList = @(
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $scriptPath
  )
  if ($Lan) { $argList += "-Lan" }

  Start-Process -FilePath "powershell.exe" -ArgumentList $argList -WorkingDirectory $ProjectRoot
}

function Wait-DevServer {
  param([int]$TimeoutSec = 60)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if (Test-DevServerRunning) { return $true }
    Start-Sleep -Seconds 2
  }
  return $false
}

function New-AppShortcut {
  param(
    [string]$ShortcutPath,
    [string]$ProjectRoot,
    [string]$IcoPath,
    [string]$LauncherExe
  )
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.WorkingDirectory = $ProjectRoot
  $shortcut.TargetPath = $LauncherExe
  $shortcut.Description = "My Daily Path"
  if (Test-Path $IcoPath) {
    $shortcut.IconLocation = ($IcoPath + ",0")
  }
  $shortcut.Save()
}
