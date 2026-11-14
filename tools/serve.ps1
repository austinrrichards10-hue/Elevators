# A tiny static file server for previewing the game in a browser.
#   powershell -ExecutionPolicy Bypass -File tools\serve.ps1 [port]
# It also serves pages "cross-origin isolated" (so the voice generator can use several CPU
# threads), and lets tools/voicegen.html save what it makes: POST /__save/models/<file>.
param([int]$Port = 8124)
$root = Split-Path -Parent $PSScriptRoot
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json'; '.png'='image/png'; '.jpg'='image/jpeg'; '.svg'='image/svg+xml'; '.mp3'='audio/mpeg'; '.ogg'='audio/ogg'; '.wav'='audio/wav'; '.mp4'='video/mp4'; '.glb'='model/gltf-binary'; '.ico'='image/x-icon' }
$models = [IO.Path]::GetFullPath((Join-Path $root 'models'))
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $res.Headers.Add('Cross-Origin-Opener-Policy', 'same-origin')
    $res.Headers.Add('Cross-Origin-Embedder-Policy', 'credentialless')
    $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
    if ($req.HttpMethod -eq 'POST' -and $rel.StartsWith('__save/')) {
      # Only ever writes inside models/.
      $path = [IO.Path]::GetFullPath((Join-Path $root $rel.Substring(7)))
      if ($path.StartsWith($models + [IO.Path]::DirectorySeparatorChar)) {
        $fs = [IO.File]::Create($path)
        $req.InputStream.CopyTo($fs)
        $fs.Close()
        $res.StatusCode = 204
      } else { $res.StatusCode = 403 }
    } else {
      if ($rel -eq '' -or $rel.EndsWith('/')) { $rel += 'index.html' }
      $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
      if ($path.StartsWith($root) -and (Test-Path $path -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($path)
        $ext = [IO.Path]::GetExtension($path).ToLower()
        $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
        $res.Headers.Add('Cache-Control', 'no-store')
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else { $res.StatusCode = 404 }
    }
  } catch { $res.StatusCode = 500 }
  $res.Close()
}
