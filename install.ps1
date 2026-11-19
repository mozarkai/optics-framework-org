<#
.SYNOPSIS
    Optics Framework installer for Windows.

.DESCRIPTION
    irm https://optics-framework.org/install.ps1 | iex

    Installs optics into its own virtual environment under ~\.optics and puts
    the CLI on your PATH, so nothing is installed into the system Python.
    Python 3.12+ is the one prerequisite: this script reports it plainly rather
    than provisioning a runtime behind your back.

    Running it again upgrades. An Optics that is already installed (by this
    script, uv tool, pipx or pip) is upgraded where it is, never joined by a
    second copy. -Dir skips that search.

    Piping into iex passes no parameters, so every option is also an
    environment variable. To set one first:

        $env:OPTICS_EXTRA = "appium,llm"
        irm https://optics-framework.org/install.ps1 | iex

    Downloaded as a file, the parameters below work directly.

.PARAMETER Version
    Install a specific release.                        [$env:OPTICS_VERSION]
.PARAMETER Extra
    Engine extras on top of mcp, e.g. appium,llm.      [$env:OPTICS_EXTRA]
.PARAMETER Dir
    Install somewhere else.                            [$env:OPTICS_INSTALL_DIR]
.PARAMETER NoModifyPath
    Do not touch your PATH.                            [$env:OPTICS_NO_MODIFY_PATH]
.PARAMETER DryRun
    Print what would happen, change nothing.
.PARAMETER Uninstall
    Remove the managed install.
