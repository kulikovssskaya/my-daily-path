# Remove login autostart for My Daily Path dev server.

$TaskName = "MyDailyPath-DevServer"
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "Removed scheduled task '$TaskName' (if it existed)."
