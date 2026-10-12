#!/usr/bin/env bash
#
# setup.sh - get the Mijn Duinzicht portal running on macOS, Linux or Git Bash.
#
#   1. Bun: checks that it works, offers the official installer when it is missing
#   2. bun install
#   3. bun run dev in the foreground: the portal on http://localhost:3000
#
# Safe to run again: every step checks before it changes anything. On Git Bash it hands off to
# setup.ps1, so Windows has one installer.
#
# Usage: ./setup.sh [--no-start]
#   --no-start  stop after bun install; start the portal yourself with `bun run dev`.

# This script relies on bashisms ([[ ]], local, pipefail). Refuse a plain POSIX sh with a friendly
# line instead of an opaque syntax error.
if [ -z "${BASH_VERSION:-}" ]; then
  echo "Please run this script with bash:  bash setup.sh" >&2
  exit 1
fi

set -euo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPT_DIRECTORY"

PROJECT_TITLE="the Mijn Duinzicht portal"
RECOMMENDED_BUN_VERSION="1.4.2"
RUNNING_MESSAGE="The portal runs on http://localhost:${DUINZICHT_WEB_PORT:-3000}."

USAGE="Usage: ./setup.sh [--no-start]"
START_AFTER_INSTALL=1
for argument in "$@"; do
  case "$argument" in
    --no-start) START_AFTER_INSTALL=0 ;;
    -h|--help)  echo "$USAGE"; exit 0 ;;
    *)          printf 'Unknown option: %s\n%s\n' "$argument" "$USAGE" >&2; exit 1 ;;
  esac
done

# --- Output helpers --------------------------------------------------------
bold() { printf '\033[1m%s\033[0m\n' "$1"; }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }
info() { printf '\033[36m•\033[0m %s\n' "$1"; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '\033[33m!\033[0m %s\n' "$1"; }
error_message() { printf '\033[31m✗\033[0m %s\n' "$1" >&2; }

# offer "question" -> 0 when the answer is yes. No terminal to answer from counts as no.
offer() {
  local answer=""
  read -r -p "  $1 [y/N] " answer || true
  [[ "$answer" == "y" || "$answer" == "Y" ]]
}

# --- Detect the platform -----------------------------------------------------
case "$(uname -s 2>/dev/null || echo unknown)" in
  Darwin*)                       PLATFORM="macos" ;;
  Linux*)                        PLATFORM="linux" ;;
  MINGW*|MSYS*|CYGWIN*|Windows*) PLATFORM="windows" ;;
  *)                             PLATFORM="unknown" ;;
esac

bold "Setting up $PROJECT_TITLE ($PLATFORM)"

# On Git Bash hand everything to setup.ps1: it knows where Windows installers put Bun.
# WSL reports Linux and stays here.
if [ "$PLATFORM" = "windows" ] && command -v powershell.exe >/dev/null 2>&1; then
  info "Windows detected, handing off to setup.ps1..."
  POWERSHELL_SCRIPT="$SCRIPT_DIRECTORY/setup.ps1"
  if command -v cygpath >/dev/null 2>&1; then POWERSHELL_SCRIPT="$(cygpath -w "$POWERSHELL_SCRIPT")"; fi
  if [ "$START_AFTER_INSTALL" = "1" ]; then
    exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$POWERSHELL_SCRIPT"
  else
    exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$POWERSHELL_SCRIPT" -NoStart
  fi
fi

print_bun_install_help() {
  echo
  info "Install Bun yourself, then run ./setup.sh again in a new terminal:"
  echo "    curl -fsSL https://bun.sh/install | bash"
  info "More information: https://bun.sh/docs/installation"
}

# True when directory $1 is one of the entries of $2, a PATH-style list.
path_list_contains() {
  case ":$2:" in
    *":$1:"*) return 0 ;;
    *)        return 1 ;;
  esac
}

# The startup file a new terminal of the login shell reads, or nothing for a shell this script
# leaves alone.
shell_startup_file() {
  case "$(basename "${SHELL:-}")" in
    zsh)  echo "${ZDOTDIR:-$HOME}/.zshrc" ;;
    bash) if [ "$PLATFORM" = "macos" ]; then echo "$HOME/.bash_profile"; else echo "$HOME/.bashrc"; fi ;;
  esac
}

append_bun_to_startup_file() {
  printf '\n# Bun\nexport BUN_INSTALL="%s"\nexport PATH="$BUN_INSTALL/bin:$PATH"\n' "$BUN_INSTALL_ROOT" >> "$1"
}

