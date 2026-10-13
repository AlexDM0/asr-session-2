#!/usr/bin/env bash
#
# setup.sh - turn every project folder of the session 2 repository into its own git repository and
# install what each project needs, on macOS, Linux or Git Bash.
#
#   1. Checks that git works and that this folder is not inside another git repository
#   2. Removes the .git of this folder, after asking: the clone's history goes, every file stays
#   3. Spec Kit: installs its speckit-* skills in 1-mijn-duinzicht/ with specify init, through uv
#   4. git init and a first commit in 1-mijn-duinzicht/ and 2-duinzicht-products-mcp/
#   5. Bun: checks that it works, offers the official installer when it is missing
#   6. bun install in 1-mijn-duinzicht/ and 2-duinzicht-products-mcp/
#
# One repository per project keeps the agent inside the project: Copilot CLI and worktree sessions
# work from the git root. Safe to run again: every step checks before it changes anything. On Git
# Bash it hands off to setup.ps1, so Windows has one installer.
#
# Usage: ./setup.sh

# This script relies on bashisms ([[ ]], local, arrays, pipefail). Refuse a plain POSIX sh with a
# friendly line instead of an opaque syntax error.
if [ -z "${BASH_VERSION:-}" ]; then
  echo "Please run this script with bash:  bash setup.sh" >&2
  exit 1
fi

set -euo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPT_DIRECTORY"

PROJECT_FOLDERS=("1-mijn-duinzicht" "2-duinzicht-products-mcp")
RECOMMENDED_BUN_VERSION="1.4.2"
SPEC_KIT_PROJECT_FOLDER="1-mijn-duinzicht"
SPEC_KIT_SOURCE="git+https://github.com/github/spec-kit.git@v1.1.3"
FIRST_COMMIT_MESSAGE="Starter"
FALLBACK_AUTHOR_NAME="Duinzicht workshop"
FALLBACK_AUTHOR_EMAIL="workshop@duinzicht.example"

for argument in "$@"; do
  case "$argument" in
    -h|--help) echo "Usage: ./setup.sh"; exit 0 ;;
    *)         printf 'Unknown option: %s\nUsage: ./setup.sh\n' "$argument" >&2; exit 1 ;;
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

# On Git Bash hand everything to setup.ps1: it knows where Windows installers put Bun.
# WSL reports Linux and stays here.
if [ "$PLATFORM" = "windows" ] && command -v powershell.exe >/dev/null 2>&1; then
  info "Windows detected, handing off to setup.ps1..."
  POWERSHELL_SCRIPT="$SCRIPT_DIRECTORY/setup.ps1"
  if command -v cygpath >/dev/null 2>&1; then POWERSHELL_SCRIPT="$(cygpath -w "$POWERSHELL_SCRIPT")"; fi
  exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$POWERSHELL_SCRIPT"
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

bold "Splitting the session 2 repository into one repository per project ($PLATFORM)"

# --- 1. Checks ---------------------------------------------------------------
step "1/6 Checks"
if ! command -v git >/dev/null 2>&1; then
  error_message "git was not found. Install it from https://git-scm.com and run ./setup.sh again."
  exit 1
fi
ok "$(git --version) works."

for project_folder in "${PROJECT_FOLDERS[@]}"; do
  if [ ! -d "$project_folder" ]; then
    error_message "The folder $project_folder is missing. Run this script from the session 2 repository folder."
    exit 1
  fi
done

# Nested repositories inside someone else's repository would turn up there as embedded repositories.
if enclosing_repository="$(git -C "$SCRIPT_DIRECTORY/.." rev-parse --show-toplevel 2>/dev/null)"; then
  error_message "This folder is inside another git repository: $enclosing_repository"
  info "Copy the folder somewhere outside that repository and run ./setup.sh there."
  exit 1
fi
ok "This folder is not inside another git repository."

# --- 2. Remove the repository of this folder -----------------------------------
step "2/6 Remove the repository of this folder"
if [ -e ".git" ]; then
  info "Every project gets its own repository, so the agent stays inside its project folder."
  info "This removes $SCRIPT_DIRECTORY/.git: the history of this clone goes, every file stays."
  if ! offer "Remove it now?"; then
    error_message "Nothing changed. Run ./setup.sh again when you are ready."
    exit 1
  fi
  rm -rf ".git"
  ok "Removed."
