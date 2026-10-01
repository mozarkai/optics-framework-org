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
# Options (curl ... | sh -s -- <options>):
#   --version X.Y.Z    install a specific release        [$OPTICS_VERSION]
#   --extra a,b        also install engine extras, e.g. --extra appium,llm
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

if [ -n "${OPTICS_NO_MODIFY_PATH:-}" ]; then MODIFY_PATH=0; fi

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
  --extra a,b        also install engine extras, e.g. --extra appium,llm
  --dir PATH         install somewhere else            [$OPTICS_INSTALL_DIR]
  --no-modify-path   do not touch your shell profile   [$OPTICS_NO_MODIFY_PATH]
  --dry-run          print what would happen, change nothing
  --uninstall        remove the managed install
  --help             show this message

Optics is installed into its own virtual environment under ~/.optics; nothing
is installed into your system Python. Python 3.12+ is the one prerequisite.
USAGE
    exit 0
}

while [ $# -gt 0 ]; do
    case "$1" in
        --version) VERSION="${2:?--version needs a value}"; shift 2 ;;
        --version=*) VERSION="${1#*=}"; shift ;;
        --extra) EXTRAS="${2:?--extra needs a value}"; shift 2 ;;
        --extra=*) EXTRAS="${1#*=}"; shift ;;
        --dir) INSTALL_DIR="${2:?--dir needs a value}"; shift 2 ;;
        --dir=*) INSTALL_DIR="${1#*=}"; shift ;;
        --no-modify-path) MODIFY_PATH=0; shift ;;
        --dry-run) DRY_RUN=1; shift ;;
        --uninstall) UNINSTALL=1; shift ;;
        -h|--help) usage ;;
        *) die "unknown option '$1'" "Run with --help to see the options." ;;
    esac
done

VENV="$INSTALL_DIR/venv"
BIN="$INSTALL_DIR/bin"

# --------------------------------------------------------------- uninstall --
if [ "$UNINSTALL" -eq 1 ]; then
    if [ ! -d "$INSTALL_DIR" ]; then
        say "Nothing to uninstall: $INSTALL_DIR does not exist."
        exit 0
    fi
    if [ "$DRY_RUN" -eq 1 ]; then
        say "Would remove $INSTALL_DIR"
        exit 0
    fi
    rm -rf "$INSTALL_DIR"
    ok "Removed $INSTALL_DIR"
    say ""
    say "If you added it to your PATH, remove the Optics Framework block from"
    say "your shell profile."
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

SPEC="$PACKAGE"
if [ -n "$EXTRAS" ]; then SPEC="${SPEC}[${EXTRAS}]"; fi
if [ -n "$VERSION" ]; then SPEC="${SPEC}==${VERSION}"; fi

if [ "$DRY_RUN" -eq 1 ]; then
    say ""
    say "Dry run — nothing will be changed."
    step "create virtual environment at $VENV"
    step "install $SPEC into it"
    step "link the optics CLI into $BIN"
    if [ "$MODIFY_PATH" -eq 1 ]; then
        step "add $BIN to PATH in your shell profile"
    fi
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
if ! "$VENV/bin/python" -m pip install --quiet --disable-pip-version-check --upgrade "$SPEC"; then
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
if ! VERSION_OUTPUT=$("$BIN/optics" --version 2>&1); then
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
    if grep -q 'Optics Framework' "$PROFILE" 2>/dev/null; then
        ok "Your PATH is already configured in $PROFILE"
    else
        # shellcheck disable=SC2016  # $PATH must land in the profile literally
        case "$PROFILE" in
            *fish*) LINE=$(printf 'fish_add_path "%s"' "$BIN") ;;
            *)      LINE=$(printf 'export PATH="%s:$PATH"' "$BIN") ;;
        esac
        printf '\n# Optics Framework\n%s\n' "$LINE" >> "$PROFILE"
        ok "Added $BIN to your PATH in $PROFILE"
    fi
    say ""
    say "  ${DIM}Open a new terminal, or run:${R} export PATH=\"$BIN:\$PATH\""
fi

say ""
say "${B}Next:${R} optics quickstart"
say "      ${DIM}Builds a project, checks your setup, and runs your first test.${R}"
say ""
