#!/bin/sh
# Optics Framework installer.
#
#   curl -fsSL https://optics-framework.org/install | sh
#
# Puts optics in its own virtual environment under ~/.optics and links the CLI
# into ~/.optics/bin, so nothing is installed into the system Python. Python
# 3.12+ is the one prerequisite: this script reports it plainly rather than
# provisioning a runtime behind your back.
#
# Running it again upgrades. An Optics that is already installed (by this
# script, uv tool, pipx or pip) is upgraded where it is, never joined by a
# second copy.
#
# Options (curl ... | sh -s -- <options>):
#   --version X.Y.Z    install a specific release        [$OPTICS_VERSION]
#   --extra a,b        engine extras on top of mcp, e.g. --extra appium,llm
#   --dir PATH         install somewhere else            [$OPTICS_INSTALL_DIR]
#   --no-modify-path   do not touch your shell profile   [$OPTICS_NO_MODIFY_PATH]
#   --dry-run          print what would happen, change nothing
#   --uninstall        remove the managed install
#   --help
set -eu

PACKAGE="optics-framework"
INSTALL_DIR="${OPTICS_INSTALL_DIR:-$HOME/.optics}"
VERSION="${OPTICS_VERSION:-}"
EXTRAS=""
MODIFY_PATH=1
DRY_RUN=0
UNINSTALL=0
DIR_SET=0

if [ -n "${OPTICS_NO_MODIFY_PATH:-}" ]; then MODIFY_PATH=0; fi
if [ -n "${OPTICS_INSTALL_DIR:-}" ]; then DIR_SET=1; fi

# Colour only when stdout is a terminal; `curl | sh` into a pipe stays plain.
if [ -t 1 ]; then
    B=$(printf '\033[1m'); DIM=$(printf '\033[2m'); R=$(printf '\033[0m')
    GREEN=$(printf '\033[32m'); RED=$(printf '\033[31m')
else
    B=''; DIM=''; R=''; GREEN=''; RED=''
fi

say()  { printf '%s\n' "$*"; }
step() { printf '  %s→%s %s\n' "$DIM" "$R" "$*"; }
ok()   { printf '  %s✓%s %s\n' "$GREEN" "$R" "$*"; }
die()  { printf '\n%sCannot install:%s %s\n' "$RED" "$R" "$1" >&2; shift
         for line in "$@"; do printf '  %s\n' "$line" >&2; done; exit 1; }

# Printed inline rather than read back out of "$0": piped through `curl | sh`
# the script has no file to read.
usage() {
    cat <<'USAGE'
Optics Framework installer

  curl -fsSL https://optics-framework.org/install | sh

Options (curl ... | sh -s -- <options>):
  --version X.Y.Z    install a specific release        [$OPTICS_VERSION]
  --extra a,b        engine extras on top of mcp, e.g. --extra appium,llm
  --dir PATH         install somewhere else            [$OPTICS_INSTALL_DIR]
  --no-modify-path   do not touch your shell profile   [$OPTICS_NO_MODIFY_PATH]
  --dry-run          print what would happen, change nothing
  --uninstall        remove the managed install
  --help             show this message

Optics is installed into its own virtual environment under ~/.optics; nothing
is installed into your system Python. Python 3.12+ is the one prerequisite.

Run it again to upgrade. An Optics installed with uv tool, pipx or pip is
upgraded where it is; --dir skips that search.
USAGE
    exit 0
}

while [ $# -gt 0 ]; do
    case "$1" in
        --version) VERSION="${2:?--version needs a value}"; shift 2 ;;
        --version=*) VERSION="${1#*=}"; shift ;;
        --extra) EXTRAS="${2:?--extra needs a value}"; shift 2 ;;
        --extra=*) EXTRAS="${1#*=}"; shift ;;
        --dir) INSTALL_DIR="${2:?--dir needs a value}"; DIR_SET=1; shift 2 ;;
        --dir=*) INSTALL_DIR="${1#*=}"; DIR_SET=1; shift ;;
        --no-modify-path) MODIFY_PATH=0; shift ;;
        --dry-run) DRY_RUN=1; shift ;;
        --uninstall) UNINSTALL=1; shift ;;
        -h|--help) usage ;;
        *) die "unknown option '$1'" "Run with --help to see the options." ;;
    esac
done

