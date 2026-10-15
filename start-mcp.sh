#!/usr/bin/env bash
#
# start-mcp.sh - start the Duinzicht products MCP server of session 2 and connect the portal to it,
# on macOS, Linux or Git Bash.
#
#   1. Adds .mcp.json to 1-mijn-duinzicht/, so VS Code and Copilot CLI find the server there. An
#      existing .mcp.json that already has the server is left alone; one without it is not changed.
#   2. Starts the server in 2-duinzicht-products-mcp/ with bun run dev, unless it already runs, and
#      keeps it running until the terminal is closed or Ctrl+C is pressed.
#
# On macOS, setup.sh puts a "Start MCP server" file on the desktop that runs this script.
#
# Usage: ./start-mcp.sh

if [ -z "${BASH_VERSION:-}" ]; then
  echo "Please run this script with bash:  bash start-mcp.sh" >&2
  exit 1
fi

set -euo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPT_DIRECTORY"

SERVER_FOLDER="2-duinzicht-products-mcp"
PORTAL_FOLDER="1-mijn-duinzicht"
SERVER_NAME="duinzicht-products"
SERVER_PORT=3333
SERVER_URL="http://localhost:$SERVER_PORT/mcp"
MCP_CONFIGURATION="{
  \"mcpServers\": {
    \"$SERVER_NAME\": {
      \"type\": \"http\",
      \"url\": \"$SERVER_URL\",
      \"tools\": [\"*\"]
    }
  }
}"

# --- Output helpers --------------------------------------------------------
bold() { printf '\033[1m%s\033[0m\n' "$1"; }
info() { printf '\033[36m•\033[0m %s\n' "$1"; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '\033[33m!\033[0m %s\n' "$1"; }
error_message() { printf '\033[31m✗\033[0m %s\n' "$1" >&2; }

bold "Starting the Duinzicht products MCP server"
for folder in "$SERVER_FOLDER" "$PORTAL_FOLDER"; do
  if [ ! -d "$folder" ]; then
    error_message "The folder $folder is missing. Run this script from the session 2 folder."
    exit 1
  fi
done

# --- 1. .mcp.json in the portal ------------------------------------------------
CONFIGURATION_PATH="$PORTAL_FOLDER/.mcp.json"
if [ -f "$CONFIGURATION_PATH" ]; then
  if grep -qF "\"$SERVER_NAME\"" "$CONFIGURATION_PATH"; then
    ok "$CONFIGURATION_PATH already connects to $SERVER_NAME."
  else
    warn "$CONFIGURATION_PATH exists without $SERVER_NAME, so it is left alone. Add this entry under mcpServers yourself:"
    printf '%s\n' "$MCP_CONFIGURATION"
  fi
else
  printf '%s\n' "$MCP_CONFIGURATION" > "$CONFIGURATION_PATH"
  ok "Added $CONFIGURATION_PATH, which connects VS Code and Copilot CLI to $SERVER_URL."
fi

# --- 2. The server ---------------------------------------------------------------
if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$SERVER_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  ok "Something already listens on port $SERVER_PORT; the server probably runs in another terminal."
  info "Stop it there first if you want to start it again here."
  exit 0
fi

# A Bun installed by setup is only on the PATH of terminals opened after it.
BUN_BIN_DIRECTORY="${BUN_INSTALL:-$HOME/.bun}/bin"
if [ -d "$BUN_BIN_DIRECTORY" ]; then export PATH="$BUN_BIN_DIRECTORY:$PATH"; fi
if ! command -v bun >/dev/null 2>&1; then
  error_message "Bun was not found. Run ./setup.sh in the session 2 folder first."
  exit 1
fi

info "Starting the server at $SERVER_URL. Leave this terminal open while you use it; Ctrl+C stops it."
echo
cd "$SERVER_FOLDER"
set +e
bun run dev
server_exit_code=$?
set -e
# 130 is Ctrl+C, the normal way to stop the server.
if [ "$server_exit_code" -ne 0 ] && [ "$server_exit_code" -ne 130 ]; then
  error_message "The server stopped with exit code $server_exit_code. If setup did not finish, run ./setup.sh first."
  exit 1
fi
