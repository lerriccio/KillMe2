@echo off
setlocal
set "NEON_GAME_DIR=%~dp0"
powershell -NoProfile -Command "$gamePath = Join-Path $env:NEON_GAME_DIR 'index.html'; if (!(Test-Path -LiteralPath $gamePath)) { Write-Error 'File del gioco non trovato.'; exit 1 }; $gameUri = ([System.Uri]$gamePath).AbsoluteUri + '?v=' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); $browserPath = Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'; if (Test-Path -LiteralPath $browserPath) { Start-Process -FilePath $browserPath -ArgumentList @('--new-window', $gameUri) } else { Start-Process -FilePath $gameUri }"
if errorlevel 1 pause
