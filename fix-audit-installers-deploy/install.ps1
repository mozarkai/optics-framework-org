<#
.SYNOPSIS
    Optics Framework installer for Windows.

.DESCRIPTION
    irm https://optics-framework.org/install.ps1 | iex

    Installs optics into its own virtual environment under ~\.optics and puts
    the CLI on your PATH, so nothing is installed into the system Python.
    Python 3.12+ is the one prerequisite: this script reports it plainly rather
    than provisioning a runtime behind your back.

    Piping into iex passes no parameters, so every option is also an
    environment variable. To set one first:

        $env:OPTICS_EXTRA = "appium,llm"
        irm https://optics-framework.org/install.ps1 | iex

    Downloaded as a file, the parameters below work directly.

.PARAMETER Version
    Install a specific release.                        [$env:OPTICS_VERSION]
.PARAMETER Extra
    Comma-separated engine extras, e.g. appium,llm.    [$env:OPTICS_EXTRA]
.PARAMETER Dir
    Install somewhere else.                            [$env:OPTICS_INSTALL_DIR]
.PARAMETER NoModifyPath
    Do not touch your PATH.                            [$env:OPTICS_NO_MODIFY_PATH]
.PARAMETER DryRun
    Print what would happen, change nothing.
.PARAMETER Uninstall
    Remove the managed install.
#>
[CmdletBinding()]
param(
    [string] $Version      = $env:OPTICS_VERSION,
    [string] $Extra        = $env:OPTICS_EXTRA,
    [string] $Dir          = $env:OPTICS_INSTALL_DIR,
    [switch] $NoModifyPath,
    [switch] $DryRun,
    [switch] $Uninstall
)

