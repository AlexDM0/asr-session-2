<#
.SYNOPSIS
  setup.ps1 - turn every project folder of the session 2 repository into its own git repository and
  install what each project needs, on Windows.

.DESCRIPTION
  1. Checks that git works and that this folder is not inside another git repository
  2. Removes the .git of this folder, after asking: the clone's history goes, every file stays
  3. Spec Kit: installs its speckit-* skills in 1-mijn-duinzicht\ with specify init, through uv
  4. git init and a first commit in 1-mijn-duinzicht\ and 2-duinzicht-products-mcp\
  5. Bun: checks that it works, offers to install it when it is missing
     (winget when it is available, otherwise the official installer)
  6. bun install in 1-mijn-duinzicht\ and 2-duinzicht-products-mcp\

  One repository per project keeps the agent inside the project: Copilot CLI and worktree sessions
  work from the git root. Safe to run again: every step checks before it changes anything. Works in
  Windows PowerShell 5.1 and PowerShell 7. Deliberately pure ASCII, so 5.1 parses it without a BOM.
  setup.cmd next to this file starts it with the execution policy bypassed; setup.sh hands off to it
  on Git Bash.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1
#>
[CmdletBinding()]
param()

# No global $ErrorActionPreference = 'Stop': Windows PowerShell 5.1 turns the progress a native
# command writes to stderr into a terminating error under Stop. Every native call checks
# $LASTEXITCODE instead.

$script:ProjectFolders = @('1-mijn-duinzicht', '2-duinzicht-products-mcp')
$script:FirstCommitMessage = 'Starter'
$script:FallbackAuthorName = 'Duinzicht workshop'
$script:FallbackAuthorEmail = 'workshop@duinzicht.example'
$script:RecommendedBunVersion = '1.4.2'
$script:SpecKitProjectFolder = '1-mijn-duinzicht'
$script:SpecKitSource = 'git+https://github.com/github/spec-kit.git@v1.1.3'

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

# Runs git with the given arguments and returns whether it succeeded.
function Invoke-Git([string[]]$gitArguments) {
    $global:LASTEXITCODE = 1
    & git @gitArguments | Out-Host
    return ($LASTEXITCODE -eq 0)
}

# Returns the top folder of the repository that contains $folder, or $null when there is none.
function Get-EnclosingRepository($folder) {
    $global:LASTEXITCODE = 1
    $topFolder = (& git -C $folder rev-parse --show-toplevel 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -eq 0 -and $topFolder) { return $topFolder }
    return $null
}

