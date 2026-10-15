#!/usr/bin/env bash
#
# setup.sh - turn every project folder of the session 2 repository into its own git repository and
# install what each project needs, on macOS, Linux or Git Bash. Runs unattended.
#
#   1. Checks that git works and that this folder is not inside another git repository
#   2. Removes the .git of this folder when it holds no work that exists nowhere else
#   3. Python 3.13 as the default python, and Spec Kit's specify CLI on it, both through uv; then the
#      speckit-* skills in 1-mijn-duinzicht/ with specify init
#   4. git init and a first commit in 1-mijn-duinzicht/ and 2-duinzicht-products-mcp/
#   5. Bun: checks that it works, installs it with the official installer when it is missing
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
# The tag archive instead of git+https: uv downloads it itself, so neither git nor git's proxy and
# certificate settings are needed.
SPEC_KIT_SOURCE="https://github.com/github/spec-kit/archive/refs/tags/v1.1.3.zip"
# specify-cli runs on this Python, not on whatever uv finds first: its dependencies, PyYAML among
# them, have wheels for it, so nothing has to be built from source.
PYTHON_VERSION="3.13"
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

# Downloads installer script $1 and runs it with shell $2, with curl or else wget.
run_official_installer() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$1" | "$2"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- "$1" | "$2"
  else
    error_message "Neither curl nor wget was found, so $1 cannot be downloaded."
    return 1
  fi
}

# True when directory $1 is one of the entries of $2, a PATH-style list.
path_list_contains() {
  case ":$2:" in
    *":$1:"*) return 0 ;;
    *)        return 1 ;;
  esac
}

# True when project folder $1 is a repository with at least one commit.
has_first_commit() {
  git -C "$1" rev-parse --verify --quiet HEAD >/dev/null 2>&1
}

# Prints why removing the .git of this folder would lose work, or nothing when it is safe. Any git
# error counts as unsafe, so a repository git cannot read is never removed blindly.
describe_work_only_in_this_clone() {
  local git_output
  if ! git_output="$(git status --porcelain 2>&1)"; then
    printf 'git cannot read this repository:\n%s\n' "$git_output"; return
  fi
  if [ -n "$git_output" ]; then echo "It has changed or new files."; return; fi
  if [ -n "$(git stash list 2>/dev/null)" ]; then echo "It has stashed changes."; return; fi
  if git rev-parse --verify --quiet HEAD >/dev/null &&
     [ -n "$(git rev-list HEAD --not --remotes 2>/dev/null | head -n 1)" ]; then
    echo "It has commits that are on no remote."
  fi
}

# The startup file a new terminal of the login shell reads, or nothing for a shell this script
# leaves alone. A new ~/.bash_profile would hide an existing ~/.profile from bash, so that one only
# when it already exists.
shell_startup_file() {
  case "$(basename "${SHELL:-}")" in
    zsh)  echo "${ZDOTDIR:-$HOME}/.zshrc" ;;
    bash)
      if [ "$PLATFORM" != "macos" ]; then echo "$HOME/.bashrc"
      elif [ -f "$HOME/.bash_profile" ]; then echo "$HOME/.bash_profile"
      elif [ -f "$HOME/.bash_login" ]; then echo "$HOME/.bash_login"
      else echo "$HOME/.profile"
      fi ;;
  esac
}

# Bun's installer only edits a startup file that already exists, so on a Mac without ~/.zshrc new
# terminals would not find bun.
make_new_terminals_find_bun() {
  local startup_file
  startup_file="$(shell_startup_file)"
  if [ -z "$startup_file" ] || grep -qsE 'BUN_INSTALL|\.bun/bin' "$startup_file"; then return 0; fi
  info "$BUN_BIN_DIRECTORY is not on your PATH yet. Adding it to $startup_file..."
  if printf '\n# Bun\nexport BUN_INSTALL="%s"\nexport PATH="$BUN_INSTALL/bin:$PATH"\n' "$BUN_INSTALL_ROOT" >> "$startup_file" 2>/dev/null; then
    ok "Added. It takes effect in new terminals."
  else
    warn "Could not write $startup_file. Add these lines to it yourself, then open a new terminal:"
    echo "    export BUN_INSTALL=\"$BUN_INSTALL_ROOT\""
    echo '    export PATH="$BUN_INSTALL/bin:$PATH"'
  fi
}

