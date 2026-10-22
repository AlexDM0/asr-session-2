# AI Orchestrator, session 2

Two projects in one repository. Run the setup in this folder first: it removes this folder's `.git`
and makes each project folder its own git repository, so the agent stays inside its project. Then
it installs Python 3.13 as the default `python` and the Spec Kit CLI `specify` on it (both through uv,
which it installs when it is missing), the Spec Kit skills in `1-mijn-duinzicht/`, Bun when it is
missing, and the dependencies of both projects. Last, it puts a **Start MCP server** shortcut on the
desktop (on Windows and macOS), and on Windows also a **Start Mijn Duinzicht** shortcut.

| On | Do |
|---|---|
| Windows | Double-click `setup.cmd` |
| macOS or Linux | Run `./setup.sh` in a terminal |

Then start in `1-mijn-duinzicht/`: open that folder on its own in VS Code, never this root folder,
and follow its README. The numbers give the order in which the session uses the folders.

| Folder | What it is |
|---|---|
| `1-mijn-duinzicht/` | Start here: the customer portal you build features in |
| `2-duinzicht-products-mcp/` | Later in the session: a server you start when the trainer says so |

## Start the MCP server

When the trainer says so, double-click **Start MCP server** on the desktop. Without the shortcut:
double-click `start-mcp.cmd` here on Windows, or run `./start-mcp.sh` on macOS or Linux. It:

1. adds `.mcp.json` to `1-mijn-duinzicht/`, so VS Code and Copilot CLI find the server there;
2. starts the server at `http://localhost:3333/mcp`.

Leave its window open while you use the server; Ctrl+C or closing the window stops it. Then trust
the `1-mijn-duinzicht` folder and start the server in VS Code or check it with `copilot mcp list`,
as the README of `2-duinzicht-products-mcp/` describes.

## Start the portal

Double-click **Start Mijn Duinzicht** on the desktop (Windows), or `start-dev.cmd` here. It stops
every other Bun process, such as an earlier `bun run dev` in another window or a VS Code terminal,
and runs `bun run dev` in `1-mijn-duinzicht/`. The MCP server on port 3333 keeps running. Leave its
window open while you use the portal at `http://localhost:3000`; Ctrl+C or closing the window stops
it. On macOS or Linux, run `bun run dev` in `1-mijn-duinzicht/` yourself.

Start Copilot CLI inside one of the folders too, not here.
