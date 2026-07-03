# Print the URL to open My Daily Path on iPhone (same Wi-Fi as this PC).

$ip = $null
try {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.PrefixOrigin -ne "WellKnown"
    } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1 -ExpandProperty IPAddress
} catch { }

if (-not $ip) {
  Write-Host "Could not detect LAN IP. Run: ipconfig"
  Write-Host "Look for IPv4 under Wi-Fi, e.g. 192.168.1.42"
  exit 1
}

$url = "http://${ip}:3000"
Write-Host ""
Write-Host "Open on iPhone (Safari, same Wi-Fi as this PC):"
Write-Host "  $url"
Write-Host ""
Write-Host "Start server for phone access:  npm run dev:lan"
Write-Host ""
