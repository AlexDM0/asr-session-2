<#
.SYNOPSIS
  setup.ps1 - get the Mijn Duinzicht portal running on Windows.

.DESCRIPTION
  1. Bun: checks that it works, offers to install it when it is missing
     (winget when it is available, otherwise the official installer)
  2. bun install
  3. bun run dev in the foreground: the portal on http://localhost:3000

  Safe to run again: every step checks before it changes anything. Works in Windows PowerShell 5.1
  and PowerShell 7. Deliberately pure ASCII, so 5.1 parses it without a BOM. setup.cmd next to this
  file starts it with the execution policy bypassed; setup.sh hands off to it on Git Bash.

.PARAMETER NoStart
  Stop after bun install; start the portal yourself with `bun run dev`.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -NoStart
#>
[CmdletBinding()]
param(
    [switch]$NoStart
)

# No global $ErrorActionPreference = 'Stop': Windows PowerShell 5.1 turns the progress a native
# command writes to stderr into a terminating error under Stop. Every native call checks
# $LASTEXITCODE instead.

$script:ProjectTitle = 'the Mijn Duinzicht portal'
$script:ProjectPackageName = 'mijn-duinzicht'
$script:RecommendedBunVersion = '1.4.2'
$script:RunningPort = if ($env:DUINZICHT_WEB_PORT) { $env:DUINZICHT_WEB_PORT } else { '3000' }
$script:RunningMessage = "The portal runs on http://localhost:$script:RunningPort."

# Windows PowerShell 5.1 can still default to TLS 1.0, which bun.sh and GitHub refuse.
$script:ForceTls12Command = '[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch { }

# --- Output helpers ----------------------------------------------------------
# Glyphs are built from code points so the source stays pure ASCII.
$script:BulletGlyph = [char]0x2022
$script:CheckGlyph  = [char]0x2713
$script:CrossGlyph  = [char]0x2717
$script:SetupExitCode = 0

function Write-Bold($message) { Write-Host $message -ForegroundColor White }
function Write-Step($message) { Write-Host ''; Write-Host $message -ForegroundColor White }
function Write-Info($message) { Write-Host "$script:BulletGlyph $message" -ForegroundColor Cyan }
function Write-Ok($message)   { Write-Host "$script:CheckGlyph $message" -ForegroundColor Green }
function Write-Warn($message) { Write-Host "! $message" -ForegroundColor Yellow }
function Write-ErrorMessage($message) { Write-Host "$script:CrossGlyph $message" -ForegroundColor Red }

# Ask a yes/no question; anything but y counts as no.
function Confirm-Offer($question) {
    $answer = Read-Host "  $question [y/N]"
    return ($answer -eq 'y' -or $answer -eq 'Y')
}

