<#
.SYNOPSIS
  setup.ps1 - turn every project folder of the session 2 repository into its own git repository and
  install what each project needs, on Windows. Runs unattended.

.DESCRIPTION
  1. Checks that git works and that this folder is not inside another git repository, and stops
     running Node.js processes that would hold project files open
  2. Removes the .git of this folder when it holds no work that exists nowhere else
  3. Python 3.13 as the default python, and Spec Kit's specify CLI on it, both through uv; then the
     speckit-* skills in 1-mijn-duinzicht\ with specify init
  4. git init and a first commit in 1-mijn-duinzicht\ and 2-duinzicht-products-mcp\
  5. Bun: checks that it works, installs a pinned Bun release from GitHub when it is missing
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
# The tag archive instead of git+https: uv downloads it itself, so neither git nor git's proxy and
# certificate settings are needed.
$script:SpecKitSource = 'https://github.com/github/spec-kit/archive/refs/tags/v1.1.3.zip'
# specify-cli runs on this Python, not on whatever uv finds first: its dependencies, PyYAML among
# them, have wheels for it, so nothing has to be built from source.
$script:PythonVersion = '3.13'
# Pinned uv and Bun releases, checked against their published SHA-256, instead of piping installer
# scripts into iex: deterministic, and not the download pattern endpoint security software blocks.
$script:UvVersion = '0.11.29'
$script:UvArchiveChecksums = @{
    'x86_64'  = 'a047d55651bc3e0ca24595b25ec4cfcb10f9dca9fb56514e661269b37d4fae68'
    'aarch64' = '55b597ae81bc29531a7c352a1431a8a73cc2755d7a5b9ec454580cbe02e5154f'
}
# The baseline build runs on processors without AVX2, which virtual desktops do not always expose.
$script:BunArchiveChecksums = @{
    'x64-baseline' = '78c221c2376f79731ccf4e4af0b3bb46d81fefa3296c5abee09ad8a1b21e68c6'
    'aarch64'      = 'a7a16b876a305fd1029c66dbd27007b4f6112ae896532f675878731a21e50cfd'
}
# AppLocker and WDAC run scripts from a user folder in ConstrainedLanguage, where .NET calls fail.
$script:IsFullLanguage = ($ExecutionContext.SessionState.LanguageMode -eq 'FullLanguage')
$script:SystemProxy = $null
# The PATH this window started with, before this script added anything to it.
$script:StartingPath = $env:PATH
$script:SetupExitCode = 0

# --- Output helpers ----------------------------------------------------------
# ASCII markers: the console font of Windows PowerShell 5.1 has no check mark glyph.
function Write-Bold($message) { Write-Host $message -ForegroundColor White }
function Write-Step($message) { Write-Host ''; Write-Host $message -ForegroundColor White }
function Write-Info($message) { Write-Host "- $message" -ForegroundColor Cyan }
function Write-Ok($message)   { Write-Host "+ $message" -ForegroundColor Green }
function Write-Warn($message) { Write-Host "! $message" -ForegroundColor Yellow }
function Write-ErrorMessage($message) { Write-Host "x $message" -ForegroundColor Red }

# Runs git with the given arguments, shows its output and returns whether it succeeded.
function Invoke-Git([string[]]$gitArguments) {
    $global:LASTEXITCODE = 1
    & git @gitArguments | Out-Host
    return ($LASTEXITCODE -eq 0)
}

# Runs git and returns @{ Succeeded; Output } with stdout and stderr as one English text.
function Get-GitResult([string[]]$gitArguments) {
    $previousLanguage = $env:LC_ALL
    $env:LC_ALL = 'C'
    try {
        $global:LASTEXITCODE = 1
        $gitOutput = (& git @gitArguments 2>&1 | ForEach-Object { "$_" } | Out-String).Trim()
        return @{ Succeeded = ($LASTEXITCODE -eq 0); Output = $gitOutput }
    } finally {
        $env:LC_ALL = $previousLanguage
    }
}

function Get-GitValue($key) {
    $configResult = Get-GitResult @('config', '--get', $key)
    if ($configResult.Succeeded) { return $configResult.Output }
    return ''
}

