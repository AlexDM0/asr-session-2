# Mijn Duinzicht Constitution

Mijn Duinzicht is the logged-in customer portal of the fictional insurer Duinzicht Verzekeringen. One
fictional customer, Sanne de Vries (customer number 40218773), is always logged in; there is no real
login.

`docs/coding-conventions.md` (below: "the conventions") is binding for all code. This constitution
names the principles every feature is checked against; the conventions hold the detail.

## Core Principles

### I. Spec-Driven Delivery

- Every change to application code, tests, the store structure or the seed MUST go through the Spec
  Kit flow: specify, clarify, plan, tasks, implement. Documentation, constitution amendments
  and repository tooling are exempt.
- Code MUST NOT be written without a task in the feature's `tasks.md` that covers it.
- Feature directories MUST be named `specs/NNN-short-name`, numbered in delivery order, with an
  English slug.
- `/speckit-specify` MUST ask the user exactly two questions before it writes `spec.md`, one at a
  time, each with a recommended answer. It picks the two open points with the biggest effect on
  scope or behaviour (who uses the feature, what is in and out of scope, which data it shows or
  changes, the edge cases and errors, when the feature is done) and asks nothing the constitution,
  the docs or the code already answer. When fewer than two points are open, it asks only those.
- Every other open point `/speckit-specify` settles itself with the most reasonable default and
  records it in the spec's Assumptions section, so the user can correct it in review. It MUST NOT
  leave NEEDS CLARIFICATION markers in `spec.md`. Both answers MUST be recorded in the spec's
  Clarifications section. A NEEDS CLARIFICATION marker in the plan is resolved in `research.md`.
- A plan MUST NOT proceed past a failing Constitution Check.
- `/speckit-analyze` is optional in this workshop. When it runs, a CRITICAL finding MUST block
  implementation until it is resolved.

Rationale: every line of code traces back to a task and a spec, so a reviewer can check the build
against what was asked.

### II. Layering and Import Direction

- Each app's `src/` is split into `features/`, `adapters/`, `services/`, `lib/` and `shared/`, as the
  conventions' Project layout section describes.
- A feature imports its own folder, `services`, `adapters`, `lib` and `shared`, and MUST NOT import
  another feature. `lib` MUST NOT import `shared`, `services`, `adapters` or a feature. There MUST be
  no import cycles and no barrel files.
- Code starts beside its only consumer and moves to `shared/` or `lib/` (or a workspace package
  under `packages/`) only when a second consumer needs it, generalized first.
- The API composes one route table per feature in `apps/api/src/apiRouteTables.ts`; the portal
  composes its pages in `apps/web/src/portalRoutes.tsx`. A new feature adds itself there and in its
  own folder.
- Wire types shared by the API and the portal MUST live in `@mijn-duinzicht/api-contract`; rules
  both sides enforce live in a workspace package of their own.

Rationale: features that never reach into each other can be built, reviewed and removed one at a
time.

### III. One Internal Model, Dutch Only at the Presentation Boundary

- Customer-facing copy in the portal MUST be Dutch, in the informal tone (je/jij), and live in the
  feature's copy file beside the code that shows it (for example `overviewCopy.ts`), or in
  `shared/copy/` when several parts need it.
- Everything else MUST be English: identifiers, API paths and JSON fields, table and column names,
  folder and file names, internal values, error codes, log entries, comments, scripts and commit
  messages.
- Browser routes are customer-facing and stay Dutch (`/polissen`, `/schade` and so on).
- Internal values MUST be English string-literal unions, never display text. Dutch labels, money and
  dates in Dutch format (`@mijn-duinzicht/dutch-format`) appear only where the portal renders them.
- External data is mapped in at its boundary and mapped out at its boundary: HTTP requests and
  answers, the SQLite store, the seed and the rendered page. Untrusted values are read through
  `@mijn-duinzicht/record-reader`.

Rationale: one language for code keeps it searchable; the Dutch the customer reads can change
without touching the model.

### IV. Errors as Verdicts, Fail Closed

- A function that decides for its caller MUST return a verdict (`found`, `notFound`, `failed` and
  the like), not throw. The boundary words the verdict and maps it to its output (an HTTP status and
  `ApiErrorWire` code, an error banner) in exactly one place.
- When the code cannot decide, it MUST take the safe verdict: refuse the request or show the error
  banner rather than guess, for example on a missing record, an unreadable upload or an unknown
  stored value.
- Every data-backed view MUST show skeleton blocks inside a `LoadingRegion` while loading and an
  `ErrorBanner` with a retry on failure. Every write MUST show a pending state and an inline error
  on failure.
- Environment variables MUST be read only in `ApiEnvironment.ts` and `WebEnvironment.ts`. Importing
  a module MUST do no work. A clock decides nothing except where the code states the exception.

Rationale: predictable failures make the API and its end-to-end tests trustworthy.

### V. Design Tokens and Accessibility

- Colours and lengths MUST come from the tokens in `apps/web/src/lib/design-system/tokens.css`;
  stylesheets MUST NOT hold literal colours or lengths (`tokenUsage.spec.ts` enforces this for the
  design system). A new token is added only through a spec that names it.
