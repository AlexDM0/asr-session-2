<#
.SYNOPSIS
  start-mcp.ps1 - start the Duinzicht products MCP server of session 2 and connect the portal to it,
  on Windows.

.DESCRIPTION
  1. Adds .mcp.json to 1-mijn-duinzicht\, so VS Code and Copilot CLI find the server there. An
     existing .mcp.json that already has the server is left alone; one without it is not changed.
  2. Starts the server in 2-duinzicht-products-mcp\ with bun run dev, unless it already runs, and
     keeps it running until this window is closed or Ctrl+C is pressed.

  The desktop shortcut "Start MCP server" that setup.ps1 creates starts it through start-mcp.cmd.
  Works in Windows PowerShell 5.1 and PowerShell 7. Deliberately pure ASCII, so 5.1 parses it
  without a BOM.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\start-mcp.ps1
#>
[CmdletBinding()]
param()

# No global $ErrorActionPreference = 'Stop': Windows PowerShell 5.1 turns the progress a native
# command writes to stderr into a terminating error under Stop. Every native call checks
# $LASTEXITCODE instead.

$script:ServerFolder = '2-duinzicht-products-mcp'
$script:PortalFolder = '1-mijn-duinzicht'
$script:ServerName = 'duinzicht-products'
$script:ServerPort = 3333
$script:ServerUrl = "http://localhost:$script:ServerPort/mcp"
$script:McpConfiguration = @"
{
  "mcpServers": {
    "$script:ServerName": {
      "type": "http",
      "url": "$script:ServerUrl",
      "tools": ["*"]
    }
  }
}
"@
$script:StartExitCode = 0

# --- Output helpers ----------------------------------------------------------
# ASCII markers: the console font of Windows PowerShell 5.1 has no check mark glyph.
function Write-Bold($message) { Write-Host $message -ForegroundColor White }
function Write-Info($message) { Write-Host "- $message" -ForegroundColor Cyan }
function Write-Ok($message)   { Write-Host "+ $message" -ForegroundColor Green }
function Write-Warn($message) { Write-Host "! $message" -ForegroundColor Yellow }
function Write-ErrorMessage($message) { Write-Host "x $message" -ForegroundColor Red }

# Adds .mcp.json to the portal folder. Returns whether the portal can reach the server.
function Add-McpConfiguration {
    $configurationPath = Join-Path $script:PortalFolder '.mcp.json'
    if (Test-Path -LiteralPath $configurationPath) {
        $existingConfiguration = Get-Content -LiteralPath $configurationPath -Raw -ErrorAction SilentlyContinue
        if ($existingConfiguration -match [regex]::Escape("`"$script:ServerName`"")) {
            Write-Ok "$configurationPath already connects to $script:ServerName."
        } else {
            Write-Warn "$configurationPath exists without $script:ServerName, so it is left alone. Add this entry under mcpServers yourself:"
            Write-Host $script:McpConfiguration
        }
        return $true
    }
    # ASCII content, so the encoding writes no BOM in either PowerShell version.
    Set-Content -LiteralPath $configurationPath -Value $script:McpConfiguration -Encoding Ascii
    Write-Ok "Added $configurationPath, which connects VS Code and Copilot CLI to $script:ServerUrl."
    return $true
}

function Test-ServerIsRunning {
    $listeners = @(Get-NetTCPConnection -LocalPort $script:ServerPort -State Listen -ErrorAction SilentlyContinue)
    return ($listeners.Count -gt 0)
}

function Invoke-Start {
    Write-Bold 'Starting the Duinzicht products MCP server'
    foreach ($folder in @($script:ServerFolder, $script:PortalFolder)) {
        if (-not (Test-Path -LiteralPath $folder -PathType Container)) {
            Write-ErrorMessage "The folder $folder is missing. Run this script from the session 2 folder."
            $script:StartExitCode = 1; return
        }
    }
    if (-not (Add-McpConfiguration)) { $script:StartExitCode = 1; return }

    if (Test-ServerIsRunning) {
        Write-Ok "Something already listens on port $script:ServerPort; the server probably runs in another window."
        Write-Info 'Close that window first if you want to start it again here.'
        return
    }

    # A Bun installed by setup is only on the PATH of windows opened after it.
    $bunInstallRoot = if ($env:BUN_INSTALL) { $env:BUN_INSTALL } else { Join-Path $env:USERPROFILE '.bun' }
    $env:PATH = (Join-Path $bunInstallRoot 'bin') + ';' + $env:PATH
    if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
        Write-ErrorMessage 'Bun was not found. Run setup.cmd in the session 2 folder first.'
        $script:StartExitCode = 1; return
    }

    Write-Info "Starting the server at $script:ServerUrl. Leave this window open while you use it; Ctrl+C stops it."
    Write-Host ''
    Push-Location -LiteralPath $script:ServerFolder
    try {
        $global:LASTEXITCODE = 1
        & bun run dev
        $serverExitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    if ($serverExitCode -ne 0) {
        Write-ErrorMessage "The server stopped with exit code $serverExitCode. If setup did not finish, run setup.cmd first."
        $script:StartExitCode = 1
    }
}

if ($PSScriptRoot) {
    Push-Location -LiteralPath $PSScriptRoot
    try {
        Invoke-Start
    } catch {
        Write-ErrorMessage "Starting stopped unexpectedly: $($_.Exception.Message)"
        $script:StartExitCode = 1
    } finally {
        Pop-Location
    }
} else {
    Write-ErrorMessage 'Run this script as a file: double-click start-mcp.cmd in the session 2 folder.'
    $script:StartExitCode = 1
}

# Only exit when run as a script: exit in a dot-sourced file would close the caller's shell.
if ($MyInvocation.InvocationName -ne '.') { exit $script:StartExitCode }