function Test-CommandExists($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Show-BunInstallHelp {
    Write-Host ''
    Write-Info 'Install Bun yourself, then open a new window and run setup again:'
    Write-Host '    winget install --id Oven-sh.Bun --exact'
    Write-Info 'or, without winget:'
    Write-Host '    powershell -c "irm bun.sh/install.ps1 | iex"'
    Write-Info 'More information: https://bun.sh/docs/installation'
}

function Get-BunBinDirectory {
    $bunInstallRoot = if ($env:BUN_INSTALL) { $env:BUN_INSTALL } else { Join-Path $HOME '.bun' }
    return (Join-Path $bunInstallRoot 'bin')
}

# Installers write the user PATH in the registry; this window only sees it after a reopen, so read
# it back. Bun's own installer directory goes first.
function Update-SessionPath {
    $pathEntries = @(
        (Get-BunBinDirectory),
        $env:PATH,
        [Environment]::GetEnvironmentVariable('Path', 'Machine'),
        [Environment]::GetEnvironmentVariable('Path', 'User')
    ) | Where-Object { $_ }
    $env:PATH = $pathEntries -join [IO.Path]::PathSeparator
}

# Run a downloaded installer in a child PowerShell: installer scripts set their own
# ErrorActionPreference and may call exit, which must not end this script.
function Invoke-OfficialInstaller($installerUrl) {
    $powerShellExecutable = (Get-Process -Id $PID).Path
    $global:LASTEXITCODE = 1
    & $powerShellExecutable -NoProfile -ExecutionPolicy Bypass -Command "$script:ForceTls12Command; irm $installerUrl | iex"
    return ($LASTEXITCODE -eq 0)
}

function Install-Bun {
    if (Test-CommandExists 'winget') {
        Write-Info 'Installing Bun with winget (winget install --id Oven-sh.Bun --exact)...'
        $global:LASTEXITCODE = 1
        & winget install --id Oven-sh.Bun --exact
        if ($LASTEXITCODE -eq 0) { return $true }
        Write-Warn "winget did not finish (exit code $LASTEXITCODE). Trying the official installer instead."
    }
    Write-Info 'Installing Bun with the official installer (irm https://bun.sh/install.ps1 | iex)...'
    # Bun's install.ps1 reports a failure with return 1, so the child PowerShell still exits 0.
    $installerExitedCleanly = Invoke-OfficialInstaller 'https://bun.sh/install.ps1'
    return ($installerExitedCleanly -and (Test-Path (Join-Path (Get-BunBinDirectory) 'bun.exe')))
}

# Returns the version bun reports, or $null when bun does not run.
function Get-BunVersion {
    try {
        # Reset first so a stale 0 from an earlier call cannot pass for success.
        $global:LASTEXITCODE = 1
        $bunOutput = (& bun --version 2>&1 | Out-String)
        if ($LASTEXITCODE -eq 0 -and $bunOutput.Trim()) {
            return ($bunOutput -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -First 1).Trim()
        }
    } catch { }
    return $null
}

function Invoke-Setup {
    Write-Bold "Setting up $script:ProjectTitle (windows)"

    # --- 1. Bun --------------------------------------------------------------
    Write-Step '1/3 Bun'
    $bunBinDirectory = Get-BunBinDirectory
    # A Bun installed in another window is only on this window's PATH after a reopen.
    if (Test-Path $bunBinDirectory) { $env:PATH = $bunBinDirectory + [IO.Path]::PathSeparator + $env:PATH }

    if (-not (Test-CommandExists 'bun')) {
        Write-ErrorMessage 'Bun was not found.'
        $installQuestion = if (Test-CommandExists 'winget') {
            'Install Bun now with winget (winget install --id Oven-sh.Bun --exact)?'
        } else {
            'Install Bun now with the official installer (irm https://bun.sh/install.ps1 | iex)?'
        }
        if (-not (Confirm-Offer $installQuestion)) {
            Write-ErrorMessage 'Bun is required.'
            Show-BunInstallHelp
            $script:SetupExitCode = 1; return
        }
        if (-not (Install-Bun)) {
            Write-ErrorMessage 'The Bun installer did not finish.'
            Show-BunInstallHelp
            $script:SetupExitCode = 1; return
        }
        Update-SessionPath
        if (-not (Test-CommandExists 'bun')) {
            Write-ErrorMessage 'Bun was installed but this window cannot find it. Close it, open a new one and run setup again.'
            $script:SetupExitCode = 1; return
        }
    }

    $bunVersion = Get-BunVersion
    if (-not $bunVersion) {
        Write-ErrorMessage "Found bun at $((Get-Command bun).Source), but it does not run. The install looks broken."
        Show-BunInstallHelp
        $script:SetupExitCode = 1; return
    }
    Write-Ok "Bun $bunVersion works ($((Get-Command bun).Source))."

    $bunReleaseVersion = $bunVersion -replace '-.*$', ''
    $parsedBunVersion = $null
    if ([version]::TryParse($bunReleaseVersion, [ref]$parsedBunVersion) -and
        $parsedBunVersion -lt [version]$script:RecommendedBunVersion) {
        Write-Warn "Bun $script:RecommendedBunVersion or newer is recommended. Update it with:  bun upgrade"
    }

    # --- 2. Dependencies -----------------------------------------------------
    Write-Step '2/3 Dependencies'
    Write-Info 'Running bun install...'
    $global:LASTEXITCODE = 1
    & bun install
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage 'bun install failed. Check your internet connection (or HTTPS_PROXY behind a proxy) and run setup again.'
        $script:SetupExitCode = 1; return
    }
    Write-Ok 'Dependencies installed.'

    # --- 3. Start ------------------------------------------------------------
    Write-Step "3/3 Start $script:ProjectTitle"
    if ($NoStart) {
        Write-Info 'Skipped (-NoStart). Start it yourself with:'
        Write-Host '    bun run dev'
        return
    }

    Write-Info "Starting bun run dev. $script:RunningMessage"
    Write-Info 'Leave this window open while you work. Stop it with Ctrl+C.'
    Write-Host ''
    $global:LASTEXITCODE = 1
    & bun run dev
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "bun run dev stopped with exit code $LASTEXITCODE. Read the messages above; a port that is in use means it already runs in another window."
        $script:SetupExitCode = 1
    }
}

# Run from this script's own folder. When $PSScriptRoot is empty (pasted or dot-sourced), accept
# the current folder only when it is this project.
$startingFolderIsProject = $false
if (-not $PSScriptRoot -and (Test-Path 'package.json')) {
    try { $startingFolderIsProject = ((Get-Content 'package.json' -Raw | ConvertFrom-Json).name -eq $script:ProjectPackageName) } catch { }
}
if ($PSScriptRoot -or $startingFolderIsProject) {
    if ($PSScriptRoot) { Push-Location -Path $PSScriptRoot } else { Push-Location -Path (Get-Location) }
    try { Invoke-Setup } finally { Pop-Location }
} else {
    Write-ErrorMessage "Run this script from the $script:ProjectPackageName folder."
    $script:SetupExitCode = 1
}

# Only exit when run as a script: exit in a dot-sourced file would close the caller's shell.
if ($MyInvocation.InvocationName -ne '.') { exit $script:SetupExitCode }
