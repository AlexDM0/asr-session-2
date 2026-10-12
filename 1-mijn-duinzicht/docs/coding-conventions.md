# Coding conventions

These are rules, not preferences. Where the linter or the type checker can hold a rule, it does;
everything else is checked in review. The [constitution](../.specify/memory/constitution.md) refers to
the sections below by their titles.

## Principles

- Code explains itself. Names carry the meaning; comments are the exception.
- Every file has one clear purpose, explainable in two or three lines.
- Features never reach into each other. What two of them need is hoisted and generalized.
- Inside the application there is one internal model. Everything external is mapped in at the
  boundary and mapped back out on the way out.
- Fail closed: when the code cannot answer, take the safe verdict.

## Project layout

Both apps split `src/` the same way:

| Folder | Holds |
|---|---|
| `features/` | One folder per feature: what the application does for its users |
| `adapters/` | Every boundary: HTTP mapping, store ingestion and writers, seed ingestion, API readers in the portal |
| `services/` | Stateful, app-wide things any caller may use (the store, the log) |
| `lib/` | Building blocks that would be a package of their own (the design system, the route table, the PDF writer) |
| `shared/` | App-specific code several parts need that is not package-grade (models, errors, copy) |

`resources/` beside `src/` holds files the application reads at runtime, such as the seed. Code that
both apps need and that passes the package test lives in `packages/<name>/` as a workspace package.

## Import direction

- A feature imports its own folder, `services`, `adapters`, `lib` and `shared`. **Never another
  feature.**
- A service imports `lib`, `shared`, `adapters` and, one way only, another service.
- `shared` imports `lib` and itself.
- A `lib` part imports only workspace packages and external dependencies. It never imports
  `shared`, `services`, `adapters` or a feature.
- No import cycles, at any level.
- No barrel files: a caller imports the one thing it needs from the file named after it, for example
  `@mijn-duinzicht/dutch-format/DutchFormat`.

## Hoisting

- Code starts beside its only consumer.
- It moves only when a second consumer needs it: to `lib/` (or `packages/`) if it is a generic
  building block, to `shared/` if it is app-specific.
- Hoisted code is generalized first: it knows nothing about either original caller.
- This applies equally to utils, types, constants and components.
- Nothing is hoisted in anticipation of a second consumer.

**The package test.** A newcomer recognises it by name as a part of the application; it depends only
on other packages and external dependencies; it knows nothing about its callers (no feature names, no
customer-facing wording, no output codes); it carries its own specs.

## Files

- **One purpose per file**, explainable from its path and the name of what it exports. Several
  exports serving that purpose are fine; the file is named after its main export.
- **A file earns its place.** A util object groups a domain, never holds one function; a one-line
  type or constant stays in its consumer's file.
- **Utils are frozen objects of pure functions**, one domain per file:
  `export const GreetingUtil = { … } as const;`. Callers write `GreetingUtil.dayPartFor(…)`, so a
  util is searchable as one name.
- A file whose purpose is an app-wide list exports one object named as a constant:
  `export const PROFILE_DETAIL_LIMITS = { … } as const;`.
- Files are named after their main export in its own case (`PortalStore.ts`, `useResource.ts`).
  Folders are lower case, kebab-case when two words are unavoidable (`open-actions`).
- A component's stylesheet sits beside it as `<Component>.module.css`.

## The internal model and its boundaries

- **Boundaries** are every place the application meets the outside: HTTP requests and answers, the
  SQLite store, the seed and the rendered page.
- **Map in at the edge, map out at the edge.** Inside, only internal values exist. Wording, labels and
  external formats appear only at the boundary.
- **A customer-facing surface owns its own text.** Its Dutch copy lives beside the code that shows it
  (`overviewCopy.ts`, `shellCopy.ts`); the design system gets its fixed texts through
  `DesignSystemCopyProvider`.
- **Internal values are string-literal unions**, not enums, and never display text.
- **Stored data is external.** It is read through an ingestion class and written through a separate
  writer (`PolicyIngestion`, `ClaimWriter`), so the format can change without touching the model.
- **Untrusted values are read field by field** with `RecordReader`, which collects every failing
  path into one verdict.
- **A plain A to B mapping** is a util of pure mapper functions (`PolicyWireUtil`).

### Plain data or a domain class

- Records that are passed around and changed by small updates are plain typed data: interfaces and
  unions.
- When the same compound change recurs across callers, that aggregate becomes a domain class whose
  methods are those changes. It does no I/O.
- Decide by looking at how the data is actually used, not in advance.

### Logging

- The API logs through one call over a typed record union (`log({ kind: 'storeCreated', databasePath })`);
  the union in `shared/log/LogRecord.ts` is the vocabulary, and the code never composes sentences.
- `LogWordingUtil` words the entries on output.

## Errors

- **A function that decides for its caller returns a verdict**, not a throw:
  `{ outcome: 'found', value }`, `{ outcome: 'notFound' }`, `{ outcome: 'failed', reason }`.
- **A rule that refuses deep inside a request throws `PortalError`**, which says whether the caller
  can act (`refused`) or the application will not repair it (`unrepaired`), with an `ApiErrorCode`.
- **The boundary words the error and maps it to its output** in exactly one place:
  `ApiErrorResponse` for the API, `ErrorBanner` for the portal.
- Library code never ends the process. Only the entry point (`main.ts`, `reset.ts`, `devServer.ts`)
  does.

## Runtime rules

- **Environment variables are read in exactly one module per app** (`ApiEnvironment.ts`,
  `WebEnvironment.ts`), through getters, each saying what it overrides.
- **No work at module load.** Importing a module resolves no paths, reads no environment and opens no
  connections or files.