else
  ok "This folder is no repository any more."
fi

# --- 3. Spec Kit ---------------------------------------------------------------
# Before the first commit, so the skills are part of it. specify init keeps the starter's own
# constitution, templates and scripts; it only adds the skills and its own metadata.
step "3/6 Spec Kit"
if [ -d "$SPEC_KIT_PROJECT_FOLDER/.github/skills/speckit-specify" ]; then
  ok "The Spec Kit skills are already in $SPEC_KIT_PROJECT_FOLDER."
else
  UV_BIN_DIRECTORY="$HOME/.local/bin"
  # A uv installed in another terminal is only on this terminal's PATH after a restart.
  if [ -d "$UV_BIN_DIRECTORY" ]; then export PATH="$UV_BIN_DIRECTORY:$PATH"; fi
  if ! command -v uvx >/dev/null 2>&1; then
    error_message "uv was not found. Spec Kit installs through uv."
    if offer "Install uv now with the official installer (curl -LsSf https://astral.sh/uv/install.sh | sh)?" &&
       command -v curl >/dev/null 2>&1 &&
       curl -LsSf https://astral.sh/uv/install.sh | sh; then
      export PATH="$UV_BIN_DIRECTORY:$PATH"
    fi
    if ! command -v uvx >/dev/null 2>&1; then
      error_message "uv is required for Spec Kit. Install it from https://docs.astral.sh/uv/ and run ./setup.sh again."
      exit 1
    fi
  fi
  info "Installing the Spec Kit skills in $SPEC_KIT_PROJECT_FOLDER..."
  if ! specify_output="$(cd "$SPEC_KIT_PROJECT_FOLDER" && uvx --from "$SPEC_KIT_SOURCE" specify init --here --force --non-interactive \
       --integration copilot --integration-options="--skills" --script sh --ignore-agent-tools 2>&1)"; then
    printf '%s\n' "$specify_output"
    error_message "specify init failed. Check your internet connection (or HTTPS_PROXY behind a proxy) and run ./setup.sh again."
    exit 1
  fi
  ok "The Spec Kit skills are in $SPEC_KIT_PROJECT_FOLDER/.github/skills."
fi

# --- 4. One repository per project --------------------------------------------------
step "4/6 One repository per project"
commit_identity=()
if [ -z "$(git config --get user.name || true)" ] || [ -z "$(git config --get user.email || true)" ]; then
  info "git has no name and email set up, so the first commits use \"$FALLBACK_AUTHOR_NAME\"."
  info "Set your own for later commits:  git config --global user.name \"Your Name\""
  commit_identity=(-c "user.name=$FALLBACK_AUTHOR_NAME" -c "user.email=$FALLBACK_AUTHOR_EMAIL")
fi

for project_folder in "${PROJECT_FOLDERS[@]}"; do
  if [ -e "$project_folder/.git" ]; then
    ok "$project_folder is already its own repository."
    continue
  fi
  # symbolic-ref instead of init --initial-branch, which git before 2.28 does not know.
  if git -C "$project_folder" init --quiet &&
     git -C "$project_folder" symbolic-ref HEAD refs/heads/main &&
     git -C "$project_folder" add --all &&
     git -C "$project_folder" ${commit_identity[@]+"${commit_identity[@]}"} commit --quiet --message "$FIRST_COMMIT_MESSAGE"; then
    ok "$project_folder is its own repository, with a first commit on main."
  else
    error_message "Making $project_folder a repository failed. Read the messages above and run ./setup.sh again."
    exit 1
  fi
done

# --- 5. Bun ------------------------------------------------------------------
step "5/6 Bun"
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

# --- 6. Dependencies -------------------------------------------------------------
step "6/6 Dependencies"
for project_folder in "${PROJECT_FOLDERS[@]}"; do
  info "Running bun install in $project_folder..."
  if ! (cd "$project_folder" && bun install); then
    error_message "bun install failed in $project_folder. Check your internet connection (or HTTPS_PROXY behind a proxy) and run ./setup.sh again."
    exit 1
  fi
done
ok "Every project is installed."

echo
info "Next: open the 1-mijn-duinzicht folder in VS Code and start the portal there with:  bun run dev"