# Bun brings its own certificate bundle. A TLS-inspecting proxy re-signs traffic with a company
# certificate that only the system store trusts, so hand bun the system's certificates as well.
export_system_certificates_for_bun() {
  if [ -n "${NODE_EXTRA_CA_CERTS:-}" ]; then return 0; fi
  local certificate_file
  case "$PLATFORM" in
    macos)
      certificate_file="${TMPDIR:-/tmp}/duinzicht-system-certificates.pem"
      if security find-certificate -a -p /Library/Keychains/System.keychain \
           /System/Library/Keychains/SystemRootCertificates.keychain > "$certificate_file" 2>/dev/null &&
         [ -s "$certificate_file" ]; then
        export NODE_EXTRA_CA_CERTS="$certificate_file"
      fi ;;
    linux)
      for certificate_file in /etc/ssl/certs/ca-certificates.crt /etc/pki/tls/certs/ca-bundle.crt /etc/ssl/cert.pem; do
        if [ -s "$certificate_file" ]; then export NODE_EXTRA_CA_CERTS="$certificate_file"; return 0; fi
      done ;;
  esac
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
# On a Mac without the developer tools, /usr/bin/git exists but only offers to install them.
if ! command -v git >/dev/null 2>&1 || ! git_version="$(git --version 2>/dev/null)"; then
  error_message "git does not work yet. Install it from https://git-scm.com (on a Mac: xcode-select --install) and run ./setup.sh again."
  exit 1
fi
ok "$git_version works."

for project_folder in "${PROJECT_FOLDERS[@]}"; do
  if [ ! -d "$project_folder" ]; then
    error_message "The folder $project_folder is missing. Run this script from the session 2 repository folder."
    exit 1
  fi
done

# Nested repositories inside someone else's repository would turn up there as embedded repositories.
# Any answer but "not a git repository" counts as inside one, so an unreadable parent never passes.
if enclosing_output="$(LC_ALL=C git -C "$SCRIPT_DIRECTORY/.." rev-parse --show-toplevel 2>&1)" ||
   ! printf '%s' "$enclosing_output" | grep -qi "not a git repository"; then
  error_message "This folder is inside another git repository, or git cannot tell:"
  printf '%s\n' "$enclosing_output" >&2
  info "Copy the folder somewhere outside that repository and run ./setup.sh there."
  exit 1
fi
ok "This folder is not inside another git repository."

# --- 2. Remove the repository of this folder -----------------------------------
step "2/6 Remove the repository of this folder"
if [ -e ".git" ]; then
  work_only_in_this_clone="$(describe_work_only_in_this_clone)"
  if [ -n "$work_only_in_this_clone" ]; then
    error_message "This folder's repository holds work that exists nowhere else, so setup leaves it alone."
    printf '%s\n' "$work_only_in_this_clone" >&2
    info "Push or remove that work, or clone the repository again in a new folder, and run ./setup.sh there."
    exit 1
  fi
  info "Every project gets its own repository, so the agent stays inside its project folder."
  if ! rm -rf ".git"; then
    error_message "Could not remove $SCRIPT_DIRECTORY/.git. Close programs that use this folder and run ./setup.sh again."
    exit 1
  fi
  ok "Removed $SCRIPT_DIRECTORY/.git: the history of this clone is gone, every file stays."
else
  ok "This folder is no repository any more."
fi