# The shim and the PATH line store this path, so it must be absolute. `--dir=~/x`
# reaches us with the tilde unexpanded, because the shell only expands it at the
# start of a word.
case "$INSTALL_DIR" in \~|\~/*) INSTALL_DIR="$HOME${INSTALL_DIR#\~}" ;; esac
case "$INSTALL_DIR" in /*) ;; *) INSTALL_DIR="$PWD/$INSTALL_DIR" ;; esac
INSTALL_DIR="${INSTALL_DIR%/}"

set_paths() {
    VENV="$INSTALL_DIR/venv"
    BIN="$INSTALL_DIR/bin"
    # shellcheck disable=SC2016  # $PATH must land in the profile literally
    PATH_LINE=$(printf 'export PATH="%s:$PATH"' "$BIN")
    FISH_LINE=$(printf 'fish_add_path "%s"' "$BIN")
}
set_paths
FISH_PROFILE="$HOME/.config/fish/conf.d/optics.fish"

# Drop the "# Optics Framework" block this script appended to a profile: the
# marker and the exact PATH line, nothing else. Rewritten in place with cat so a
# symlinked dotfile stays a symlink.
remove_path_block() {
    [ -f "$1" ] && grep -qxF "$2" "$1" || return 1
    LINE="$2" awk '
        $0 == "# Optics Framework" { held = $0; next }
        held != "" { if ($0 != ENVIRON["LINE"]) print held; held = "" }
        $0 == ENVIRON["LINE"] { next }
        { print }
        END { if (held != "") print held }
    ' "$1" > "$1.optics-tmp" && cat "$1.optics-tmp" > "$1" && rm -f "$1.optics-tmp"
}

# --------------------------------------------------------------- uninstall --
if [ "$UNINSTALL" -eq 1 ]; then
    # Only what this script created goes: --dir may point at a folder that holds
    # other things, such as your home directory.
    if [ ! -e "$VENV" ] && [ ! -e "$BIN/optics" ]; then
        say "Nothing to uninstall: there is no Optics install in $INSTALL_DIR."
        exit 0
    fi
    if [ "$DRY_RUN" -eq 1 ]; then
        say "Would remove $VENV and $BIN/optics, and the Optics PATH line from your shell profile."
        exit 0
    fi
    rm -rf "$VENV"
    rm -f "$BIN/optics"
    rmdir "$BIN" "$INSTALL_DIR" 2>/dev/null || true
    ok "Removed Optics from $INSTALL_DIR"
    if [ -e "$INSTALL_DIR" ]; then
        say "  ${DIM}$INSTALL_DIR holds other files, so it was left in place.${R}"
    fi
    for profile in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
        if remove_path_block "$profile" "$PATH_LINE"; then ok "Removed the PATH line from $profile"; fi
    done
    if remove_path_block "$FISH_PROFILE" "$FISH_LINE"; then
        if ! grep -q '[^[:space:]]' "$FISH_PROFILE"; then rm -f "$FISH_PROFILE"; fi
        ok "Removed the PATH line from $FISH_PROFILE"
    fi
    say ""
    say "Open a new terminal so the old PATH is gone there too."
    exit 0
fi

say ""
say "${B}Optics Framework installer${R}"
say ""

# Git Bash, MSYS2 and Cygwin give you a POSIX shell on top of a Windows Python,
# whose virtual environments put executables in Scripts\ rather than bin/. This
# script would install and then fail to find the CLI, so send them to the
# PowerShell installer instead of part-way through a broken install. WSL is a
# real Linux and reports as such, so it is unaffected.
case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
        die "This is the macOS and Linux installer, and you are on Windows." \
            "" "Run the PowerShell installer instead, from PowerShell:" \
            "" "  irm https://optics-framework.org/install.ps1 | iex" \
            "" "(Inside WSL, this script is the right one.)"
        ;;
esac

# ---------------------------------------------------------- existing copy --
# Re-running the install command is how most people upgrade, so look for every
# Optics already installed before creating anything. Each child command reads
# /dev/null: under `curl | sh` the rest of this script is still on stdin.

# Fields are split on the unit separator, which, unlike a tab, keeps empty ones.
SEP=$(printf '\037')

real_dir() { (cd "$1" 2>/dev/null && pwd -P); }

# The Python behind an optics launcher: its shebang, pip's /bin/sh trampoline
# for long or spaced paths, or this script's shim, followed to its venv.
launcher_python() {
    first=$(head -n 1 "$1" 2>/dev/null) || return 1
    case "$first" in
        '#!/bin/sh'*)
            second=$(sed -n 2p "$1")
            case "$second" in
                "'''exec' "*)
                    rest=${second#"'''exec' "}
                    case "$rest" in
                        \"*) rest=${rest#\"}; printf '%s\n' "${rest%%\"*}" ;;
                        \'*) rest=${rest#\'}; printf '%s\n' "${rest%%\'*}" ;;
                        *) printf '%s\n' "${rest%% *}" ;;
                    esac ;;
                'exec "'*) rest=${second#'exec "'}; launcher_python "${rest%%\"*}" ;;
                *) return 1 ;;
            esac ;;
        '#!'*)
            interp=${first#??}; interp=${interp# }
            case "$interp" in
                */env\ *) name=${interp#* }; name=${name%% *}; command -v "$name" ;;
                *) printf '%s\n' "${interp%% *}" ;;
            esac ;;
        *) return 1 ;;
    esac
}