#>
# The parameters are read inside the `& { }` body below, which the analyzer does not follow.
[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSReviewUnusedParameter', '')]
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
$DirSet = [bool] $Dir
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

# -------------------------------------------------------------- existing copy
# Re-running the install command is how most people upgrade, so look for every
# Optics already installed before creating anything.

# One line each: version, prefix, pip present (1/0), and the extras whose
# packages are all installed, so an upgrade keeps them. Run from a file: Windows
# PowerShell 5.1 mangles quotes in arguments to native commands.
$Probe = @'
import importlib.metadata as m, importlib.util as u, re, sys
d = m.distribution("optics-framework")
need = {}
for r in d.requires or ():
    x = re.search(r"extra\s*==\s*.([\w.-]+)", r)
    if x:
        need.setdefault(x.group(1), []).append(re.split(r"[\s;\[<>=!~(]", r, maxsplit=1)[0])
def have(n):
    try:
        m.distribution(n)
        return True
    except m.PackageNotFoundError:
        return False
print(d.version, sys.prefix, int(u.find_spec("pip") is not None), ",".join(e for e, ns in need.items() if all(map(have, ns))), sep="\n")
'@

function Get-ToolDir {
    param([string] $Tool, [string[]] $Arguments)
    if (-not (Get-Command $Tool -ErrorAction SilentlyContinue)) { return $null }
    $run = Invoke-Native $Tool $Arguments
    if ($run.Code -eq 0 -and $run.Output) { return $run.Output.TrimEnd('\', '/') }
    return $null
}

$UvTools   = Get-ToolDir 'uv' @('tool', 'dir')
$UvBin     = Get-ToolDir 'uv' @('tool', 'dir', '--bin')
$PipxVenvs = Get-ToolDir 'pipx' @('environment', '--value', 'PIPX_LOCAL_VENVS')
$PipxBin   = Get-ToolDir 'pipx' @('environment', '--value', 'PIPX_BIN_DIR')

function Test-Under {
    param([string] $Path, [string] $Folder)
    $Folder -and $Path.TrimEnd('\').StartsWith($Folder.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)
}

# The Python behind an optics launcher. A launcher is an .exe with no shebang to
# read, so the folder it sits in says which Python it belongs to.
function Get-LauncherPython {
    param([string] $Launcher)
    $folder = Split-Path $Launcher
    if ((Split-Path $Launcher -Leaf) -ieq 'optics.cmd') {
        $candidates = @(Join-Path $folder '..\venv\Scripts\python.exe')
    } else {
        $candidates = @((Join-Path $folder 'python.exe'), (Join-Path $folder '..\python.exe'))
    }
    foreach ($tool in @(@($UvBin, $UvTools), @($PipxBin, $PipxVenvs))) {
        if ($tool[0] -and $tool[1] -and $folder.TrimEnd('\') -ieq $tool[0]) {
            $candidates += Join-Path $tool[1] 'optics-framework\Scripts\python.exe'
        }
    }
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) { return (Resolve-Path $candidate).Path }
    }
    # pip install --user puts launchers in %APPDATA%\Python\Python3XX\Scripts.
    if ($folder -match '\\Python\\Python3(\d+)\\Scripts\\?$' -and (Get-Command py -ErrorAction SilentlyContinue)) {
        $run = Invoke-Native 'py' @("-3.$($Matches[1])", '-c', 'import sys; print(sys.executable)')
        if ($run.Code -eq 0 -and (Test-Path $run.Output)) { return $run.Output }
    }
    return $null
}

# installer, uv, pipx, project:<lockfile>, venv or pip.
function Get-InstallKind {
    param([string] $Prefix)
    $parent = Split-Path $Prefix
    if ((Split-Path $Prefix -Leaf) -ieq 'venv' -and (Test-Path (Join-Path $parent 'bin\optics.cmd'))) { return 'installer' }
    if ((Test-Under $Prefix $UvTools) -or $Prefix -match '\\uv\\tools\\') { return 'uv' }
    if ((Test-Under $Prefix $PipxVenvs) -or $Prefix -match '\\pipx\\venvs\\') { return 'pipx' }
    if (Test-Path (Join-Path $Prefix 'pyvenv.cfg')) {
        foreach ($lock in 'uv.lock', 'poetry.lock', 'pdm.lock', 'Pipfile.lock') {
            if (Test-Path (Join-Path $parent $lock)) { return "project:$lock" }
        }
        return 'venv'
    }
    return 'pip'
}

# Every Optics, first on PATH first: launchers on PATH, then this script's
# default install and tool environments whose bin folder is off PATH.
function Find-OpticsInstall {
    $launchers = @(Get-Command optics -All -CommandType Application -ErrorAction SilentlyContinue | ForEach-Object { $_.Source })
    $launchers += $Shim
    foreach ($tools in $UvTools, $PipxVenvs) {
        if ($tools) { $launchers += Join-Path $tools 'optics-framework\Scripts\optics.exe' }
    }
    $probeFile = Join-Path ([IO.Path]::GetTempPath()) "optics-probe-$([guid]::NewGuid()).py"
    Set-Content -Path $probeFile -Value $Probe -Encoding ASCII
    $found = @()
    try {
        foreach ($launcher in $launchers) {
            if (-not (Test-Path $launcher)) { continue }
            $python = Get-LauncherPython $launcher
            if (-not $python) { continue }
            $run = Invoke-Native $python @($probeFile)
            if ($run.Code -ne 0) { continue }
            $lines = @($run.Output -split '\r?\n')
            $prefix = $lines[1].TrimEnd('\')
            if ($found | Where-Object { $_.Prefix -ieq $prefix }) { continue }
            $found += [pscustomobject]@{
                Kind = Get-InstallKind $prefix; Prefix = $prefix; Python = $python; Launcher = $launcher
                Version = $lines[0]; Pip = $lines[2] -eq '1'; Extras = $(if ($lines.Count -gt 3) { $lines[3] } else { '' })
            }
        }
    } finally {
        Remove-Item -Force $probeFile -ErrorAction SilentlyContinue
    }
    $found
}

function Join-ExtraList {
    param([string[]] $Part)
    $names = @(($Part -join ',') -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -Unique)
    $names -join ','
}

function Get-Spec {
    param([string] $Extras)
    $spec = if ($Extras) { "$Package[$Extras]" } else { $Package }
    if ($Version) { $spec = "$spec==$Version" }
    $spec
}

function Get-InstallLabel {
    param([string] $Kind)
    switch -Wildcard ($Kind) {
        'uv' { 'uv tool' }
        'pipx' { 'pipx' }
        'project:*' { 'project' }
        'venv' { 'virtual environment' }
        default { 'pip' }
    }
}

function Get-RemovalCommand {
    param($Copy)
    switch -Wildcard ($Copy.Kind) {
        'installer' { "& ([scriptblock]::Create((irm https://optics-framework.org/install.ps1))) -Uninstall -Dir `"$(Split-Path $Copy.Prefix)`"" }
        'uv' { "uv tool uninstall $Package" }
        'pipx' { "pipx uninstall $Package" }
        'project:*' { "remove $Package from the project in $(Split-Path $Copy.Prefix)" }
        default { "& `"$($Copy.Python)`" -m pip uninstall $Package" }
    }
}

function Write-OtherInstall {
    param([object[]] $Others)
    foreach ($copy in $Others) {
        Write-Host ''
        Write-Host "  Optics $($copy.Version) is also installed in $($copy.Prefix). Remove one copy so they do not drift:" -ForegroundColor DarkGray
        Write-Host "    $(Get-RemovalCommand $copy)"
    }
}

function Invoke-Upgrade {
    param([string] $Exe, [string[]] $Arguments)
    if ($DryRun) { Write-Step "would run: $Exe $($Arguments -join ' ')"; return }
    Write-Step "$Exe $($Arguments -join ' ')"
    $run = Invoke-Native $Exe $Arguments
    if ($run.Code -ne 0) { Write-FatalError "$Exe could not upgrade Optics." @('', $run.Output) }
}

function Get-ProjectCommand {
    param([string] $Kind)
    switch ($Kind) {
        'project:uv.lock' { if ($Version) { "uv add $Package==$Version" } else { "uv sync --upgrade-package $Package" } }
        'project:poetry.lock' { "poetry add $Package@$(if ($Version) { $Version } else { 'latest' })" }
        'project:pdm.lock' { if ($Version) { "pdm add $Package==$Version" } else { "pdm update --unconstrained $Package" } }
        default { if ($Version) { "pipenv install $Package==$Version" } else { "pipenv update $Package" } }
    }
}

# A reinstall rather than `uv tool upgrade` or `pipx upgrade`, which keep the
# version pinned at install time; the spec carries the extras already there.
function Invoke-FoundUpgrade {
    param($Copy, [string] $Spec)
    switch -Wildcard ($Copy.Kind) {
        'uv' {
            if (-not (Get-Command uv -ErrorAction SilentlyContinue)) { Write-FatalError 'Optics is a uv tool, and uv is not on PATH.' }
            $target = if ($Version) { $Spec } else { "$Spec@latest" }
            Invoke-Upgrade 'uv' @('tool', 'install', $target)
        }
        'pipx' {
            if (-not (Get-Command pipx -ErrorAction SilentlyContinue)) { Write-FatalError 'Optics is a pipx tool, and pipx is not on PATH.' }
            Invoke-Upgrade 'pipx' @('install', '--force', $Spec)
        }
        default {
            if ($Copy.Pip) {
                Invoke-Upgrade $Copy.Python @('-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '--upgrade', $Spec)
            } elseif (Get-Command uv -ErrorAction SilentlyContinue) {
                Invoke-Upgrade 'uv' @('pip', 'install', '--quiet', '--python', $Copy.Python, '--upgrade', $Spec)
            } else {
                Write-FatalError "The environment in $($Copy.Prefix) has no pip, and uv is not on PATH." @('', 'Upgrade it with the tool that created it.')
            }
        }
    }
}

$copies = @()
if (-not $DirSet) { $copies = @(Find-OpticsInstall) }
$found = if ($copies.Count) { $copies[0] } else { $null }
$foundExtras = if ($found) { $found.Extras } else { '' }

if ($found -and $found.Kind -eq 'installer') {
    $Dir  = Split-Path $found.Prefix
    $Venv = Join-Path $Dir 'venv'
    $Bin  = Join-Path $Dir 'bin'
    $Shim = Join-Path $Bin 'optics.cmd'
    Write-Ok "Found Optics $($found.Version) in $Dir"
} elseif ($found) {
    Write-Ok "Found Optics $($found.Version) in $($found.Prefix) ($(Get-InstallLabel $found.Kind))"
    if ($found.Kind -like 'project:*') {
        Write-Host "Optics belongs to the project in $(Split-Path $found.Prefix), and its lockfile sets the version."
        Write-Host 'Upgrade it from that folder with:'
        Write-Host ''
        Write-Host "  $(Get-ProjectCommand $found.Kind)"
        Write-Host ''
        return
    }
    if ($DryRun) { Write-Host 'Dry run - nothing will be changed.' }
    Invoke-FoundUpgrade $found (Get-Spec (Join-ExtraList @($found.Extras, $Extra)))
    if (-not $DryRun) {
        $check = Invoke-Native $found.Launcher @('--version')
        if ($check.Code -ne 0) { Write-FatalError 'Upgraded, but optics could not start.' @('', $check.Output) }
        Write-Ok $check.Output
    }
    Write-OtherInstall @($copies | Select-Object -Skip 1)
    Write-Host ''
    Write-Host "Agent:   claude mcp add -s user optics -- `"$($found.Launcher)`" mcp"
    Write-Host ''
    return
}

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

$Spec = Get-Spec (Join-ExtraList @('mcp', $foundExtras, $Extra))

$VenvPython = Join-Path $Venv 'Scripts\python.exe'
$VenvOptics = Join-Path $Venv 'Scripts\optics.exe'

if ($DryRun) {
    Write-Host ''
    Write-Host 'Dry run - nothing will be changed.'
    if (Test-Path $VenvPython) { Write-Step "reuse the virtual environment at $Venv" } else { Write-Step "create virtual environment at $Venv" }
    Write-Step "install $Spec into it"
    Write-Step "link the optics CLI into $Bin"
    if (-not $NoModifyPath) { Write-Step "add $Bin to your user PATH" }
    Write-OtherInstall @($copies | Select-Object -Skip 1)
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

Write-OtherInstall @($copies | Select-Object -Skip 1)
Write-Host ''
Write-Host 'Next:    optics quickstart'
Write-Host '         Builds a project, checks your setup, and runs your first test.' -ForegroundColor DarkGray
Write-Host "Agent:   claude mcp add -s user optics -- `"$Shim`" mcp"
Write-Host '         Lets your AI agent drive apps. Start a new agent session to see the tools.' -ForegroundColor DarkGray
Write-Host 'Desktop: https://optics-framework.org/docs/platforms/desktop?ref=installer'
Write-Host 'Docs:    https://optics-framework.org/docs/get-started/first-test?ref=installer'
Write-Host ''
} } catch [System.OperationCanceledException] {
    # The reason is already printed. A downloaded script reports failure to its
    # caller; under iex the window must stay open, so only the exit code is set.
    if ($PSCommandPath) { exit 1 }
    $global:LASTEXITCODE = 1
}
