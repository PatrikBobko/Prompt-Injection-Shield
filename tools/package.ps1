# Builds the Chrome Web Store upload zip containing ONLY the files the published
# extension needs: manifest.json, src/, and icons/. Excludes tests, tooling, docs.
#
# Uses System.IO.Compression directly so zip entries use forward slashes (the
# Chrome Web Store rejects the backslash paths that Compress-Archive produces).
#
#   powershell -File tools/package.ps1

$base = if ($PSScriptRoot) { Split-Path $PSScriptRoot } else { (Get-Location).Path }
$out = Join-Path $base 'prompt-injection-shield.zip'

Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path $out) { Remove-Item $out -Force }

$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
try {
  function Add-Entry($full, $name) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $full, $name) | Out-Null
    Write-Host "  + $name"
  }

  Add-Entry (Join-Path $base 'manifest.json') 'manifest.json'
  foreach ($folder in 'src', 'icons') {
    Get-ChildItem (Join-Path $base $folder) -Recurse -File | ForEach-Object {
      $rel = $_.FullName.Substring($base.Length + 1).Replace('\', '/')
      Add-Entry $_.FullName $rel
    }
  }
} finally {
  $zip.Dispose()
}

$kb = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Host "Built $out ($kb KB)"