- **Prefer factories of closures over classes**, except for state carried across a sequence of calls,
  domain classes and ingestion classes. A constructor does no work.
- **Every write of a file a reader may hold open is atomic**: temporary file beside the target, then
  rename. Never truncate then write.
- **A clock decides nothing.** Timestamps are recorded and displayed, never compared, except where an
  exception is stated in the code it applies to (the greeting, a read's time limit, today's date for
  an incident date).
- **Index a record keyed by outside text through an own-property check**, never a bare lookup.

## Generated files

Generated files never live in the repository. The development store and uploads in `.data/`, build
output and coverage are gitignored and regenerated by `bun run dev` or `bun run reset`.

## Naming

- **Every identifier gets a full, descriptive name. No abbreviations.** Write `temporaryPath`, not
  `tmp`; `remainingArguments`, not `args`. Only loop iterators (`i`) and sort comparators (`(a, b)`)
  may be one letter. Callbacks, destructured bindings and throwaway scripts are not exempt.
- **Name a thing for what it is or does**, never for its layer or its history, and never with a name
  that shadows a global.
- **A function that answers a question is named as the question:** `sourceIsReachable`.
- **A function that produces something is named for the product:** `policyListWireFor`.
- **A boolean is a predicate phrase:** `awaitsCustomerPhotos`, `isReadableWidth`.
- **Constants that are design decisions are `SCREAMING_CASE`**, named for what they bound, with the
  unit in the name: `READ_TIMEOUT_MILLISECONDS`. No magic number appears inline.
- **Everything is English** except the portal's customer-facing copy.
- **Example data is obviously synthetic:** `Alex Example`, `Example Street 1`.

## Comments

- **No walls of text.** The code explains itself.
- **A docblock** only for a non-obvious edge in a contract: a stated limit, a deliberate refusal. One
  or two sentences.
- **An inline comment** only for a *why* the code cannot show. One sentence.
- **Never** restate the code, narrate history or carry a measurement. Those belong in the commit
  message.
- **No TODO comments.** Agreed work that waits goes into `docs/backlog.md` (create it with the first
  entry), with the reason it waits.

## TypeScript and lint

- **Verify with the project's own scripts** (`bun run typecheck`, `bun run lint`, `bun run test`),
  never with ad-hoc compiler flags.
- **Strict compiler options** in `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`,
  `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`.
- **Write for them directly:**
  - read an indexed value with bracket access (`request.params['policyId']`);
  - write the fallback for an indexed lookup instead of a non-null assertion;
  - build objects conditionally rather than spreading `undefined` into an optional property;
  - use `import type` for type-only imports.
- **Browser code, Bun code and specs** each have their own tsconfig.
- **Style held by the lint config:**
  - 2-space indent, single quotes, always semicolons;
  - line length 180 for code, 155 for comments;
  - object values aligned in one column, and the `from` keywords of consecutive imports aligned;
  - imports ordered builtin, external, internal, alphabetized within each group;
  - more than three named imports, or four or more object properties, go one per line;
  - arrow functions always parenthesize their parameters;
  - no `any`;
  - builtins imported with the `node:` prefix.

## Tests

- **A spec sits beside its module:** `<Module>.spec.ts` or `<Module>.spec.tsx`. A second suite on the
  same module is `<Module>.<aspect>.spec.ts`. Test helpers are `*.setup.ts`; web fixtures are
  `*.mock.ts`.
- **A spec opens with a short docblock** saying which cases matter and why.
- **Test names are claims written as sentences:** `'refuses a description shorter than ten characters'`.
- **Pure functions are tested against their own contract**, not through a caller.
- **Portal components** are rendered with Testing Library inside `DesignSystemCopyProvider` with
  `PORTAL_DESIGN_SYSTEM_COPY`; `fetch` is stubbed with `spyOn`; routing specs use
  `createMemoryRouter` with `PORTAL_ROUTES`.
- **End-to-end suites** that run the real API sit at `apps/api/src/*.e2e.spec.ts` and start it with
  `startScratchApiServer()`, which builds a seeded store in a fresh temporary directory.
- **Tests never touch live data.** Every test works in a scratch location, and the helpers refuse to
  run anywhere else. Only the end-to-end suites assert seed values.

## Documentation

- **`.github/copilot-instructions.md`** holds the rules and a short folder map. It carries only what
  the code cannot show and is updated in the same change that alters a rule.
- **`docs/`** describes the architecture, the REST API and the design system. A change to an
  endpoint, a table or a component updates its page in the same change.
- **One reference per fact.** A second copy of a command list or a threshold is deleted, not kept in
  sync.

## Commits

- **One plain, human-written subject line**, with history and measurements in the body only when
  they matter.
- **No AI attribution of any kind.**

## Review checklist

- [ ] Every new file passes the purpose test: two or three lines, one main export.
- [ ] No feature imports another feature; no cycles; `lib` and `shared` import only downwards.
- [ ] Nothing hoisted without a second consumer; everything hoisted is generalized.
- [ ] External values are mapped at the boundary; no Dutch wording or external format inside.
- [ ] Colours and lengths come from tokens; pages use design-system components.
- [ ] Names are full and self-documenting; no abbreviations; constants carry their unit.
- [ ] Comments only where a *why* would otherwise be lost.
- [ ] Deciders return verdicts; errors are mapped to output once, at the boundary.
- [ ] Writes are atomic; nothing reads the environment outside its one module; no work at load.
- [ ] Specs beside their modules, named as claims, working in scratch locations only.
- [ ] `bun run typecheck`, `bun run lint` and `bun run test` pass.
- [ ] `.github/copilot-instructions.md` and `docs/` are updated in the same change when a rule, an
      endpoint or a component changes.