# Puts every project rule in $1/.github/skill-overrides/<skill>.md at the top of that Spec Kit
# skill, right after its front matter. specify init writes the skills fresh, so this runs after it.
apply_skill_overrides() {
  local override_file skill_name skill_file override_heading
  for override_file in "$1"/.github/skill-overrides/*.md; do
    [ -f "$override_file" ] || continue
    skill_name="$(basename "$override_file" .md)"
    skill_file="$1/.github/skills/$skill_name/SKILL.md"
    if [ ! -f "$skill_file" ]; then
      warn "The Spec Kit skill $skill_name is missing, so its project rule is not applied."
      continue
    fi
    override_heading="$(head -n 1 "$override_file")"
    if grep -qF -- "$override_heading" "$skill_file"; then continue; fi
    awk -v override_file="$override_file" '
      { print }
      /^---[[:space:]]*$/ && ++dashes == 2 {
        print ""
        while ((getline line < override_file) > 0) print line
        close(override_file)
      }
    ' "$skill_file" > "$skill_file.tmp" && mv "$skill_file.tmp" "$skill_file"
    ok "Applied the project rule to the Spec Kit skill $skill_name."
  done
}

# --- 3. Python and Spec Kit ------------------------------------------------------
# Python and specify-cli on every run. The skills before the first commit, so they are part of it.
# specify init --force keeps the starter's constitution and rewrites the templates and scripts in
# .specify with Spec Kit's own; it adds the skills and its metadata. Until that first commit exists
# it runs every time, so an interrupted run never leaves half the skills behind.
step "3/6 Python and Spec Kit"
# The PATH this terminal started with, to tell whether a new terminal finds python and specify too.
PATH_BEFORE_UV="$PATH"
UV_BIN_DIRECTORY="${UV_INSTALL_DIR:-${XDG_BIN_HOME:-$HOME/.local/bin}}"
# A uv installed in another terminal is only on this terminal's PATH after a restart.
if [ -d "$UV_BIN_DIRECTORY" ]; then export PATH="$UV_BIN_DIRECTORY:$PATH"; fi
if ! command -v uv >/dev/null 2>&1; then
  info "uv was not found; Python and Spec Kit install through it. Installing uv with the official installer (https://astral.sh/uv/install.sh)..."
  if run_official_installer https://astral.sh/uv/install.sh sh; then
    export PATH="$UV_BIN_DIRECTORY:$PATH"
  fi
  if ! command -v uv >/dev/null 2>&1; then
    error_message "uv is required for Python and Spec Kit. Install it from https://docs.astral.sh/uv/ and run ./setup.sh again."
    exit 1
  fi
fi
# A TLS-inspecting proxy re-signs traffic with a company certificate that only the system store
# trusts; uv's own certificate bundle would reject it.
if [ -z "${UV_SYSTEM_CERTS:-}${UV_NATIVE_TLS:-}" ]; then
  if uv tool install --help 2>/dev/null | grep -q -- '--system-certs'; then
    export UV_SYSTEM_CERTS=1
  else
    export UV_NATIVE_TLS=1
  fi
fi

# Older uv releases only know --default as a preview feature.
info "Installing Python $PYTHON_VERSION as the default python. The first time this can take a few minutes..."
if ! uv python install "$PYTHON_VERSION" --default && ! uv python install "$PYTHON_VERSION" --default --preview; then
  error_message "Installing Python $PYTHON_VERSION failed. Check your internet connection (or HTTPS_PROXY behind a proxy) and run ./setup.sh again."
  exit 1
fi
ok "Python $PYTHON_VERSION is installed."

# A uv tool, so specify keeps working after setup. --force replaces a specify from an earlier install.
info "Installing specify-cli on Python $PYTHON_VERSION..."
if ! uv tool install --force --python "$PYTHON_VERSION" --from "$SPEC_KIT_SOURCE" specify-cli; then
  error_message "Installing specify-cli failed. Check your internet connection (or HTTPS_PROXY behind a proxy) and run ./setup.sh again."
  exit 1
fi
UV_TOOL_BIN_DIRECTORY="$(uv tool dir --bin 2>/dev/null || echo "$UV_BIN_DIRECTORY")"
SPECIFY_PATH="$UV_TOOL_BIN_DIRECTORY/specify"
if [ ! -x "$SPECIFY_PATH" ]; then
  error_message "specify-cli is installed, but $SPECIFY_PATH is missing."
  exit 1
fi
ok "specify-cli runs on Python $PYTHON_VERSION."
# uv's own installer adds its folder to the shell startup file; a uv from Homebrew or pip does not.
if ! path_list_contains "$UV_TOOL_BIN_DIRECTORY" "$PATH_BEFORE_UV"; then
  PATH="$PATH_BEFORE_UV" "$(command -v uv)" tool update-shell || \
    warn "Add $UV_TOOL_BIN_DIRECTORY to your PATH yourself, so new terminals find python and specify."
fi

if has_first_commit "$SPEC_KIT_PROJECT_FOLDER"; then
  ok "The Spec Kit skills are already part of the first commit of $SPEC_KIT_PROJECT_FOLDER."
else
  info "Installing the Spec Kit skills in $SPEC_KIT_PROJECT_FOLDER..."
  if ! (cd "$SPEC_KIT_PROJECT_FOLDER" && "$SPECIFY_PATH" init --here --force --non-interactive \
       --integration copilot --integration-options="--skills" --script sh --ignore-agent-tools); then
    error_message "specify init failed. Check your internet connection (or HTTPS_PROXY behind a proxy) and run ./setup.sh again."
    exit 1
  fi
  apply_skill_overrides "$SPEC_KIT_PROJECT_FOLDER"
  ok "The Spec Kit skills are in $SPEC_KIT_PROJECT_FOLDER/.github/skills."
fi

# --- 4. One repository per project --------------------------------------------------
step "4/6 One repository per project"
uses_fallback_identity=0
if [ -z "$(git config --get user.name || true)" ] || [ -z "$(git config --get user.email || true)" ]; then
  uses_fallback_identity=1
  info "git has no name and email set up, so the project repositories use \"$FALLBACK_AUTHOR_NAME\"."
  info "Set your own with:  git config --global user.name \"Your Name\""
fi

for project_folder in "${PROJECT_FOLDERS[@]}"; do
  if has_first_commit "$project_folder"; then
    ok "$project_folder is already its own repository."
    continue
  fi
  # A .git without a commit is what an interrupted run leaves behind; init again finishes it.
  # symbolic-ref instead of init --initial-branch, which git before 2.28 does not know.
  # The first commit skips the user's signing and hooks: a gpg or hook setup must not block it.
  if git -C "$project_folder" init --quiet &&
     git -C "$project_folder" symbolic-ref HEAD refs/heads/main &&
     { [ "$uses_fallback_identity" = 0 ] ||
       { git -C "$project_folder" config user.name "$FALLBACK_AUTHOR_NAME" &&
         git -C "$project_folder" config user.email "$FALLBACK_AUTHOR_EMAIL"; }; } &&
     git -C "$project_folder" add --all &&
     git -C "$project_folder" -c commit.gpgsign=false commit --quiet --no-verify --message "$FIRST_COMMIT_MESSAGE"; then
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
  info "Bun was not found. Installing it with the official installer (https://bun.sh/install)..."
  if ! run_official_installer https://bun.sh/install bash; then
    error_message "The Bun installer did not finish."
    print_bun_install_help
    exit 1
  fi
  export PATH="$BUN_BIN_DIRECTORY:$PATH"
  if ! command -v bun >/dev/null 2>&1; then
    error_message "Bun was installed but this terminal cannot find it. Open a new terminal and run ./setup.sh again."
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
export_system_certificates_for_bun
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
