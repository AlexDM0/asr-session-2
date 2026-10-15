@echo off
rem Double-click this file (or the "Start MCP server" shortcut on the desktop) to start the
rem Duinzicht products MCP server and connect 1-mijn-duinzicht to it. It runs start-mcp.ps1 next to
rem it with the execution policy bypassed for this run only and keeps the window open so the
rem messages stay readable.
setlocal
set "START_SCRIPT=%~dp0start-mcp.ps1"

if not exist "%START_SCRIPT%" (
  echo start-mcp.ps1 is not next to this file. Run it from the session 2 folder.
  echo Press any key to close this window.
  pause >nul
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%START_SCRIPT%" %*
set "START_EXIT_CODE=%ERRORLEVEL%"

echo.
echo The MCP server is not running any more. Press any key to close this window.
pause >nul
exit /b %START_EXIT_CODE%
