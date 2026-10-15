# AI Orchestrator, session 2

Two projects in one repository. Run the setup in this folder first: it removes this folder's `.git`
and makes each project folder its own git repository, so the agent stays inside its project. Then
it installs Python 3.13 as the default `python` and the Spec Kit CLI `specify` on it (both through uv,
which it installs when it is missing), the Spec Kit skills in `1-mijn-duinzicht/`, Bun when it is
missing, and the dependencies of both projects.

| On | Do |
|---|---|
| Windows | Double-click `setup.cmd` |
| macOS or Linux | Run `./setup.sh` in a terminal |

Then start in `1-mijn-duinzicht/`: open that folder on its own in VS Code, never this root folder,
and follow its README. The numbers give the order in which the session uses the folders.

| Folder | What it is |
|---|---|
| `1-mijn-duinzicht/` | Start here: the customer portal you build features in |
| `2-duinzicht-products-mcp/` | Later in the session: a server you start when the trainer says so. Its README says how |

Start Copilot CLI inside one of the folders too, not here.
