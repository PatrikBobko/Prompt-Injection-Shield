# Minimal static file server for local testing (no Node/Python needed).
# Serves the project root over http://127.0.0.1:<port> using a raw TcpListener,
# so it needs no admin rights or URL ACL reservation.
#
#   powershell -ExecutionPolicy Bypass -File tools/serve.ps1 [-Port 8000]

param([int]$Port = 8000)

# Project root: parent of tools/ when run as a file; current dir otherwise.
$root = if ($PSScriptRoot) { Split-Path $PSScriptRoot } else { (Get-Location).Path }

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.svg'  = 'image/svg+xml'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "Serving $root at http://127.0.0.1:$Port/"

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      # Browsers open speculative/keep-alive sockets that may send nothing; a
      # read timeout keeps one silent socket from stalling the accept loop.
      $stream.ReadTimeout = 3000
      $reader = [System.IO.StreamReader]::new($stream)
      $requestLine = $reader.ReadLine()
      if (-not $requestLine) { $client.Close(); continue }

      $parts = $requestLine.Split(' ')
      $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
      $path = ($rawPath -split '\?')[0]
      $path = [System.Uri]::UnescapeDataString($path)
      if ($path -eq '/') { $path = '/index.html' }

      # Resolve safely under root, blocking traversal.
      $relative = $path.TrimStart('/').Replace('/', '\')
      $full = Join-Path $root $relative
      $fullResolved = [System.IO.Path]::GetFullPath($full)

      if ($fullResolved.StartsWith([System.IO.Path]::GetFullPath($root)) -and (Test-Path $fullResolved -PathType Leaf)) {
        $bytes = [System.IO.File]::ReadAllBytes($fullResolved)
        $ext = [System.IO.Path]::GetExtension($fullResolved).ToLower()
        $type = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
        $header = "HTTP/1.1 200 OK`r`nContent-Type: $type`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
      } else {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
        $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
      }

      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($bytes, 0, $bytes.Length)
      $stream.Flush()
    } catch {
      Write-Host "request error: $_"
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
