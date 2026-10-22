@echo off
rem Double-click this file (or the "Start Mijn Duinzicht" shortcut on the desktop) to stop the other
rem Bun processes and start the portal of 1-mijn-duinzicht with bun run dev. It runs start-dev.ps1
rem next to it with the execution policy bypassed for this run only and keeps the window open so
rem the messages stay readable.
setlocal
set "START_SCRIPT=%~dp0start-dev.ps1"

if not exist "%START_SCRIPT%" (
  echo start-dev.ps1 is not next to this file. Run it from the session 2 folder.
  echo Press any key to close this window.
  pause >nul
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%START_SCRIPT%" %*
set "START_EXIT_CODE=%ERRORLEVEL%"

echo.
echo Mijn Duinzicht is not running any more. Press any key to close this window.
pause >nul
exit /b %START_EXIT_CODE%