# One line each: version, prefix, PEP 668 lock (1/0), pip present (1/0), and
# the extras whose packages are all installed, so an upgrade keeps them.
PROBE='import importlib.metadata as m, importlib.util as u, os, re, sys, sysconfig
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
locked = sys.prefix == sys.base_prefix and os.path.exists(os.path.join(sysconfig.get_path("stdlib"), "EXTERNALLY-MANAGED"))
print(d.version, sys.prefix, int(locked), int(u.find_spec("pip") is not None), ",".join(e for e, ns in need.items() if all(map(have, ns))), sep="\n")'

uv_tools() { if command -v uv >/dev/null 2>&1; then uv tool dir 2>/dev/null </dev/null; fi; }
pipx_venvs() { if command -v pipx >/dev/null 2>&1; then pipx environment --value PIPX_LOCAL_VENVS 2>/dev/null </dev/null; fi; }

# Every optics launcher: PATH order first, then this script's default install
# and tool environments whose bin folder is off PATH.
launchers() {
    set -f; old_ifs=$IFS; IFS=:
    for dir in $PATH; do
        if [ -n "$dir" ] && [ -f "$dir/optics" ] && [ -x "$dir/optics" ]; then printf '%s\n' "$dir/optics"; fi
    done
    IFS=$old_ifs; set +f
    if [ -x "$BIN/optics" ]; then printf '%s\n' "$BIN/optics"; fi
    for dir in "$(uv_tools)" "$(pipx_venvs)" "$HOME/.local/share/uv/tools" "$HOME/.local/pipx/venvs" "$HOME/.local/share/pipx/venvs"; do
        if [ -n "$dir" ] && [ -x "$dir/optics-framework/bin/optics" ]; then printf '%s\n' "$dir/optics-framework/bin/optics"; fi
    done
}

# installer, uv, pipx, project:<lockfile>, venv, locked or pip.
kind_of() {
    prefix=$1
    if [ "${prefix##*/}" = venv ] && grep -q '^exec ".*/venv/bin/optics"' "${prefix%/venv}/bin/optics" 2>/dev/null; then
        echo installer; return
    fi
    for tools in "$(uv_tools)" "$HOME/.local/share/uv/tools"; do
        tools=$(real_dir "$tools") || continue
        case "$prefix/" in "$tools"/*) echo uv; return ;; esac
    done
    case "$prefix/" in */uv/tools/*) echo uv; return ;; */pipx/venvs/*) echo pipx; return ;; esac
    if [ -f "$prefix/pyvenv.cfg" ]; then
        for lock in uv.lock poetry.lock pdm.lock Pipfile.lock; do
            if [ -f "${prefix%/*}/$lock" ]; then echo "project:$lock"; return; fi
        done
        echo venv; return
    fi
    if [ "$2" = 1 ]; then echo locked; else echo pip; fi
}

# One record per environment, first on PATH first:
# kind, prefix, python, launcher, version, pip (1/0), extras.
find_copies() {
    seen=""
    launchers | while IFS= read -r launcher; do
        case "$launcher" in
            */shims/optics) launcher=$({ pyenv which optics || asdf which optics; } 2>/dev/null </dev/null) || continue ;;
        esac
        python=$(launcher_python "$launcher") || continue
        [ -x "$python" ] || continue
        probe=$("$python" -c "$PROBE" 2>/dev/null </dev/null) || continue
        key=$(real_dir "$(printf '%s\n' "$probe" | sed -n 2p)")
        case "$seen" in *"$SEP$key$SEP"*) continue ;; esac
        seen="$seen$SEP$key$SEP"
        line() { printf '%s\n' "$probe" | sed -n "$1p"; }
        printf '%s\n' "$(kind_of "$key" "$(line 3)")$SEP$key$SEP$python$SEP$launcher$SEP$(line 1)$SEP$(line 4)$SEP$(line 5)"
    done
}

