# Builds game.exe: the whole game packed into one Windows program (see launcher.cs).
# Run from the game folder:  powershell -ExecutionPolicy Bypass -File tools\build-exe.ps1
$ErrorActionPreference = 'Stop'
$game = Split-Path -Parent $PSScriptRoot
$work = Join-Path $env:TEMP 'frostmourne-build'
if (Test-Path $work) { Remove-Item -Recurse -Force $work }
$stage = Join-Path $work 'stage'
New-Item -ItemType Directory -Force $stage | Out-Null
foreach ($item in @('index.html', 'README.md', 'src', 'models', 'assets', 'phone-wallpapers')) { Copy-Item -Recurse (Join-Path $game $item) $stage }
$zip = Join-Path $work 'game.zip'
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Push-Location $game
$ver = (git rev-parse --short HEAD).Trim() + '-' + (Get-Date -Format 'yyyyMMddHHmm')
Pop-Location
(Get-Content (Join-Path $PSScriptRoot 'launcher.cs') -Raw).Replace('__VERSION__', $ver) | Set-Content -Encoding UTF8 (Join-Path $work 'launcher.cs')
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $csc /nologo /target:winexe /optimize+ "/out:$game\game.exe" "/resource:$zip,game.zip" "/win32icon:$PSScriptRoot\game.ico" /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll /r:System.Windows.Forms.dll (Join-Path $work 'launcher.cs')
if ($LASTEXITCODE -ne 0) { throw 'The compiler failed.' }
"Built game.exe ($ver)"