function Test-HasFirstCommit($projectFolder) {
    return (Get-GitResult @('-C', $projectFolder, 'rev-parse', '--verify', '--quiet', 'HEAD')).Succeeded
}

# Why removing the .git of this folder would lose work, or $null when it is safe. Any git error
# counts as unsafe, so a repository git cannot read is never removed blindly.
function Get-WorkOnlyInThisClone {
    $statusResult = Get-GitResult @('status', '--porcelain')
    if (-not $statusResult.Succeeded) { return "git cannot read this repository:`n$($statusResult.Output)" }
    if ($statusResult.Output) { return 'It has changed or new files.' }
    $stashResult = Get-GitResult @('stash', 'list')
    if (-not $stashResult.Succeeded) { return "git cannot read the stashes of this repository:`n$($stashResult.Output)" }
    if ($stashResult.Output) { return 'It has stashed changes.' }
    if ((Get-GitResult @('rev-parse', '--verify', '--quiet', 'HEAD')).Succeeded -and
        (Get-GitResult @('rev-list', 'HEAD', '--not', '--remotes')).Output) {
        return 'It has commits that are on no remote.'
    }
    return $null
}

# Renames first, so a folder that antivirus or OneDrive keeps busy cannot stop setup halfway.
function Remove-RootRepository($repositoryPath) {
    $removedName = '.git-removed-' + (Get-Date -Format 'yyyyMMddHHmmss')
    try {
        Rename-Item -LiteralPath $repositoryPath -NewName $removedName -ErrorAction Stop
    } catch {
        return $false
    }
    $removedPath = Join-Path (Split-Path -Parent $repositoryPath) $removedName
    Remove-Item -LiteralPath $removedPath -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $removedPath) { & cmd.exe /d /c rmdir /s /q "`"$removedPath`"" 2>$null | Out-Null }
    if (Test-Path -LiteralPath $removedPath) {
        Write-Info "Windows still holds $removedName open; delete that folder later, setup does not need it."
    }
    return $true
}

function Test-CommandExists($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

# A dev server or test runner left running in another window holds files in the project folders
# open, so removing .git and bun install fail. Stops every node.exe this account may stop, if any.
function Stop-NodeProcesses {
    $nodeProcesses = @(Get-Process -Name 'node' -ErrorAction SilentlyContinue)
    if ($nodeProcesses.Count -eq 0) {
        Write-Ok 'No Node.js processes are running.'
        return
    }
    Write-Info "Stopping $($nodeProcesses.Count) Node.js process(es), so they release the project files..."
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    $remainingProcesses = @(Get-Process -Name 'node' -ErrorAction SilentlyContinue)
    if ($remainingProcesses.Count -gt 0) {
        Write-Warn "$($remainingProcesses.Count) Node.js process(es) could not be stopped; close those windows yourself if setup fails."
    } else {
        Write-Ok 'Stopped the running Node.js processes.'
    }
}

function Show-BunInstallHelp {
    Write-Host ''
    Write-Info 'Install Bun yourself, then open a new window and run setup again:'
    Write-Host '    winget install --id Oven-sh.Bun --exact'
    Write-Info 'More information: https://bun.sh/docs/installation'
}

function Show-LockedDownHelp($whatIsMissing) {
    Write-ErrorMessage "PowerShell runs in a locked-down mode on this computer ($($ExecutionContext.SessionState.LanguageMode)), so setup cannot install $whatIsMissing."
    Write-Info "Ask IT to install $whatIsMissing (it is on the preinstall list of the training), then run setup again."
}

function Get-BunBinDirectory {
    $bunInstallRoot = if ($env:BUN_INSTALL) { $env:BUN_INSTALL } else { Join-Path $env:USERPROFILE '.bun' }
    return (Join-Path $bunInstallRoot 'bin')
}

# Where the official installer and this script put uv. USERPROFILE, not $HOME: in Windows PowerShell
# 5.1 $HOME is the home folder from Active Directory, often a network drive, which uv does not use.
function Get-UvBinDirectory {
    if ($env:UV_INSTALL_DIR) { return $env:UV_INSTALL_DIR }
    if ($env:XDG_BIN_HOME) { return $env:XDG_BIN_HOME }
    return (Join-Path (Join-Path $env:USERPROFILE '.local') 'bin')
}

# The PATH a new window starts with, read from the registry with cmdlets that also work when
# PowerShell is locked down.
function Get-PersistedPath {
    $machinePath = (Get-ItemProperty -LiteralPath 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' -Name Path -ErrorAction SilentlyContinue).Path
    $userPath = (Get-ItemProperty -LiteralPath 'HKCU:\Environment' -Name Path -ErrorAction SilentlyContinue).Path
    return (@($machinePath, $userPath) | Where-Object { $_ }) -join ';'
}

# Installers write the user PATH in the registry; this window only sees it after a reopen, so read
# it back. The install directories go first.
function Update-SessionPath {
    $pathEntries = @((Get-BunBinDirectory), (Get-UvBinDirectory), $env:PATH, (Get-PersistedPath)) | Where-Object { $_ }
    $env:PATH = $pathEntries -join ';'
}

function Test-PathListContains($directory, $pathList) {
    if (-not $directory -or -not $pathList) { return $false }
    $normalizedDirectory = $directory.TrimEnd('\', '/')
    foreach ($entry in ($pathList -split ';')) {
        if ($entry -and $entry.TrimEnd('\', '/') -ieq $normalizedDirectory) { return $true }
    }
    return $false
}

# Adds $directory to the user PATH in the registry, keeping %VARIABLE% entries as they are, and
# tells Windows so windows opened from now on see it.
function Add-UserPathEntry($directory) {
    $environmentKey = Get-Item -LiteralPath 'HKCU:\Environment'
    $userPath = [string]$environmentKey.GetValue('Path', '', 'DoNotExpandEnvironmentNames')
    if (Test-PathListContains $directory $userPath) { return }
    $newUserPath = if ($userPath) { $userPath.TrimEnd(';') + ';' + $directory } else { $directory }
    Set-ItemProperty -LiteralPath 'HKCU:\Environment' -Name Path -Value $newUserPath -Type ExpandString
    # Clearing a variable through .NET broadcasts the environment change that Set-ItemProperty does not.
    [Environment]::SetEnvironmentVariable('DuinzichtSetupPathRefresh', $null, 'User')
}

# uv, Bun and git only read HTTPS_PROXY, not the Windows proxy settings, so copy those over. The
# credentials let a proxy that signs in with the Windows account accept the downloads.
function Initialize-SystemProxy {
    if (-not $script:IsFullLanguage) { return }
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        [Net.WebRequest]::DefaultWebProxy.Credentials = [Net.CredentialCache]::DefaultNetworkCredentials
        if ($env:HTTPS_PROXY -or $env:https_proxy) { return }
        $probeAddress = [uri]'https://registry.npmjs.org'
        $proxyAddress = [Net.WebRequest]::GetSystemWebProxy().GetProxy($probeAddress)
        if ($proxyAddress -and $proxyAddress.Host -ne $probeAddress.Host) {
            $script:SystemProxy = $proxyAddress.AbsoluteUri
            $env:HTTPS_PROXY = $script:SystemProxy
            $env:HTTP_PROXY = $script:SystemProxy
            Write-Info "Using the Windows proxy $script:SystemProxy."
        }
    } catch { }
}

function Invoke-Download($address, $destination) {
    $downloadArguments = @{ Uri = $address; OutFile = $destination; UseBasicParsing = $true }
    if ($script:SystemProxy) {
        $downloadArguments.Proxy = $script:SystemProxy
        $downloadArguments.ProxyUseDefaultCredentials = $true
    }
    # The progress bar of Windows PowerShell 5.1 slows a download down many times over.
    $previousProgressPreference = $ProgressPreference
    $ProgressPreference = 'SilentlyContinue'
    try { Invoke-WebRequest @downloadArguments -ErrorAction Stop } finally { $ProgressPreference = $previousProgressPreference }
}

function Get-ProcessorArchitecture {
    if ($env:PROCESSOR_ARCHITEW6432) { return $env:PROCESSOR_ARCHITEW6432 }
    return $env:PROCESSOR_ARCHITECTURE
}

# Downloads $archiveAddress, checks its SHA-256 against $expectedChecksum and unpacks it into a
# fresh temporary folder, which it returns; $null on any failure.
function Expand-VerifiedDownload($archiveAddress, $expectedChecksum) {
    $archiveName = Split-Path -Leaf $archiveAddress
    $downloadFolder = Join-Path ([IO.Path]::GetTempPath()) ('duinzicht-setup-' + [guid]::NewGuid())
    New-Item -ItemType Directory -Path $downloadFolder -Force | Out-Null
    try {
        $archivePath = Join-Path $downloadFolder $archiveName
        Write-Info "Downloading $archiveName from GitHub..."
        Invoke-Download $archiveAddress $archivePath
        if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -ine $expectedChecksum) {
            Write-ErrorMessage "The downloaded $archiveName does not match its published checksum. A proxy may have changed it."
        } else {
            $unpackedFolder = Join-Path $downloadFolder 'unpacked'
            Expand-Archive -LiteralPath $archivePath -DestinationPath $unpackedFolder -Force
            return $unpackedFolder
        }
    } catch {
        Write-ErrorMessage "Downloading $archiveName failed: $($_.Exception.Message)"
    }
    Remove-Item -LiteralPath $downloadFolder -Recurse -Force -ErrorAction SilentlyContinue
    return $null
}

# Installs the pinned uv release where the official installer puts it. Returns whether uv.exe is there.
function Install-PinnedUv {
    $uvArchitecture = switch (Get-ProcessorArchitecture) { 'AMD64' { 'x86_64' } 'ARM64' { 'aarch64' } default { $null } }
    if (-not $uvArchitecture) {
        Write-ErrorMessage "uv has no Windows release for this processor ($(Get-ProcessorArchitecture))."
        return $false
    }
    $archiveAddress = "https://github.com/astral-sh/uv/releases/download/$script:UvVersion/uv-$uvArchitecture-pc-windows-msvc.zip"
    $unpackedFolder = Expand-VerifiedDownload $archiveAddress $script:UvArchiveChecksums[$uvArchitecture]
    if (-not $unpackedFolder) { return $false }
    try {
        $uvBinDirectory = Get-UvBinDirectory
        New-Item -ItemType Directory -Path $uvBinDirectory -Force | Out-Null
        Copy-Item -Path (Join-Path $unpackedFolder '*.exe') -Destination $uvBinDirectory -Force
        Add-UserPathEntry $uvBinDirectory
        return (Test-Path -LiteralPath (Join-Path $uvBinDirectory 'uv.exe'))
    } finally {
        Remove-Item -LiteralPath (Split-Path -Parent $unpackedFolder) -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Installs the pinned Bun release where the official installer puts it, bunx included. Returns
# whether bun.exe is there.
function Install-PinnedBun {
    $bunArchitecture = switch (Get-ProcessorArchitecture) { 'AMD64' { 'x64-baseline' } 'ARM64' { 'aarch64' } default { $null } }
    if (-not $bunArchitecture) {
        Write-ErrorMessage "Bun has no Windows release for this processor ($(Get-ProcessorArchitecture))."
        return $false
    }
    $archiveAddress = "https://github.com/oven-sh/bun/releases/download/bun-v$script:RecommendedBunVersion/bun-windows-$bunArchitecture.zip"
    $unpackedFolder = Expand-VerifiedDownload $archiveAddress $script:BunArchiveChecksums[$bunArchitecture]
    if (-not $unpackedFolder) { return $false }
    try {
        $bunBinDirectory = Get-BunBinDirectory
        New-Item -ItemType Directory -Path $bunBinDirectory -Force | Out-Null
        $unpackedBun = Join-Path (Join-Path $unpackedFolder "bun-windows-$bunArchitecture") 'bun.exe'
        Copy-Item -LiteralPath $unpackedBun -Destination (Join-Path $bunBinDirectory 'bun.exe') -Force
        # bun.exe acts as bunx when it runs under that name.
        Copy-Item -LiteralPath $unpackedBun -Destination (Join-Path $bunBinDirectory 'bunx.exe') -Force
        Add-UserPathEntry $bunBinDirectory
        return (Test-Path -LiteralPath (Join-Path $bunBinDirectory 'bun.exe'))
    } finally {
        Remove-Item -LiteralPath (Split-Path -Parent $unpackedFolder) -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Bun brings its own certificate bundle. A TLS-inspecting proxy re-signs traffic with a company
# certificate that only the Windows certificate store trusts, so hand bun those root certificates.
function Export-SystemCertificatesForBun {
    if ($env:NODE_EXTRA_CA_CERTS -or -not $script:IsFullLanguage) { return }
    try {
        $certificateFile = Join-Path ([IO.Path]::GetTempPath()) 'duinzicht-system-certificates.pem'
        $pemBlocks = foreach ($storePath in @('Cert:\LocalMachine\Root', 'Cert:\CurrentUser\Root', 'Cert:\LocalMachine\CA')) {
            foreach ($certificate in @(Get-ChildItem -Path $storePath -ErrorAction SilentlyContinue)) {
                "-----BEGIN CERTIFICATE-----`n" + [Convert]::ToBase64String($certificate.RawData, 'InsertLineBreaks') + "`n-----END CERTIFICATE-----"
            }
        }
        if ($pemBlocks) {
            Set-Content -LiteralPath $certificateFile -Value $pemBlocks -Encoding Ascii
            $env:NODE_EXTRA_CA_CERTS = $certificateFile
        }
    } catch { }
}

# Long paths and OneDrive both trip up node_modules, which holds thousands of deeply nested files.
function Show-FolderLocationWarnings($rootFolder) {
    foreach ($oneDriveFolder in @($env:OneDrive, $env:OneDriveCommercial, $env:OneDriveConsumer)) {
        if (-not $oneDriveFolder) { continue }
        $oneDrivePrefix = $oneDriveFolder.TrimEnd('\') + '\'
        if ($rootFolder.Length -gt $oneDrivePrefix.Length -and $rootFolder.Substring(0, $oneDrivePrefix.Length) -ieq $oneDrivePrefix) {
            Write-Warn 'This folder is in OneDrive, which syncs every installed package and can lock files. A folder like C:\training works better.'
            break
        }
    }
    if ($rootFolder.Length -gt 80) {
        Write-Warn "This folder's path is $($rootFolder.Length) characters long. Installed packages can go past the 260-character limit of Windows; a short folder like C:\training is safer."
    }
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

# True when version $currentVersion is older than $minimumVersion. Both are plain x.y.z numbers.
function Test-VersionIsOlder($currentVersion, $minimumVersion) {
    $currentParts = $currentVersion -split '\.'
    $minimumParts = $minimumVersion -split '\.'
    for ($i = 0; $i -lt 3; $i++) {
        if ([int]$currentParts[$i] -lt [int]$minimumParts[$i]) { return $true }
        if ([int]$currentParts[$i] -gt [int]$minimumParts[$i]) { return $false }
    }
    return $false
}

# Installs the pinned Python with uv and makes it the python and python3 every new window finds.
# Older uv releases only know --default as a preview feature. Returns whether that worked.
function Install-DefaultPython {
    Write-Info "Installing Python $script:PythonVersion as the default python. The first time this can take a few minutes..."
    $global:LASTEXITCODE = 1
    & uv python install $script:PythonVersion --default | Out-Host
    if ($LASTEXITCODE -ne 0) {
        $global:LASTEXITCODE = 1
        & uv python install $script:PythonVersion --default --preview | Out-Host
    }
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Installing Python $script:PythonVersion failed. Check your internet connection (or HTTPS_PROXY behind a proxy) and run setup again."
        return $false
    }
    $pythonBinDirectory = if ($env:UV_PYTHON_BIN_DIR) { $env:UV_PYTHON_BIN_DIR } else { Get-UvBinDirectory }
    if ($script:IsFullLanguage) { Add-UserPathEntry $pythonBinDirectory }
    Write-Ok "Python $script:PythonVersion is installed; new windows find it as python."
    return $true
}

# Installs specify-cli as a uv tool on the pinned Python, so specify keeps working after setup.
# --force replaces a specify.exe from an earlier install. Returns the path of specify.exe, or $null.
function Install-SpecifyCli {
    Write-Info "Installing specify-cli on Python $script:PythonVersion..."
    $global:LASTEXITCODE = 1
    & uv tool install --force --python $script:PythonVersion --from $script:SpecKitSource specify-cli | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage 'Installing specify-cli failed. Check your internet connection (or HTTPS_PROXY behind a proxy) and run setup again.'
        return $null
    }
    $toolBinDirectory = (& uv tool dir --bin 2>$null | Out-String).Trim()
    if (-not $toolBinDirectory) { $toolBinDirectory = Get-UvBinDirectory }
    if ($script:IsFullLanguage) { Add-UserPathEntry $toolBinDirectory }
    $specifyPath = Join-Path $toolBinDirectory 'specify.exe'
    if (-not (Test-Path -LiteralPath $specifyPath)) {
        Write-ErrorMessage "specify-cli is installed, but $specifyPath is missing."
        return $null
    }
    Write-Ok "specify-cli runs on Python $script:PythonVersion."
    return $specifyPath
}

# Python and specify-cli on every run. The skills before the first commit, so they are part of it.
# specify init --force keeps the starter's constitution and rewrites the templates and scripts in
# .specify with Spec Kit's own; it adds the skills and its metadata. Until that first commit exists
# it runs every time, so an interrupted run never leaves half the skills behind.
function Install-SpecKitSkills {
    # A uv installed in another window is only on this window's PATH after a reopen.
    $env:PATH = (Get-UvBinDirectory) + ';' + $env:PATH
    if (-not (Test-CommandExists 'uv')) {
        if (-not $script:IsFullLanguage) {
            Show-LockedDownHelp 'uv'
            return $false
        }
        Write-Info 'uv was not found; Python and Spec Kit install through it. Installing uv...'
        if (-not (Install-PinnedUv)) {
            Write-ErrorMessage 'uv is required for Python and Spec Kit. Install it from https://docs.astral.sh/uv/ and run setup again.'
            return $false
        }
        Update-SessionPath
    }
    # A TLS-inspecting proxy re-signs traffic with a company certificate that only the Windows
    # certificate store trusts; uv's own certificate bundle would reject it.
    if (-not $env:UV_SYSTEM_CERTS -and -not $env:UV_NATIVE_TLS) {
        $uvToolHelp = (& uv tool install --help 2>$null | Out-String)
        if ($uvToolHelp -match '--system-certs') { $env:UV_SYSTEM_CERTS = '1' } else { $env:UV_NATIVE_TLS = '1' }
    }
    if (-not (Install-DefaultPython)) { return $false }
    $specifyPath = Install-SpecifyCli
    if (-not $specifyPath) { return $false }
    if (Test-HasFirstCommit $script:SpecKitProjectFolder) {
        Write-Ok "The Spec Kit skills are already part of the first commit of $script:SpecKitProjectFolder."
        return $true
    }
    Write-Info "Installing the Spec Kit skills in $script:SpecKitProjectFolder..."
    Push-Location -LiteralPath $script:SpecKitProjectFolder
    try {
        $global:LASTEXITCODE = 1
        & $specifyPath init --here --force --non-interactive --integration copilot '--integration-options=--skills' --script ps --ignore-agent-tools | Out-Host
        $specifySucceeded = ($LASTEXITCODE -eq 0)
    } finally {
        Pop-Location
    }
    if (-not $specifySucceeded) {
        Write-ErrorMessage 'specify init failed. Check your internet connection (or HTTPS_PROXY behind a proxy) and run setup again.'
        return $false
    }
    Write-Ok "The Spec Kit skills are in $script:SpecKitProjectFolder\.github\skills."
    return $true
}

function Invoke-Setup($rootFolder) {
    Write-Bold 'Splitting the session 2 repository into one repository per project'
    Initialize-SystemProxy

    # --- 1. Checks -----------------------------------------------------------
    Write-Step '1/6 Checks'
    $gitVersion = if (Test-CommandExists 'git') { Get-GitResult @('--version') } else { $null }
    if (-not $gitVersion -or -not $gitVersion.Succeeded) {
        Write-ErrorMessage 'git was not found. Install it from https://git-scm.com and run setup again.'
        $script:SetupExitCode = 1; return
    }
    Write-Ok "$($gitVersion.Output) works."

    foreach ($projectFolder in $script:ProjectFolders) {
        if (-not (Test-Path -LiteralPath $projectFolder -PathType Container)) {
            Write-ErrorMessage "The folder $projectFolder is missing. Run this script from the session 2 repository folder."
            $script:SetupExitCode = 1; return
        }
    }

    # Nested repositories inside someone else's repository would turn up there as embedded repositories.
    # Any answer but "not a git repository" counts as inside one, so an unreadable parent never passes.
    $parentFolder = Split-Path -Path $rootFolder -Parent
    $enclosingResult = Get-GitResult @('-C', $parentFolder, 'rev-parse', '--show-toplevel')
    if ($enclosingResult.Succeeded -or $enclosingResult.Output -notmatch 'not a git repository') {
        Write-ErrorMessage 'This folder is inside another git repository, or git cannot tell:'
        Write-Host $enclosingResult.Output
        Write-Info 'Copy the folder somewhere outside that repository and run setup there.'
        $script:SetupExitCode = 1; return
    }
    Write-Ok 'This folder is not inside another git repository.'
    Show-FolderLocationWarnings $rootFolder
    Stop-NodeProcesses

    # --- 2. Remove the repository of this folder -------------------------------
    Write-Step '2/6 Remove the repository of this folder'
    $repositoryPath = Join-Path $rootFolder '.git'
    if (Test-Path -LiteralPath $repositoryPath) {
        $workOnlyInThisClone = Get-WorkOnlyInThisClone
        if ($workOnlyInThisClone) {
            Write-ErrorMessage "This folder's repository holds work that exists nowhere else, so setup leaves it alone."
            Write-Host $workOnlyInThisClone
            Write-Info 'Push or remove that work, or clone the repository again in a new folder, and run setup there.'
            $script:SetupExitCode = 1; return
        }
        Write-Info 'Every project gets its own repository, so the agent stays inside its project folder.'
        if (-not (Remove-RootRepository $repositoryPath)) {
            Write-ErrorMessage "Could not remove $repositoryPath. Close VS Code and other programs that use it, then run setup again."
            $script:SetupExitCode = 1; return
        }
        Write-Ok "Removed $($repositoryPath): the history of this clone is gone, every file stays."
    } else {
        Write-Ok 'This folder is no repository any more.'
    }

    # --- 3. Spec Kit ----------------------------------------------------------
    Write-Step '3/6 Python and Spec Kit'
    if (-not (Install-SpecKitSkills)) {
        $script:SetupExitCode = 1; return
    }

    # --- 4. One repository per project -----------------------------------------
    Write-Step '4/6 One repository per project'
    $usesFallbackIdentity = (-not (Get-GitValue 'user.name') -or -not (Get-GitValue 'user.email'))
    if ($usesFallbackIdentity) {
        Write-Info "git has no name and email set up, so the project repositories use `"$script:FallbackAuthorName`"."
        Write-Info 'Set your own with:  git config --global user.name "Your Name"'
    }

    foreach ($projectFolder in $script:ProjectFolders) {
        if (Test-HasFirstCommit $projectFolder) {
            Write-Ok "$projectFolder is already its own repository."
            continue
        }
        # A .git without a commit is what an interrupted run leaves behind; init again finishes it.
        # symbolic-ref instead of init --initial-branch, which git before 2.28 does not know.
        # The first commit skips the user's signing and hooks: a gpg or hook setup must not block it.
        $succeeded = (Invoke-Git @('-C', $projectFolder, 'init', '--quiet')) -and
                     (Invoke-Git @('-C', $projectFolder, 'symbolic-ref', 'HEAD', 'refs/heads/main')) -and
                     (-not $usesFallbackIdentity -or
                      ((Invoke-Git @('-C', $projectFolder, 'config', 'user.name', $script:FallbackAuthorName)) -and
                       (Invoke-Git @('-C', $projectFolder, 'config', 'user.email', $script:FallbackAuthorEmail)))) -and
                     (Invoke-Git @('-C', $projectFolder, 'add', '--all')) -and
                     (Invoke-Git @('-C', $projectFolder, '-c', 'commit.gpgsign=false', 'commit', '--quiet', '--no-verify', '--message', $script:FirstCommitMessage))
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
    if (Test-Path -LiteralPath $bunBinDirectory) { $env:PATH = $bunBinDirectory + ';' + $env:PATH }

    if (-not (Test-CommandExists 'bun')) {
        if (-not $script:IsFullLanguage) {
            Show-LockedDownHelp 'Bun'
            $script:SetupExitCode = 1; return
        }
        Write-Info "Bun was not found. Installing Bun $script:RecommendedBunVersion..."
        if (-not (Install-PinnedBun)) {
            Write-ErrorMessage 'Installing Bun did not finish.'
            Show-BunInstallHelp
            $script:SetupExitCode = 1; return
        }
        Update-SessionPath
        if (-not (Test-CommandExists 'bun')) {
            Write-ErrorMessage 'Bun was installed but this window cannot find it. Close it, open a new one and run setup again.'
            $script:SetupExitCode = 1; return
        }
    }

    # A broken install is found on PATH but fails here; AppLocker blocking bun.exe in the user
    # profile looks the same.
    $bunVersion = Get-BunVersion
    if (-not $bunVersion) {
        Write-ErrorMessage "Found bun at $((Get-Command bun).Source), but it does not run. The install looks broken, or the computer blocks programs in your user folder."
        Show-BunInstallHelp
        $script:SetupExitCode = 1; return
    }
    Write-Ok "Bun $bunVersion works ($((Get-Command bun).Source))."

    $bunReleaseVersion = $bunVersion -replace '-.*$', ''
    if ($bunReleaseVersion -match '^\d+\.\d+\.\d+$' -and (Test-VersionIsOlder $bunReleaseVersion $script:RecommendedBunVersion)) {
        Write-Warn "Bun $script:RecommendedBunVersion or newer is recommended. Update it with:  bun upgrade"
    }

    # --- 6. Dependencies -----------------------------------------------------
    Write-Step '6/6 Dependencies'
    Export-SystemCertificatesForBun
    foreach ($projectFolder in $script:ProjectFolders) {
        Write-Info "Running bun install in $projectFolder..."
        $global:LASTEXITCODE = 1
        Push-Location -LiteralPath $projectFolder
        try { & bun install | Out-Host } finally { Pop-Location }
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "bun install failed in $projectFolder. Check your internet connection (or HTTPS_PROXY behind a proxy) and run setup again."
            $script:SetupExitCode = 1; return
        }
    }
    Write-Ok 'Every project is installed.'

    Write-Host ''
    Write-Info 'Next: open the 1-mijn-duinzicht folder in VS Code and start the portal there with:  bun run dev'
    if (-not (Test-PathListContains $bunBinDirectory $script:StartingPath)) {
        Write-Info 'If VS Code was open during setup, close every VS Code window and start it again, so its terminals find bun.'
    }
}

if ($PSScriptRoot) {
    # ProviderPath keeps a network share a plain \\server\share path that git understands.
    Push-Location -LiteralPath $PSScriptRoot
    try {
        Invoke-Setup (Get-Location).ProviderPath
    } catch {
        Write-ErrorMessage "Setup stopped unexpectedly: $($_.Exception.Message)"
        $script:SetupExitCode = 1
    } finally {
        Pop-Location
    }
} else {
    Write-ErrorMessage 'Run this script as a file: double-click setup.cmd, or run .\setup.ps1 in the session 2 repository folder.'
    $script:SetupExitCode = 1
}

# Only exit when run as a script: exit in a dot-sourced file would close the caller's shell.
if ($MyInvocation.InvocationName -ne '.') { exit $script:SetupExitCode }