label() {
    case "$1" in
        uv) echo "uv tool" ;;
        pipx) echo "pipx" ;;
        project:*) echo "project" ;;
        venv) echo "virtual environment" ;;
        locked) echo "system Python" ;;
        *) echo "pip" ;;
    esac
}

join_extras() { printf '%s\n' "$@" | tr ',' '\n' | awk 'NF && !seen[$0]++' | paste -s -d, -; }

with_extras() {
    spec="$PACKAGE"
    if [ -n "$1" ]; then spec="${spec}[$1]"; fi
    if [ -n "$VERSION" ]; then spec="$spec==$VERSION"; fi
    printf '%s\n' "$spec"
}

removal() {
    case "$1" in
        installer)
            if [ "${2%/venv}" = "$(real_dir "$HOME/.optics")" ]; then echo "curl -fsSL https://optics-framework.org/install | sh -s -- --uninstall"
            else printf 'curl -fsSL https://optics-framework.org/install | sh -s -- --uninstall --dir "%s"\n' "${2%/venv}"; fi ;;
        uv) echo "uv tool uninstall $PACKAGE" ;;
        pipx) echo "pipx uninstall $PACKAGE" ;;
        project:*) echo "remove $PACKAGE from the project in ${2%/*}" ;;
        *) printf '"%s" -m pip uninstall %s\n' "$3" "$PACKAGE" ;;
    esac
}

run() {
    if [ "$DRY_RUN" -eq 1 ]; then step "would run: $*"; return 0; fi
    step "$*"
    "$@" </dev/null
}

project_command() {
    case "$1" in
        project:uv.lock) if [ -n "$VERSION" ]; then echo "uv add $PACKAGE==$VERSION"; else echo "uv sync --upgrade-package $PACKAGE"; fi ;;
        project:poetry.lock) echo "poetry add $PACKAGE@${VERSION:-latest}" ;;
        project:pdm.lock) if [ -n "$VERSION" ]; then echo "pdm add $PACKAGE==$VERSION"; else echo "pdm update --unconstrained $PACKAGE"; fi ;;
        *) if [ -n "$VERSION" ]; then echo "pipenv install $PACKAGE==$VERSION"; else echo "pipenv update $PACKAGE"; fi ;;
    esac
}

# A reinstall rather than `uv tool upgrade` or `pipx upgrade`, which keep the
# version pinned at install time; the spec carries the extras already there.
upgrade_tool() {
    command -v "$KIND" >/dev/null 2>&1 \
        || die "Optics $FOUND_VERSION is a $KIND tool, and $KIND is not on PATH." "" "Install $KIND, then run this script again."
    if [ "$KIND" = pipx ]; then
        run pipx install --force "$SPEC_OUT" || die "pipx could not install $SPEC_OUT."
    elif [ -n "$VERSION" ]; then
        run uv tool install "$SPEC_OUT" || die "uv could not install $SPEC_OUT."
    else
        run uv tool install "$SPEC_OUT@latest" || die "uv could not install $SPEC_OUT@latest."
    fi
}

upgrade_env() {
    if [ "$FOUND_PIP" = 1 ]; then
        run "$FOUND_PYTHON" -m pip install --quiet --disable-pip-version-check --upgrade "$SPEC_OUT" \
            || die "pip could not upgrade Optics in $FOUND_PREFIX."
    elif command -v uv >/dev/null 2>&1; then
        run uv pip install --quiet --python "$FOUND_PYTHON" --upgrade "$SPEC_OUT" \
            || die "uv could not upgrade Optics in $FOUND_PREFIX."
    else
        die "The environment in $FOUND_PREFIX has no pip, and uv is not on PATH." \
            "" "Upgrade it with the tool that created it."
    fi
}

upgrade_found() {
    case "$KIND" in
        uv|pipx) upgrade_tool ;;
        project:*)
            say "Optics $FOUND_VERSION belongs to the project in ${FOUND_PREFIX%/*}, and its lockfile sets the version."
            say "Upgrade it from that folder with:"
            say ""
            say "  $(project_command "$KIND")"
            say ""
            exit 0
            ;;
        locked)
            die "Optics $FOUND_VERSION is in the system Python at $FOUND_PYTHON, which only your OS package manager may change." \
                "" "Remove it, then run this script again for an install of its own:" \
                "" "  $(removal pip "$FOUND_PREFIX" "$FOUND_PYTHON") --break-system-packages"
            ;;
        *) upgrade_env ;;
    esac
}

