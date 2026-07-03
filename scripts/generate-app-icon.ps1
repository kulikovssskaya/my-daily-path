# Bright multi-size icons (visible on dark taskbar).
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PublicDir = Join-Path $ProjectRoot "public"
$IcoPath = Join-Path $PublicDir "app-icon.ico"

if (-not (Test-Path $PublicDir)) {
  New-Item -ItemType Directory -Path $PublicDir | Out-Null
}

Add-Type -AssemblyName System.Drawing

function New-IconBitmap([int]$Size) {
  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::White)

  $pad = [int][Math]::Max(2, [Math]::Round($Size * 0.06))
  $rect = New-Object System.Drawing.Rectangle $pad, $pad, ($Size - 2 * $pad), ($Size - 2 * $pad)

  if ($Size -le 40) {
    # Small taskbar sizes: flat bright purple disc + white hands
    $fill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 130, 100, 255))
    $g.FillEllipse($fill, $rect)
    $cx = [single]($Size / 2.0)
    $cy = [single]($Size / 2.0)
    $w = [single][Math]::Max(1.5, $Size * 0.08)
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), $w
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, $cx, $cy, $cx, ($cy - $Size * 0.18))
    $g.DrawLine($pen, $cx, $cy, ($cx + $Size * 0.16), ($cy + $Size * 0.12))
    $pen.Dispose()
    $fill.Dispose()
  } else {
    $fill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 120, 90, 255))
    $g.FillEllipse($fill, $rect)
    $border = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 200, 180, 255)), ([single]($Size * 0.03))
    $g.DrawEllipse($border, $rect)

    $cx = [single]($Size / 2.0)
    $cy = [single]($Size / 2.0)
    $handPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), ([single]($Size * 0.05))
    $handPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $handPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($handPen, $cx, $cy, $cx, ($cy - $Size * 0.17))
    $g.DrawLine($handPen, $cx, $cy, ($cx + $Size * 0.2), ($cy + $Size * 0.13))

    $dot = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 240))
    $dotSize = [int][Math]::Max(5, [Math]::Round($Size * 0.08))
    $g.FillEllipse($dot, ($cx - $dotSize / 2.0), ($cy - $dotSize / 2.0), $dotSize, $dotSize)

    $fill.Dispose()
    $border.Dispose()
    $handPen.Dispose()
    $dot.Dispose()
  }

  $g.Dispose()
  return $bmp
}

foreach ($size in @(192, 256, 512)) {
  $bmp = New-IconBitmap $size
  $path = Join-Path $PublicDir "app-icon-$size.png"
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Created $path"
}

$bmp256 = New-IconBitmap 256
$pngPath = Join-Path $PublicDir "app-icon.png"
$bmp256.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Build .ico from 256px (bright, simple)
$iconHandle = $bmp256.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$fs = [System.IO.File]::Open($IcoPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$bmp256.Dispose()

Write-Host "Created $pngPath"
Write-Host "Created $IcoPath"