# The body runs in a child scope and stops with `return`, never `exit`: under
# `irm | iex` an exit would close the user's PowerShell window.
try { & {
$ErrorActionPreference = 'Stop'

$Package = 'optics-framework'
if (-not $Dir) { $Dir = Join-Path $HOME '.optics' }
$Dir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Dir).TrimEnd('\', '/')
if ($env:OPTICS_NO_MODIFY_PATH) { $NoModifyPath = $true }

$Venv = Join-Path $Dir 'venv'
$Bin  = Join-Path $Dir 'bin'
$Shim = Join-Path $Bin 'optics.cmd'

function Write-Step { param([string] $Message) Write-Host "  -> $Message" -ForegroundColor DarkGray }
function Write-Ok   { param([string] $Message) Write-Host "  [ok] $Message" -ForegroundColor Green }

function Write-FatalError {
    param([string] $Reason, [string[]] $Guidance = @())
    Write-Host ''
    Write-Host "Cannot install: $Reason" -ForegroundColor Red
    foreach ($line in $Guidance) { Write-Host "  $line" }
    throw [System.OperationCanceledException]::new()
}

# Windows PowerShell 5.1 turns native stderr into a terminating error under
# 'Stop' once it is redirected, so native calls run with a local 'Continue'.
function Invoke-Native {
    param([string] $Exe, [string[]] $Arguments = @())
    $ErrorActionPreference = 'Continue'
    $lines = @(& $Exe @Arguments 2>&1 | ForEach-Object { "$_" })
    [pscustomobject]@{ Code = $LASTEXITCODE; Output = ($lines -join [Environment]::NewLine).Trim() }
}

# Read and written raw, so entries like %JAVA_HOME%\bin stay references
# instead of being frozen to today's value.
function Get-UserPath {
    (Get-Item -Path 'HKCU:\Environment').GetValue('Path', '', 'DoNotExpandEnvironmentNames')
}

function Save-UserPath {
    param([string] $Value)
    Set-ItemProperty -Path 'HKCU:\Environment' -Name Path -Value $Value -Type ExpandString
    # Setting a variable through .NET broadcasts the change, so new terminals pick it up.
    [Environment]::SetEnvironmentVariable('OPTICS_INSTALLER', '1', 'User')
    [Environment]::SetEnvironmentVariable('OPTICS_INSTALLER', $null, 'User')
}

function Test-IsBin {
    param([string] $Entry)
    [Environment]::ExpandEnvironmentVariables($Entry).TrimEnd('\') -ieq $Bin
}

# ------------------------------------------------------------------ uninstall
if ($Uninstall) {
    $pathEntries = @((Get-UserPath) -split ';' | Where-Object { $_ })
    $keptEntries = @($pathEntries | Where-Object { -not (Test-IsBin $_) })
    $onPath = $keptEntries.Count -ne $pathEntries.Count
    $hasVenv = Test-Path $Venv
    $hasShim = Test-Path $Shim
    if (-not ($hasVenv -or $hasShim -or $onPath)) {
        Write-Host "Nothing to uninstall: there is no Optics install in $Dir."
        return
    }
    if ($DryRun) {
        if ($hasVenv) { Write-Host "Would remove $Venv" }
        if ($hasShim) { Write-Host "Would remove $Shim" }
        if ($onPath)  { Write-Host "Would remove $Bin from your user PATH" }
        return
    }
    if ($hasVenv) { Remove-Item -Recurse -Force $Venv }
    if ($hasShim) { Remove-Item -Force $Shim }
    foreach ($folder in $Bin, $Dir) {
        if ((Test-Path $folder) -and -not (Get-ChildItem -Force $folder | Select-Object -First 1)) {
            Remove-Item -Force $folder
        }
    }
    Write-Ok "Removed Optics from $Dir"
    if (Test-Path $Dir) { Write-Host "  $Dir holds other files, so it was left in place." }
    if ($onPath) {
        Save-UserPath ($keptEntries -join ';')
        $env:Path = (@($env:Path -split ';' | Where-Object { $_ -and -not (Test-IsBin $_) })) -join ';'
        Write-Ok "Removed $Bin from your user PATH"
    }
    return
}

Write-Host ''
Write-Host 'Optics Framework installer'
Write-Host ''

# --------------------------------------------------------------------- python
# Lowest supported version first, deliberately. Optics pulls opencv,
# scikit-image and (via easyocr) torch; on a just-released Python those have no
# wheels yet and pip falls back to source builds that take an age or fail.
function Get-PythonVersion {
    param([string] $Exe, [string[]] $Prefix = @())
    try {
        $probe = Invoke-Native $Exe ($Prefix + @('-c', 'import sys; print("%d.%d.%d" % sys.version_info[:3])'))
        if ($probe.Code -ne 0) { return $null }
        return ($probe.Output -split '\r?\n' | Where-Object { $_ -match '^\d+\.\d+\.\d+$' } | Select-Object -Last 1)
    } catch {
        return $null
    }
}

function Find-Python {
    $candidates = @()
    # The py launcher is the idiomatic way to reach a specific Python on Windows.
    if (Get-Command py -ErrorAction SilentlyContinue) {
        foreach ($tag in '-3.12', '-3.13', '-3.14', '-3') {
            $candidates += , @('py', @($tag))
        }
    }
    foreach ($name in 'python3.12', 'python3.13', 'python3.14', 'python3', 'python') {
        if (Get-Command $name -ErrorAction SilentlyContinue) {
            $candidates += , @($name, @())
        }
    }
    foreach ($candidate in $candidates) {
        $exe    = $candidate[0]
        $prefix = $candidate[1]
        # A bare `python` on a clean Windows is often the Microsoft Store stub,
        # which prints nothing and opens the Store instead of running. Asking it
        # for a version string is what tells the two apart.
        $version = Get-PythonVersion -Exe $exe -Prefix $prefix
        if (-not $version) { continue }
        $parsed = [version] $version
        if ($parsed -ge [version] '3.12') {
            return @{ Exe = $exe; Prefix = $prefix; Version = $version }
        }
    }
    return $null
}

$python = Find-Python
if (-not $python) {
    Write-FatalError 'Optics needs Python 3.12 or newer, and no suitable Python was found.' @(
        ''
        'Install one, then re-run this script:'
        ''
        '  winget install Python.Python.3.12'
        ''
        'or download it from https://www.python.org/downloads/windows/'
        'Tick "Add python.exe to PATH" in the installer.'
    )
}
Write-Ok "Python $($python.Version)"

$Spec = $Package
if ($Extra)   { $Spec = "$Spec[$Extra]" }
if ($Version) { $Spec = "$Spec==$Version" }

$VenvPython = Join-Path $Venv 'Scripts\python.exe'
$VenvOptics = Join-Path $Venv 'Scripts\optics.exe'

if ($DryRun) {
    Write-Host ''
    Write-Host 'Dry run - nothing will be changed.'
    Write-Step "create virtual environment at $Venv"
    Write-Step "install $Spec into it"
    Write-Step "link the optics CLI into $Bin"
    if (-not $NoModifyPath) { Write-Step "add $Bin to your user PATH" }
    Write-Host ''
    return
}

# ----------------------------------------------------------------------- venv
if (Test-Path $VenvPython) {
    Write-Ok "Reusing the environment at $Venv"
} else {
    Write-Step "Creating a virtual environment at $Venv"
    New-Item -ItemType Directory -Force -Path $Dir | Out-Null
    $venvRun = Invoke-Native $python.Exe ($python.Prefix + @('-m', 'venv', $Venv))
    if ($venvRun.Code -ne 0 -or -not (Test-Path $VenvPython)) {
        Write-FatalError "Could not create a virtual environment at $Venv." @('', $venvRun.Output)
    }
}

# -------------------------------------------------------------------- install
Write-Step "Installing $Spec"
$pip = Invoke-Native $VenvPython @('-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '--upgrade', $Spec)
if ($pip.Code -ne 0) {
    Write-FatalError "pip could not install $Spec." @(
        ''
        $pip.Output
        ''
        'Re-run with -Version to pin a known-good release, or see'
        '  https://pypi.org/project/optics-framework/'
    )
}
if (-not (Test-Path $VenvOptics)) {
    Write-FatalError "The package installed but no optics command appeared in $Venv\Scripts."
}

# ----------------------------------------------------------------------- shim
New-Item -ItemType Directory -Force -Path $Bin | Out-Null
# %~dp0 keeps the shim relative to itself, so moving the install directory does
# not strand it. The trailing backslash %~dp0 supplies is why there is none here.
@"
@echo off
"%~dp0..\venv\Scripts\optics.exe" %*
"@ | Set-Content -Path $Shim -Encoding ASCII

$check = Invoke-Native $Shim @('--version')
if ($check.Code -ne 0) {
    Write-FatalError "Installed, but '$Shim --version' did not run." @(
        '', $check.Output, '', 'Report this at https://github.com/mozarkai/optics-framework/issues'
    )
}
Write-Ok $check.Output

# ----------------------------------------------------------------------- PATH
Write-Host ''
$userPath = Get-UserPath
$onPath = $userPath -split ';' | Where-Object { $_ -and (Test-IsBin $_) }

if ($onPath) {
    Write-Ok "$Bin is already on your PATH"
} elseif ($NoModifyPath) {
    Write-Host 'Add this to your PATH to reach optics from anywhere:'
    Write-Host ''
    Write-Host "  $Bin"
} else {
    $updated = if ([string]::IsNullOrEmpty($userPath)) { $Bin } else { "$($userPath.TrimEnd(';'));$Bin" }
    Save-UserPath $updated
    # The user-scope change only reaches processes started afterwards, so make
    # this session usable too rather than telling the user to reopen it.
    $env:Path = "$env:Path;$Bin"
    Write-Ok "Added $Bin to your user PATH"
    Write-Host ''
    Write-Host '  Open a new terminal for other programs to see it.' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Next: optics quickstart'
Write-Host '      Builds a project, checks your setup, and runs your first test.' -ForegroundColor DarkGray
Write-Host ''
} } catch [System.OperationCanceledException] {
    # The reason is already printed. A downloaded script reports failure to its
    # caller; under iex the window must stay open, so only the exit code is set.
    if ($PSCommandPath) { exit 1 }
    $global:LASTEXITCODE = 1
}