warn_others() {
    printf '%s\n' "$COPIES" | sed 1d | while IFS="$SEP" read -r kind prefix python _ version _ _; do
        say ""
        say "  ${DIM}Optics $version is also installed in $prefix. Remove one copy so they do not drift:${R}"
        say "    $(removal "$kind" "$prefix" "$python")"
    done
}

KIND=""
FOUND_EXTRAS=""
COPIES=""
if [ "$DIR_SET" -eq 0 ]; then COPIES=$(find_copies); fi
if [ -n "$COPIES" ]; then
    IFS="$SEP" read -r KIND FOUND_PREFIX FOUND_PYTHON FOUND_LAUNCHER FOUND_VERSION FOUND_PIP FOUND_EXTRAS <<EOF
$(printf '%s\n' "$COPIES" | sed -n 1p)
EOF
fi

if [ "$KIND" = installer ]; then
    INSTALL_DIR="${FOUND_PREFIX%/venv}"
    set_paths
    ok "Found Optics $FOUND_VERSION in $INSTALL_DIR"
elif [ -n "$KIND" ]; then
    SPEC_OUT=$(with_extras "$(join_extras "$FOUND_EXTRAS" "$EXTRAS")")
    ok "Found Optics $FOUND_VERSION in $FOUND_PREFIX ($(label "$KIND"))"
    if [ "$DRY_RUN" -eq 1 ]; then say "Dry run — nothing will be changed."; fi
    upgrade_found
    if [ "$DRY_RUN" -eq 0 ]; then
        if ! VERSION_OUTPUT=$("$FOUND_LAUNCHER" --version 2>&1 </dev/null); then
            die "Upgraded, but optics could not start:" "" "$VERSION_OUTPUT"
        fi
        ok "$VERSION_OUTPUT"
    fi
    warn_others
    say ""
    say "${B}Agent:${R}   claude mcp add -s user optics -- \"$FOUND_LAUNCHER\" mcp"
    say ""
    exit 0
fi

# ------------------------------------------------------------------ python --
# Lowest supported version first, deliberately. Optics pulls opencv, scikit-image
# and (via easyocr) torch; on a just-released Python those have no wheels yet and
# pip falls back to source builds that take an age or fail outright.
find_python() {
    for candidate in python3.12 python3.13 python3.14 python3 python; do
        command -v "$candidate" >/dev/null 2>&1 || continue
        if "$candidate" -c 'import sys; sys.exit(0 if sys.version_info[:2] >= (3, 12) else 1)' 2>/dev/null; then
            command -v "$candidate"
            return 0
        fi
    done
    return 1
}

if ! PYTHON=$(find_python); then
    case "$(uname -s)" in
        Darwin) HOWTO="brew install python@3.12" ;;
        Linux)  HOWTO="sudo apt install python3.12 python3.12-venv   (or your distro's equivalent)" ;;
        *)      HOWTO="https://www.python.org/downloads/" ;;
    esac
    die "Optics needs Python 3.12 or newer, and no suitable Python was found." \
        "" "Install one, then re-run this script:" "" "  $HOWTO"
fi
PY_VERSION=$("$PYTHON" -c 'import sys; print("%d.%d.%d" % sys.version_info[:3])')
ok "Python $PY_VERSION at $PYTHON"

SPEC=$(with_extras "$(join_extras mcp "$FOUND_EXTRAS" "$EXTRAS")")

if [ "$DRY_RUN" -eq 1 ]; then
    say ""
    say "Dry run — nothing will be changed."
    if [ -x "$VENV/bin/python" ]; then step "reuse the virtual environment at $VENV"; else step "create virtual environment at $VENV"; fi
    step "install $SPEC into it"
    step "link the optics CLI into $BIN"
    if [ "$MODIFY_PATH" -eq 1 ]; then
        step "add $BIN to PATH in your shell profile"
    fi
    warn_others
    say ""
    exit 0
fi

# ------------------------------------------------------------------- venv ---
if [ -x "$VENV/bin/python" ]; then
    ok "Reusing the environment at $VENV"