function Get-GitValue($key) {
    return (& git config --get $key 2>$null | Out-String).Trim()
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

function Get-UvBinDirectory {
    return (Join-Path (Join-Path $HOME '.local') 'bin')
}

function Install-Uv {
    if (Test-CommandExists 'winget') {
        Write-Info 'Installing uv with winget (winget install --id astral-sh.uv --exact)...'
        $global:LASTEXITCODE = 1
        & winget install --id astral-sh.uv --exact
        if ($LASTEXITCODE -eq 0) { return $true }
        Write-Warn "winget did not finish (exit code $LASTEXITCODE). Trying the official installer instead."
    }
    Write-Info 'Installing uv with the official installer (irm https://astral.sh/uv/install.ps1 | iex)...'
    return (Invoke-OfficialInstaller 'https://astral.sh/uv/install.ps1')
}

# Before the first commit, so the skills are part of it. specify init keeps the starter's own
# constitution, templates and scripts; it only adds the skills and its own metadata.
function Install-SpecKitSkills {
    if (Test-Path -Path (Join-Path $script:SpecKitProjectFolder '.github\skills\speckit-specify')) {
        Write-Ok "The Spec Kit skills are already in $script:SpecKitProjectFolder."
        return $true
    }
    # A uv installed in another window is only on this window's PATH after a reopen.
    $env:PATH = (Get-UvBinDirectory) + [IO.Path]::PathSeparator + $env:PATH
    if (-not (Test-CommandExists 'uvx')) {
        Write-ErrorMessage 'uv was not found. Spec Kit installs through uv.'
        if (Confirm-Offer 'Install uv now?') {
            [void](Install-Uv)
            Update-SessionPath
            $env:PATH = (Get-UvBinDirectory) + [IO.Path]::PathSeparator + $env:PATH
        }
        if (-not (Test-CommandExists 'uvx')) {
            Write-ErrorMessage 'uv is required for Spec Kit. Install it from https://docs.astral.sh/uv/ and run setup again.'
            return $false
        }
    }
    Write-Info "Installing the Spec Kit skills in $script:SpecKitProjectFolder..."
    Push-Location -Path $script:SpecKitProjectFolder
    try {
        $global:LASTEXITCODE = 1
        $specifyOutput = & uvx --from $script:SpecKitSource specify init --here --force --non-interactive --integration copilot '--integration-options=--skills' --script ps --ignore-agent-tools 2>&1 | Out-String
        $specifySucceeded = ($LASTEXITCODE -eq 0)
    } finally {
        Pop-Location
    }
    if (-not $specifySucceeded) {
        Write-Host $specifyOutput
        Write-ErrorMessage 'specify init failed. Check your internet connection (or HTTPS_PROXY behind a proxy) and run setup again.'
        return $false
    }
    Write-Ok "The Spec Kit skills are in $script:SpecKitProjectFolder\.github\skills."
    return $true
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
    Write-Bold 'Splitting the session 2 repository into one repository per project'

    # --- 1. Checks -----------------------------------------------------------
    Write-Step '1/6 Checks'
    if (-not (Get-Command 'git' -ErrorAction SilentlyContinue)) {
        Write-ErrorMessage 'git was not found. Install it from https://git-scm.com and run setup again.'
        $script:SetupExitCode = 1; return
    }
    Write-Ok "$((& git --version | Out-String).Trim()) works."

    foreach ($projectFolder in $script:ProjectFolders) {
        if (-not (Test-Path -Path $projectFolder -PathType Container)) {
            Write-ErrorMessage "The folder $projectFolder is missing. Run this script from the session 2 repository folder."
            $script:SetupExitCode = 1; return
        }
    }

    # Nested repositories inside someone else's repository would turn up there as embedded repositories.
    $parentFolder = Split-Path -Path (Get-Location).Path -Parent
    $enclosingRepository = Get-EnclosingRepository $parentFolder
    if ($enclosingRepository) {
        Write-ErrorMessage "This folder is inside another git repository: $enclosingRepository"
        Write-Info 'Copy the folder somewhere outside that repository and run setup there.'
        $script:SetupExitCode = 1; return
    }
    Write-Ok 'This folder is not inside another git repository.'

    # --- 2. Remove the repository of this folder -------------------------------
    Write-Step '2/6 Remove the repository of this folder'
    $repositoryPath = Join-Path (Get-Location).Path '.git'
    if (Test-Path -Path $repositoryPath) {
        Write-Info 'Every project gets its own repository, so the agent stays inside its project folder.'
        Write-Info "This removes $($repositoryPath): the history of this clone goes, every file stays."
        if (-not (Confirm-Offer 'Remove it now?')) {
            Write-ErrorMessage 'Nothing changed. Run setup again when you are ready.'
            $script:SetupExitCode = 1; return
        }
        # -Force also removes the read-only object files git writes on Windows.
        Remove-Item -Path $repositoryPath -Recurse -Force
        if (Test-Path -Path $repositoryPath) {
            Write-ErrorMessage "Could not remove $repositoryPath. Close VS Code and other programs that use it, then run setup again."
            $script:SetupExitCode = 1; return
        }
        Write-Ok 'Removed.'
    } else {
        Write-Ok 'This folder is no repository any more.'
    }

    # --- 3. Spec Kit ----------------------------------------------------------
    Write-Step '3/6 Spec Kit'
    if (-not (Install-SpecKitSkills)) {
        $script:SetupExitCode = 1; return
    }

    # --- 4. One repository per project -----------------------------------------
    Write-Step '4/6 One repository per project'
    $commitIdentity = @()
    if (-not (Get-GitValue 'user.name') -or -not (Get-GitValue 'user.email')) {
        Write-Info "git has no name and email set up, so the first commits use `"$script:FallbackAuthorName`"."
        Write-Info 'Set your own for later commits:  git config --global user.name "Your Name"'
        $commitIdentity = @('-c', "user.name=$script:FallbackAuthorName", '-c', "user.email=$script:FallbackAuthorEmail")
    }

    foreach ($projectFolder in $script:ProjectFolders) {
        if (Test-Path -Path (Join-Path $projectFolder '.git')) {
            Write-Ok "$projectFolder is already its own repository."
            continue
        }
        # symbolic-ref instead of init --initial-branch, which git before 2.28 does not know.
        $succeeded = (Invoke-Git @('-C', $projectFolder, 'init', '--quiet')) -and
                     (Invoke-Git @('-C', $projectFolder, 'symbolic-ref', 'HEAD', 'refs/heads/main')) -and
                     (Invoke-Git @('-C', $projectFolder, 'add', '--all')) -and
                     (Invoke-Git (@('-C', $projectFolder) + $commitIdentity + @('commit', '--quiet', '--message', $script:FirstCommitMessage)))
        if (-not $succeeded) {
            Write-ErrorMessage "Making $projectFolder a repository failed. Read the messages above and run setup again."
            $script:SetupExitCode = 1; return
        }
        Write-Ok "$projectFolder is its own repository, with a first commit on main."
    }

    # --- 5. Bun --------------------------------------------------------------
    Write-Step '5/6 Bun'
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

    # --- 6. Dependencies -----------------------------------------------------
    Write-Step '6/6 Dependencies'
    foreach ($projectFolder in $script:ProjectFolders) {
        Write-Info "Running bun install in $projectFolder..."
        $global:LASTEXITCODE = 1
        Push-Location -Path $projectFolder
        try { & bun install } finally { Pop-Location }
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "bun install failed in $projectFolder. Check your internet connection (or HTTPS_PROXY behind a proxy) and run setup again."
            $script:SetupExitCode = 1; return
        }
    }
    Write-Ok 'Every project is installed.'

    Write-Host ''
    Write-Info 'Next: open the 1-mijn-duinzicht folder in VS Code and start the portal there with:  bun run dev'
}

if ($PSScriptRoot) {
    Push-Location -Path $PSScriptRoot
    try { Invoke-Setup } finally { Pop-Location }
} else {
    Write-ErrorMessage 'Run this script as a file: double-click setup.cmd, or run .\setup.ps1 in the session 2 repository folder.'
    $script:SetupExitCode = 1
}

# Only exit when run as a script: exit in a dot-sourced file would close the caller's shell.
if ($MyInvocation.InvocationName -ne '.') { exit $script:SetupExitCode }
