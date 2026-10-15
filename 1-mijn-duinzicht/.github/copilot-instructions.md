# Mijn Duinzicht

The customer portal of the fictional insurer Duinzicht Verzekeringen: a React portal and a Bun REST
API over SQLite, in one Bun workspace. The binding rules are the
[constitution](../.specify/memory/constitution.md) and the
[coding conventions](../docs/coding-conventions.md). Read them before you plan or write code.

## Rules

- **Stay in this folder.** This project is the `1-mijn-duinzicht/` folder. Never read, search, list, edit or run commands on anything outside it: no `../`
  paths, no `cd ..`, no `git -C` on the parent. If a task seems to need a file outside this folder,
  stop and ask.
- **Spec Kit first.** Application code, tests, the store structure and the seed change only through
  the Spec Kit flow (`/speckit-specify` to `/speckit-implement`). Write no code without a task in the
  feature's `tasks.md` that covers it.
- **Specify asks first.** `/speckit-specify` asks clarifying questions before it writes `spec.md`:
  one at a time, each with a recommended answer, about users, scope, data, edge cases and when the
  feature is done, until those are clear. Ask, do not guess; skip what the docs or code answer.
- **Gates.** `bun run typecheck`, `bun run lint` and `bun run test` must all pass with zero errors
  before you check off a task and before every commit. Use only these root scripts; never ad-hoc
  `tsc` flags. Never make a gate pass by editing a tsconfig, the lint config, `package.json` scripts,
  or with `eslint-disable`, `@ts-ignore` or `@ts-expect-error`.
- **Spec Kit scripts.** On Windows run the `.ps1` scripts in `.specify/scripts/powershell/`; on macOS
  and Linux the `.sh` scripts in `.specify/scripts/bash/`. Run them from this folder.
- **Layering.** A feature never imports another feature. `lib/` imports no app code. No import
  cycles, no barrel files. Code starts beside its only consumer and is hoisted only for a second one.
- **Language.** Customer-facing text in the portal is Dutch and informal (je/jij), and lives in the
  feature's copy file. Everything else is English: identifiers, API fields, tables, internal values,
  error codes, comments, commit messages.
- **Boundaries.** Internal values are English string-literal unions. Map external data in and out at
  the boundary; read untrusted values with `RecordReader`. Wire types go in
  `packages/api-contract/`.
- **Errors.** Deciders return verdicts, not throws. Fail closed. Every data view has a skeleton while
  loading and an `ErrorBanner` with retry on failure.
- **Design.** Build pages from the components in `apps/web/src/lib/design-system/`. Colours and
  lengths come only from `tokens.css`. Keep the keyboard focus outline and 4.5:1 contrast, and check
  a feature's changed pages once, after its last UI task, at 1280px and 375px wide.
- **Environment.** Read environment variables only in `ApiEnvironment.ts` and `WebEnvironment.ts`.
  No work at module load.
- **Tests.** This workshop writes no new tests: plans and `tasks.md` hold no test tasks. The
  existing tests keep passing; update one only when the spec changed that behaviour on purpose.
  Tests never touch `.data/`.
- **Names.** Full, descriptive names; no abbreviations except the loop index `i` and comparator pair
  `(a, b)`. Comments only for a non-obvious why; no TODO comments.
- **Data.** All data is fictional. No real customer data, no secrets, tokens or `.env` files in the
  repository.
- **Dependencies.** Add one only through a task, and record it with its reason in the feature's
  `research.md`.
- **Commits.** One plain subject line; no AI attribution anywhere.
- **Docs.** When a change alters an endpoint, a table, a component, a token or a rule, update the
  matching page in `docs/` or this file in the same change.

## Folder map

| Folder | Holds |
|---|---|
| `apps/web/src/` | The portal: `features/` (pages and the shell), `adapters/` (API readers), `lib/` (design system, `http-json`, `resource`, `layout-mode`), `shared/` (models, copy, sections), `portalRoutes.tsx`, `devServer.ts` |
| `apps/api/src/` | The API: `features/` (routes, handlers and rules per resource), `adapters/` (HTTP, store, seed), `services/` (store, log), `lib/`, `shared/`, `apiRouteTables.ts`, `main.ts` |
| `apps/api/resources/seed.json` | The seed data |
| `packages/` | `api-contract`, `record-reader`, `dutch-format`, `claim-report-rules`, `profile-detail-rules` |
| `specs/` | Spec Kit feature folders `NNN-short-name/` |
| `.specify/` | Constitution, templates and the bash and PowerShell scripts |
| `.github/skills/` | `analyze-codebase`, `grill-me` and `retro`; Spec Kit installs its `speckit-*` skills here |
| `.github/skill-overrides/` | Project rules that setup puts at the top of a `speckit-*` skill after `specify init` |
| `docs/` | Reference pages for people and agents |

## Where to look

| Question | Page |
|---|---|
| How the parts fit and how a request flows | [docs/architecture.md](../docs/architecture.md) |
| Endpoints, errors, tables and seed | [docs/rest-api.md](../docs/rest-api.md) |
| Tokens, components, layout modes | [docs/design-system.md](../docs/design-system.md) |
| Code rules and the review checklist | [docs/coding-conventions.md](../docs/coding-conventions.md) |
| Commands, ports, environment variables | [README.md](../README.md) |