else
    step "Creating a virtual environment at $VENV"
    mkdir -p "$INSTALL_DIR"
    if ! VENV_ERROR=$("$PYTHON" -m venv "$VENV" 2>&1); then
        # Debian and Ubuntu ship venv separately, so ensurepip is missing on an
        # otherwise perfectly good Python. That is the most common Linux failure
        # here and the error text alone does not say what to install.
        if printf '%s' "$VENV_ERROR" | grep -q 'ensurepip'; then
            PY_MM=$("$PYTHON" -c 'import sys; print("%d.%d" % sys.version_info[:2])')
            die "This Python cannot create virtual environments." \
                "" "Debian and Ubuntu ship that support in a separate package:" \
                "" "  sudo apt install python${PY_MM}-venv" \
                "" "Then re-run this script."
        fi
        die "Could not create a virtual environment at $VENV." "" "$VENV_ERROR"
    fi
fi

# ---------------------------------------------------------------- install ---
step "Installing $SPEC"
if ! "$VENV/bin/python" -m pip install --quiet --disable-pip-version-check --upgrade "$SPEC" </dev/null; then
    die "pip could not install $SPEC." \
        "" "Re-run with --version to pin a known-good release, or see" \
        "  https://pypi.org/project/optics-framework/"
fi

if [ ! -x "$VENV/bin/optics" ]; then
    die "The package installed but no optics command appeared in $VENV/bin."
fi

# ------------------------------------------------------------------- shim ---
mkdir -p "$BIN"
cat > "$BIN/optics" <<EOF
#!/bin/sh
exec "$VENV/bin/optics" "\$@"
EOF
chmod +x "$BIN/optics"

# Run the CLI rather than trusting the install: a package can land correctly
# and still fail to start if a system library it links against is missing.
# Optics diagnoses that itself and names the library, so show what it said
# instead of guessing at the cause here.
if ! VERSION_OUTPUT=$("$BIN/optics" --version 2>&1 </dev/null); then
    printf '\n%sInstalled, but optics could not start:%s\n\n' "$RED" "$R" >&2
    printf '%s\n' "$VERSION_OUTPUT" >&2
    printf '\nFix the above, then run:  %s --version\n' "$BIN/optics" >&2
    exit 1
fi
ok "$VERSION_OUTPUT"

# -------------------------------------------------------------------- PATH --
profile_for_shell() {
    case "$(basename "${SHELL:-/bin/sh}")" in
        zsh)  printf '%s\n' "$HOME/.zshrc" ;;
        bash) if [ "$(uname -s)" = "Darwin" ]; then printf '%s\n' "$HOME/.bash_profile"
              else printf '%s\n' "$HOME/.bashrc"; fi ;;
        fish) printf '%s\n' "$HOME/.config/fish/conf.d/optics.fish" ;;
        *)    printf '%s\n' "$HOME/.profile" ;;
    esac
}

on_path() {
    case ":$PATH:" in *":$BIN:"*) return 0 ;; *) return 1 ;; esac
}

say ""
if on_path; then
    ok "$BIN is already on your PATH"
elif [ "$MODIFY_PATH" -eq 0 ]; then
    say "Add this to your shell profile to put optics on your PATH:"
    say ""
    say "  export PATH=\"$BIN:\$PATH\""
else
    PROFILE=$(profile_for_shell)
    mkdir -p "$(dirname "$PROFILE")"
    case "$PROFILE" in
        *fish*) LINE="$FISH_LINE" ;;
        *)      LINE="$PATH_LINE" ;;
    esac
    # Match this install's own line: an earlier install elsewhere left a block
    # pointing at a different folder.
    if grep -qxF "$LINE" "$PROFILE" 2>/dev/null; then
        ok "Your PATH is already configured in $PROFILE"
    else
        printf '\n# Optics Framework\n%s\n' "$LINE" >> "$PROFILE"
        ok "Added $BIN to your PATH in $PROFILE"
    fi
    say ""
    say "  ${DIM}Open a new terminal, or run:${R} export PATH=\"$BIN:\$PATH\""
fi

warn_others
say ""
say "${B}Next:${R}    optics quickstart"
say "         ${DIM}Builds a project, checks your setup, and runs your first test.${R}"
say "${B}Agent:${R}   claude mcp add -s user optics -- \"$BIN/optics\" mcp"
say "         ${DIM}Lets your AI agent drive apps. Start a new agent session to see the tools.${R}"
say "${B}Desktop:${R} https://optics-framework.org/docs/platforms/desktop?ref=installer"
say "${B}Docs:${R}    https://optics-framework.org/docs/get-started/first-test?ref=installer"
say ""