- Screens MUST be composed from the design-system components in `apps/web/src/lib/design-system/`
  before anything new is built; a component is never restyled by its caller.
- Corners are square everywhere except icon circles, avatars, toggles and round skeletons.
- Accessibility MUST hold: every control is reachable and usable by keyboard with the visible green
  focus outline; text contrast is at least 4.5:1; icons are decorative and every control has a text
  name; the page language is `nl`.
- A user story with UI MUST NOT pass its checkpoint until its pages have been checked in a browser
  at 1280px and 375px wide, including keyboard focus and contrast; the result is noted in
  `tasks.md`. The check is done once per story, not per UI task.

Rationale: one token set and one component catalogue keep every page consistent and accessible.

### VI. Green Before Done, No New Tests in This Workshop

- This workshop builds for speed: user stories ship without new tests. A plan MUST NOT plan unit,
  component or end-to-end tests, and `tasks.md` MUST NOT contain tasks that write them.
- The existing tests MUST keep passing. A change that breaks one fixes the code, or updates that
  test when the spec changed the behaviour on purpose.
- Tests MUST NOT touch `.data/`.
- `bun run typecheck`, `bun run lint` and `bun run test` MUST all pass with zero errors at the end
  of every `tasks.md` phase, before its commit. Tasks inside a phase are checked off without running
  the gates in between.

Rationale: the workshop is about the Spec Kit flow, not about test writing; the type checker, the
linter and the existing suites still catch what a change breaks.

## Technology Stack and Constraints

- **Runtime and tooling**: Bun is the runtime, package manager (workspaces), test runner and
  bundler.
- **Python**: a command that needs Python calls `python`, never `python3`. The setup installs
  Python 3.13 as the default `python`; on Windows `python3` can resolve to the Microsoft Store stub.
- **Language**: TypeScript in strict mode everywhere (`tsconfig.base.json`). Browser code, Bun code
  and specs each have their own tsconfig, and `bun run typecheck` checks all of them.
- **Portal**: a React single-page application with React Router, bundled and served by Bun's dev
  server, which proxies `/api/*` to the API. No Vite, no webpack.
- **API**: a `Bun.serve` REST JSON API. There is no authentication; the API serves the one customer.
- **Store**: SQLite through `bun:sqlite`, created and seeded from `apps/api/resources/seed.json` on
  first start. Every access goes through `PortalStore`. A structure change is a new migration and a
  new structure version.
- **Lint**: ESLint 9 with `@reliquary/eslint-config` and `@reliquary/eslint-config-react`.
- **No gaming the gates**: a gate MUST NOT be made to pass by editing a tsconfig, the lint config or
  the `package.json` scripts, or with `eslint-disable`, `@ts-ignore` or `@ts-expect-error`, unless
  the plan's Complexity Tracking table records the waiver.
- **Dependencies**: every added dependency MUST be listed in the feature's `research.md` with its
  reason and the Bun built-in it was compared against.
- **Fictional data only**: all data is fictional. Test fixtures and examples use obviously
  synthetic values; only the seed and the end-to-end suites use Sanne de Vries's data.
- **No secrets**: no passwords, tokens, keys or `.env` files are committed. Generated files (the
  `.data/` store and uploads, build output) are gitignored.
- **Scope**: nothing beyond what a spec asks for. No authentication, no real payments, no
  internationalisation framework.

## Development Workflow and Quality Gates

- **Gates**: the root scripts `bun run typecheck`, `bun run lint` and `bun run test` are the only
  way to verify code; ad-hoc compiler flags do not count. While working on a task, `bun test
  <spec file>` inside its workspace may run one existing spec as a quick check; it never replaces the gates.
- **Commits**: one commit per completed `tasks.md` phase, with one plain subject line and a body only
  when history or a measurement matters. No AI attribution in commits, code or documentation.
- **Documentation**: `.github/copilot-instructions.md` holds the rules and the folder map and is
  updated in the same change that alters a rule. `docs/` describes the architecture, the REST API,
  the design system and the conventions, and a feature that changes one of them updates it in the
  same change, as one task in the feature's last phase. One reference per fact.
- **Review**: every change is reviewed against the conventions' review checklist.

## Governance

- This constitution supersedes other practices in this repository. Its stated exceptions (Dutch
  customer copy, Dutch browser routes, the seed data) take precedence over the conventions;
  otherwise the conventions govern code.
- **Amendments** are made only with `/speckit-constitution`, accepted by the repository owner and
  committed on their own with a plain subject line. An amendment that changes a rule updates
  `.github/copilot-instructions.md` in the same change.
- **Versioning** follows semantic versioning: MAJOR for removing or redefining a principle, MINOR
  for a new principle or section or materially expanded guidance, PATCH for wording that changes no
  rule.
- **Compliance**: every plan's Constitution Check gates its research and is checked again after its
  design; a violation is fixed or justified in Complexity Tracking. When `/speckit-analyze` runs, it
  checks spec, plan and tasks against this constitution, and a conflict with it is always CRITICAL.

**Version**: 2.1.0 | **Ratified**: 2026-10-11 | **Last Amended**: 2026-10-26
