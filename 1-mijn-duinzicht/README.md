# Mijn Duinzicht

Mijn Duinzicht is the logged-in customer portal of Duinzicht Verzekeringen, a fictional insurer. One
fictional customer, Sanne de Vries, is always logged in; there is no real login. The portal opens on
a greeting with her policies and open claims, and the other sections (Polissen, Schade, Berichten,
Profiel) are placeholder pages. Behind it runs a REST API with all of Sanne's data: her profile,
preferences, policies, claims, messages and payments. The customer-facing text is Dutch; code, docs
and everything else are English.

**Stack:** Bun workspaces, TypeScript, React with React Router, a `Bun.serve` REST JSON API, SQLite
through `bun:sqlite`, ESLint, tests with `bun test`.

## Getting started

The setup in the repository root installs [Bun](https://bun.sh) and the dependencies of this
folder. Then run `bun run dev` here; the portal opens on `http://localhost:3000`.

Without the root setup: install Bun 1.4.2 or newer, then run from this folder:

```bash
bun install
bun run dev
```

Stop the portal with Ctrl+C. The first start creates the store `.data/portal.sqlite` from the seed.
You need network access on the first install, and in the browser for the fonts.

## Commands

Run every command from this folder, `1-mijn-duinzicht/`.

| Command | What it does |
|---|---|
| `bun install` | Installs every workspace |
| `bun run dev` | Starts the API and the portal together, prints `Mijn Duinzicht: http://localhost:3000` and opens it in your browser |
| `bun run reset` | Replaces the store with the seed and empties `.data/uploads/`; works while the portal runs |
| `bun run typecheck` | Type-checks every workspace |
| `bun run lint` | Lints the whole repository |
| `bun run test` | Runs every test suite |

`bun run typecheck`, `bun run lint` and `bun run test` must all pass before a task counts as done and
before every commit. The tests never touch `.data/`.

## Ports and environment variables

| Variable | Default | What it sets |
|---|---|---|
| `DUINZICHT_WEB_PORT` | `3000` | Port of the portal |
| `DUINZICHT_API_PORT` | `3001` | Port of the API |
| `DUINZICHT_API_ORIGIN` | `http://localhost:<DUINZICHT_API_PORT>` | Where the portal sends `/api/*` |
| `DUINZICHT_OPEN_BROWSER` | `true` | `false` keeps the browser closed on `bun run dev` |
| `DUINZICHT_DATABASE_PATH` | `.data/portal.sqlite` | The store file |
| `DUINZICHT_UPLOAD_DIRECTORY` | `.data/uploads` | Where uploaded claim photos go |

All are optional. Relative paths resolve against this folder. An invalid value stops the
process with a message naming the variable.

```bash
DUINZICHT_WEB_PORT=3010 DUINZICHT_API_PORT=3011 bun run dev
```

```powershell
$env:DUINZICHT_WEB_PORT = "3010"; $env:DUINZICHT_API_PORT = "3011"; bun run dev
```

## Repository layout

| Folder | What lives there |
|---|---|
| `apps/web/` | The React portal and its dev server, which proxies `/api/*` to the API |
| `apps/api/` | The REST API over the SQLite store; the seed is `apps/api/resources/seed.json` |
| `packages/` | Workspace packages: `api-contract` (wire types), `record-reader` (reads untrusted values), `dutch-format` (Dutch money and dates), `claim-report-rules`, `profile-detail-rules` |
| `docs/` | Architecture, REST API, design system and coding conventions |
| `.specify/` | Spec Kit: the constitution in `memory/`, templates, and scripts for bash and PowerShell |
| `.github/` | `copilot-instructions.md` and the skills in `skills/` |
| `specs/` | One folder per feature, created by `/speckit-specify` |
| `.data/` | The local store and uploads, generated and gitignored |

Inside each app, `src/` is split into `features/`, `adapters/`, `services/`, `lib/` and `shared/`. See
[docs/architecture.md](./docs/architecture.md).

## Building a feature with Spec Kit

Every feature goes through the Spec Kit skills in GitHub Copilot Chat (agent mode) or Copilot CLI.
Type the skill as a slash command, followed by your own text.

| Skill | Produces |
|---|---|
| `/speckit-specify <feature request>` | `specs/NNN-short-name/spec.md`: user stories, requirements, success criteria |
| `/speckit-clarify` | Questions about the gaps in the spec; your answers go into its Clarifications section |
| `/speckit-plan` | `plan.md` with its Constitution Check, plus `research.md`, `data-model.md`, `contracts/` and `quickstart.md` |
| `/speckit-tasks` | `tasks.md`, ordered by phase and user story |
| `/speckit-analyze` | A read-only consistency check across spec, plan and tasks; a CRITICAL finding blocks implementation |
| `/speckit-implement` | The code, task by task, each checked off once the gates pass |
| `/speckit-converge` | What is still missing compared with the spec and plan, appended to `tasks.md` for another implement run |

`/speckit-checklist` and `/speckit-taskstoissues` are optional. `/speckit-constitution` amends the
[constitution](./.specify/memory/constitution.md), the principles every plan is checked against.

Read each file before you run the next step: the spec before the plan, the plan before the tasks.
The next feature number is **001**.

The skills call helper scripts in `.specify/scripts/`. Both sets are there: `bash/` for macOS and
Linux, `powershell/` for Windows. Each skill says which one to run on which system, so Copilot picks
the right one. If Windows blocks a script because of the execution policy, run it as
`powershell -NoProfile -ExecutionPolicy Bypass -File <script> <arguments>`.

## Two more skills

| Skill | Use it to |
|---|---|
| `/analyze-codebase` | Get to know the code: builds an interactive guide in `docs/codebase-guide/` (local only, gitignored) with an overview and a deeper tour |
| `/grill-me` | Sharpen a feature request before `/speckit-specify`: Copilot interviews you one question at a time until every decision is made |

## Docs

| Page | Read it for |
|---|---|
| [docs/architecture.md](./docs/architecture.md) | The apps and packages, how a request flows from the browser to the store, the folder layering |
| [docs/rest-api.md](./docs/rest-api.md) | Every endpoint with its request, answer and errors, and the data model |
| [docs/design-system.md](./docs/design-system.md) | Tokens, the component catalogue and when to use each component, layout modes |
| [docs/coding-conventions.md](./docs/coding-conventions.md) | The rules for code, tests and commits |
| [.specify/memory/constitution.md](./.specify/memory/constitution.md) | The principles every feature is checked against |
| [.github/copilot-instructions.md](./.github/copilot-instructions.md) | The rules Copilot follows in this folder |
