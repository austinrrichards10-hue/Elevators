# Commits everything that changed and pushes it to the Elevators repo on GitHub.
# Run automatically by the Claude Code Stop hook in .claude/settings.json at the end of every turn.
# Does nothing when there's nothing new.
$ErrorActionPreference = 'Stop'
$git = Join-Path $env:ProgramFiles 'Git\cmd\git.exe'
if (-not (Test-Path $git)) { $git = 'git' }
Set-Location (Split-Path -Parent $PSScriptRoot)

& $git add -A
& $git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  $files = (& $git diff --cached --name-only) -join ', '
  if ($files.Length -gt 200) { $files = $files.Substring(0, 197) + '...' }
  & $git commit -q -m ("Auto-save " + (Get-Date -Format 'yyyy-MM-dd HH:mm')) -m ("Changed: " + $files)
  if ($LASTEXITCODE -ne 0) { throw 'git commit failed' }
}

# Push if this branch is ahead of the Elevators repo.
$ahead = & $git rev-list --count elevators/main..HEAD 2>$null
if ($LASTEXITCODE -ne 0 -or [int]$ahead -gt 0) {
  & $git push -q elevators main
  if ($LASTEXITCODE -ne 0) { throw 'git push failed' }
  Write-Output '{"systemMessage": "Committed and pushed to the Elevators repo."}'
}