# Bun's installer only edits a startup file that already exists, so on a Mac without ~/.zshrc new
# terminals would not find bun.
make_new_terminals_find_bun() {
  local startup_file
  startup_file="$(shell_startup_file)"
  if [ -z "$startup_file" ] || grep -qsE 'BUN_INSTALL|\.bun/bin' "$startup_file"; then return 0; fi
  warn "$BUN_BIN_DIRECTORY is not on your PATH yet, so a new terminal does not find bun."
  if offer "Add it to $startup_file now?" && append_bun_to_startup_file "$startup_file" 2>/dev/null; then
    ok "Added. It takes effect in new terminals."
  else
    info "Add these lines to $startup_file yourself, then open a new terminal:"
    echo "    export BUN_INSTALL=\"$BUN_INSTALL_ROOT\""
    echo '    export PATH="$BUN_INSTALL/bin:$PATH"'
  fi
}

# True when version $1 is older than version $2. Both are plain x.y.z numbers.
version_is_older() {
  local IFS=.
  local -a current_parts=($1) minimum_parts=($2)
  local i
  for i in 0 1 2; do
    if (( 10#${current_parts[i]:-0} < 10#${minimum_parts[i]:-0} )); then return 0; fi
    if (( 10#${current_parts[i]:-0} > 10#${minimum_parts[i]:-0} )); then return 1; fi
  done
  return 1
}

# --- 1. Bun ------------------------------------------------------------------
step "1/3 Bun"
# The PATH this terminal started with, to tell whether a new terminal finds Bun too.
ORIGINAL_PATH="$PATH"
BUN_INSTALL_ROOT="${BUN_INSTALL:-$HOME/.bun}"
BUN_BIN_DIRECTORY="$BUN_INSTALL_ROOT/bin"
# A Bun installed in another terminal is only on this terminal's PATH after a restart.
if [ -d "$BUN_BIN_DIRECTORY" ]; then export PATH="$BUN_BIN_DIRECTORY:$PATH"; fi

if ! command -v bun >/dev/null 2>&1; then
  error_message "Bun was not found."
  if offer "Install Bun now with the official installer (curl -fsSL https://bun.sh/install | bash)?"; then
    if ! command -v curl >/dev/null 2>&1; then
      error_message "curl is needed to download Bun and was not found."
      print_bun_install_help
      exit 1
    fi
    if ! curl -fsSL https://bun.sh/install | bash; then
      error_message "The Bun installer did not finish."
      print_bun_install_help
      exit 1
    fi
    export PATH="$BUN_BIN_DIRECTORY:$PATH"
    if ! command -v bun >/dev/null 2>&1; then
      error_message "Bun was installed but this terminal cannot find it. Open a new terminal and run ./setup.sh again."
      exit 1
    fi
  else
    error_message "Bun is required."
    print_bun_install_help
    exit 1
  fi
fi

# A broken or half-finished install is found on PATH but fails here.
if ! BUN_VERSION="$(bun --version 2>/dev/null)"; then
  error_message "Found bun at $(command -v bun), but it does not run. The install looks broken."
  print_bun_install_help
  exit 1
fi
ok "Bun $BUN_VERSION works ($(command -v bun))."
if [ "$(dirname "$(command -v bun)")" = "$BUN_BIN_DIRECTORY" ] && ! path_list_contains "$BUN_BIN_DIRECTORY" "$ORIGINAL_PATH"; then
  make_new_terminals_find_bun
fi

BUN_RELEASE_VERSION="${BUN_VERSION%%-*}"
if [[ "$BUN_RELEASE_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] && version_is_older "$BUN_RELEASE_VERSION" "$RECOMMENDED_BUN_VERSION"; then
  warn "Bun $RECOMMENDED_BUN_VERSION or newer is recommended. Update it with:  bun upgrade"
fi

# --- 2. Dependencies -----------------------------------------------------------
step "2/3 Dependencies"
info "Running bun install..."
if ! bun install; then
  error_message "bun install failed. Check your internet connection (or HTTPS_PROXY behind a proxy) and run ./setup.sh again."
  exit 1
fi
ok "Dependencies installed."

# --- 3. Start ------------------------------------------------------------------
step "3/3 Start $PROJECT_TITLE"
if [ "$START_AFTER_INSTALL" = "0" ]; then
  info "Skipped (--no-start). Start it yourself with:"
  echo "    bun run dev"
  exit 0
fi

info "Starting bun run dev. $RUNNING_MESSAGE"
info "Leave this terminal open while you work. Stop it with Ctrl+C."
echo
exec bun run dev
