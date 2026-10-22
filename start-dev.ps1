<#
.SYNOPSIS
  start-dev.ps1 - stop the other Bun processes and start the Mijn Duinzicht portal of session 2 with
  bun run dev, on Windows.

.DESCRIPTION
  1. Stops every Bun process with everything it started, so an earlier bun run dev in another
     window or a VS Code terminal releases its ports. The MCP server on port 3333 keeps running.
  2. Starts bun run dev in 1-mijn-duinzicht\, which starts the API and the portal together and
     opens http://localhost:3000, and keeps it running until this window is closed or Ctrl+C is
     pressed.

  The desktop shortcut "Start Mijn Duinzicht" that setup.ps1 creates starts it through
  start-dev.cmd. Works in Windows PowerShell 5.1 and PowerShell 7. Deliberately pure ASCII, so 5.1
  parses it without a BOM.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\start-dev.ps1
#>
[CmdletBinding()]
param()

# No global $ErrorActionPreference = 'Stop': Windows PowerShell 5.1 turns the progress a native
# command writes to stderr into a terminating error under Stop. Every native call checks
# $LASTEXITCODE instead.

$script:PortalFolder = '1-mijn-duinzicht'
$script:PortalUrl = 'http://localhost:3000'
# start-mcp.ps1 starts the MCP server on this port; it keeps running.
$script:McpServerPort = 3333
$script:StartExitCode = 0

# --- Output helpers ----------------------------------------------------------
# ASCII markers: the console font of Windows PowerShell 5.1 has no check mark glyph.
function Write-Bold($message) { Write-Host $message -ForegroundColor White }
function Write-Info($message) { Write-Host "- $message" -ForegroundColor Cyan }
function Write-Ok($message)   { Write-Host "+ $message" -ForegroundColor Green }
function Write-Warn($message) { Write-Host "! $message" -ForegroundColor Yellow }
function Write-ErrorMessage($message) { Write-Host "x $message" -ForegroundColor Red }

# Every process, from one snapshot, with its id, parent id and name.
function Get-ProcessSnapshot {
    $processSnapshot = @()
    foreach ($process in @(Get-CimInstance -ClassName Win32_Process -ErrorAction SilentlyContinue)) {
        $processSnapshot += [pscustomobject]@{
            Id       = [int]$process.ProcessId
            ParentId = [int]$process.ParentProcessId
            Name     = [string]$process.Name
        }
    }
    return ,$processSnapshot
}

# The given processes and everything they started.
function Get-ProcessTreeIds($processSnapshot, $processIds) {
    $treeIds = @($processIds)
    $addedIds = @($processIds)
    while ($addedIds.Count -gt 0) {
        $addedIds = @($processSnapshot | Where-Object { $addedIds -contains $_.ParentId -and $treeIds -notcontains $_.Id } | ForEach-Object { $_.Id })
        $treeIds += $addedIds
    }
    return ,$treeIds
}

# The given process and the processes that started it, up to the first one with another name than
# $name. For the MCP server: the bun that listens and the bun run dev above it.
function Get-AncestorIds($processSnapshot, $processId, $name) {
    $ancestorIds = @($processId)
    $currentId = $processId
    for ($depth = 0; $depth -lt 16; $depth++) {
        $parentId = ($processSnapshot | Where-Object { $_.Id -eq $currentId } | Select-Object -First 1).ParentId
        $parentProcess = $processSnapshot | Where-Object { $_.Id -eq $parentId } | Select-Object -First 1
        if (-not $parentProcess -or $parentProcess.Name -ine $name -or $ancestorIds -contains $parentId) { break }
        $ancestorIds += $parentId
        $currentId = $parentId
    }
    return ,$ancestorIds
}

# The MCP server: the processes that listen on its port, the bun run dev that started them and
# everything under it.
function Get-McpServerProcessIds($processSnapshot) {
    $listenerIds = @(Get-NetTCPConnection -LocalPort $script:McpServerPort -State Listen -ErrorAction SilentlyContinue | ForEach-Object { [int]$_.OwningProcess } | Select-Object -Unique)
    $serverIds = @()
    foreach ($listenerId in $listenerIds) {
        $serverIds += Get-AncestorIds $processSnapshot $listenerId 'bun.exe'
    }
    return ,(Get-ProcessTreeIds $processSnapshot $serverIds)
}

# Stops every Bun process with everything it started, except the MCP server and this script.
function Stop-OtherBunProcesses {
    $processSnapshot = Get-ProcessSnapshot
    $keepIds = @(Get-McpServerProcessIds $processSnapshot)
    $bunIds = @($processSnapshot | Where-Object { $_.Name -ieq 'bun.exe' -and $keepIds -notcontains $_.Id } | ForEach-Object { $_.Id })
    $stopIds = @(Get-ProcessTreeIds $processSnapshot $bunIds | Where-Object { $keepIds -notcontains $_ -and $_ -ne $PID })
    if ($stopIds.Count -eq 0) {
        Write-Ok 'No other Bun processes are running.'
        return
    }
    Write-Info "Stopping $($stopIds.Count) Bun process(es) and what they started..."
    foreach ($stopId in $stopIds) { Stop-Process -Id $stopId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
    Write-Ok 'Stopped the other Bun processes.'
}

function Invoke-Start {
    Write-Bold 'Starting Mijn Duinzicht'
    if (-not (Test-Path -LiteralPath $script:PortalFolder -PathType Container)) {
        Write-ErrorMessage "The folder $script:PortalFolder is missing. Run this script from the session 2 folder."
        $script:StartExitCode = 1; return
    }

    # A Bun installed by setup is only on the PATH of windows opened after it.
    $bunInstallRoot = if ($env:BUN_INSTALL) { $env:BUN_INSTALL } else { Join-Path $env:USERPROFILE '.bun' }
    $env:PATH = (Join-Path $bunInstallRoot 'bin') + ';' + $env:PATH
    if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
        Write-ErrorMessage 'Bun was not found. Run setup.cmd in the session 2 folder first.'
        $script:StartExitCode = 1; return
    }

    Stop-OtherBunProcesses
    if (@(Get-NetTCPConnection -LocalPort $script:McpServerPort -State Listen -ErrorAction SilentlyContinue).Count -gt 0) {
        Write-Ok "The MCP server on port $script:McpServerPort keeps running."
    }

    Write-Info "Starting the portal at $script:PortalUrl. Leave this window open while you use it; Ctrl+C stops it."
    Write-Host ''
    Push-Location -LiteralPath $script:PortalFolder
    try {
        $global:LASTEXITCODE = 1
        & bun run dev
        $portalExitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    if ($portalExitCode -ne 0) {
        Write-ErrorMessage "The portal stopped with exit code $portalExitCode. If setup did not finish, run setup.cmd first."
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
    Write-ErrorMessage 'Run this script as a file: double-click start-dev.cmd in the session 2 folder.'
    $script:StartExitCode = 1
}

# Only exit when run as a script: exit in a dot-sourced file would close the caller's shell.
if ($MyInvocation.InvocationName -ne '.') { exit $script:StartExitCode }
