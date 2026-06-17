# Generates the extension icons (16/48/128 px) as a blue shield with a white
# checkmark, using GDI+. Re-run after tweaking to regenerate icons/.
#
#   powershell -File tools/make-icons.ps1

Add-Type -AssemblyName System.Drawing

$base = if ($PSScriptRoot) { Split-Path $PSScriptRoot } else { (Get-Location).Path }
$dir = Join-Path $base 'icons'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$blue = [System.Drawing.Color]::FromArgb(37, 99, 235)   # #2563eb

foreach ($s in 16, 48, 128) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  # Shield silhouette.
  $pts = [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF([single]($s * 0.50), [single]($s * 0.06))),
    (New-Object System.Drawing.PointF([single]($s * 0.88), [single]($s * 0.20))),
    (New-Object System.Drawing.PointF([single]($s * 0.88), [single]($s * 0.55))),
    (New-Object System.Drawing.PointF([single]($s * 0.50), [single]($s * 0.94))),
    (New-Object System.Drawing.PointF([single]($s * 0.12), [single]($s * 0.55))),
    (New-Object System.Drawing.PointF([single]($s * 0.12), [single]($s * 0.20)))
  )
  $brush = New-Object System.Drawing.SolidBrush($blue)
  $g.FillPolygon($brush, $pts)

  # White checkmark.
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [single]($s * 0.10))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $check = [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF([single]($s * 0.32), [single]($s * 0.52))),
    (New-Object System.Drawing.PointF([single]($s * 0.45), [single]($s * 0.66))),
    (New-Object System.Drawing.PointF([single]($s * 0.70), [single]($s * 0.36)))
  )
  $g.DrawLines($pen, $check)

  $bmp.Save((Join-Path $dir "icon$s.png"), [System.Drawing.Imaging.ImageFormat]::Png)

  $pen.Dispose(); $brush.Dispose(); $g.Dispose(); $bmp.Dispose()
  Write-Host "wrote icons/icon$s.png"
}
