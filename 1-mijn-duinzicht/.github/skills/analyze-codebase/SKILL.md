---
name: analyze-codebase
description: Build an interactive onboarding guide for this codebase in docs/codebase-guide/, a single HTML page with a skim-level Overview tab and a Guide tab that adds deeper detail inline in expandable disclosures, so nothing is written twice. Starts at the workspace root and says so up front. If the root holds several distinct projects it builds one guide per project with subagents, plus a parent page that ties them together with iframes. Researches the code first, grounds every claim in a real file, uses pinned CDN libraries, runs a render sanity check and confirms the configuration once before building. Use when someone wants to get to know the code, asks for an onboarding guide, a codebase tour or an explanation of how the project fits together. Optional text after the command narrows the scope (a path or glob), names the system, or sets the audience or depth (for example "stakeholder" or "overview-only").
argument-hint: "[optional: path to scope, system name, stakeholder, overview-only, guide-only]"
---

# /analyze-codebase

Generate a **conceptual** onboarding guide for the codebase you are in: what a new engineer reads on
day one to build the right mental model before touching code. The output is one HTML file with two
tabs, **Overview** and **Guide**. The Guide's deeper material is woven in as inline, signposted
disclosures, never as a separate "detailed" copy of the same chapters.

Any text the user typed after `/analyze-codebase` is a free-form hint: a path or glob that narrows
the research, an explicit system name, or knobs such as `stakeholder`, `overview-only` or
`guide-only`. Fold it into the configuration in Step 0.

## Where the output goes

Everything this skill writes lives in **`docs/codebase-guide/`** at the workspace root:

| File | What it is |
| --- | --- |
| `docs/codebase-guide/index.html` | The guide (single project) or the parent page (several projects) |
| `docs/codebase-guide/<project>/index.html` | One guide per project, only in multi-project mode |
| `docs/codebase-guide/enhancements.md` | Enhancement options for the guide next to it; each project folder gets its own |
| `docs/codebase-guide/notes/` | Working files: research notes, the shared design language, plans |
| `docs/codebase-guide/.gitignore` | One line, `*`, so the generated guide stays out of commits |

Create the folder and its `.gitignore` if they are missing. If an `index.html` already exists there, say so before you
overwrite it. Write nothing outside `docs/codebase-guide/`. Tell the user in your final report that
`notes/` holds working files they may delete.

---

## Step 0: root, announce, detect projects, then configure (do this first)

**The analysis root is the workspace root**: the folder open in VS Code, or the directory Copilot CLI
was started in. Start there. Do not descend into a subfolder and treat it as the root, even when the
top level looks sparse or there is one obvious `src/` or `apps/` folder below it. Only an explicit
path in the user's hint narrows the scope.

**Announce before doing anything.** Before any research, building or subagent, tell the user the
absolute path of the root and what you detected there, for example
`Analyzing: /abs/path/to/root, single project (TypeScript, Bun workspace)` or
`Analyzing: /abs/path/to/root, 3 distinct projects detected: api, web, worker`. The user can stop
you if it is the wrong place.

**Detect single or multiple distinct projects.** Inspect the root's immediate children for
independent project roots, each with its own marker (`package.json`, `pyproject.toml` or `setup.py`,
`go.mod`, `Cargo.toml`, `pom.xml` or `build.gradle`, `Gemfile`, a nested `.git`, or a standalone
README with a source tree). Treat them as **distinct** only when they have separate markers and
different stacks or separate lifecycles. Folders inside one app (`src/`, `tests/`, `docs/`) are not
projects. **The packages of one workspace** (a root `package.json` with `workspaces`, a pnpm, Bun or
npm monorepo, a Cargo or Go workspace) **are one project**: explain them as parts of one system.

- **Single project**, or one clearly dominant project: use single-project mode, then Steps 1 to 8.
- **Several distinct projects**: use multi-project mode.

### Single-project mode: smart defaults, then one confirmation

Detect sensible defaults, then confirm them with the user in **one chat message** before building.
Leave no `<...>` placeholders and do not silently guess the big choices.

Detect:
- **System name**: from the README's first heading, `package.json` `name`, `pyproject.toml`, or the
  root folder name. Prefer a human label over a slug.
- **Domain accents**: one hue per major branch if the system has an obvious split (read and write,
  web and API, sync and async); otherwise a single accent.
- Apply the user's hint over these defaults.

Ask in one message, as a short numbered list where each question shows the recommended answer
first, and wait for the reply:
1. **System name**: the detected value, or a new name.
2. **Audience**: engineer (recommended), stakeholder, or domain expert.
3. **Depth**: Overview plus Guide with woven disclosures (recommended), overview only, or guide only.

The user may answer "all defaults". If the hint already settled every choice, skip the question and
build.

### Multi-project mode: one guide per project plus a parent page

1. **Confirm scope once.** Re-announce the root and list the detected projects (name, path, guessed
   stack). In one chat message, ask which projects to include (default: all) and confirm the shared
   audience and depth (same defaults as single-project mode). Each project's guide goes to
   `docs/codebase-guide/<project>/index.html`.
2. **Define one shared design language before building anything.** The project guides and the parent
   page must read as one product. Write a single design-language spec to
   `docs/codebase-guide/notes/design-language.md` and reuse it verbatim everywhere. It pins:
   - **Design tokens as CSS custom properties**: the exact palette (background, surface, text, muted,
     border, neutral accent), the type scale and font stack, the spacing, radius and shadow scale,
     and motion timings and easings, as a literal `:root { ... }` block.
   - **The shared primitives**: depth tab bar, `.callout` variants, `.card` grid, `.kicker`, the
     `▸ Go deeper` disclosure, the drawer shell, named and styled once.
   - **One accent per project** from a single harmonious family, with the mapping recorded. The
     accent is the only thing that varies between project guides.
3. **Build each project with a subagent.** Ask Copilot in plain words for one subagent per project,
   for example "Use a subagent to build the onboarding guide for the `api` project". Run them in
   parallel if your environment supports it, otherwise one after another. **A subagent starts with
   a fresh context**: it does not see this conversation, this skill or the user's answers. Its
   prompt must therefore contain:
   - the absolute path of its project folder and the absolute output path
     (`docs/codebase-guide/<project>/index.html` and `enhancements.md` next to it);
   - Steps 1 to 8 of this skill, copied in full;
   - the shared design-language spec, copied in full, with its assigned accent, and the instruction
     to adopt the tokens and primitives exactly and invent no palette, fonts or spacing of its own;
   - the confirmed audience and depth, because a subagent cannot ask the user questions;
   - that it may only read inside its project folder and only write its two output files;
   - what to report back: name, one-line summary, stack, the paths of `index.html` and
     `enhancements.md`, and a short note of what it polished in Step 8.
4. **Build the parent page** at `docs/codebase-guide/index.html` with the same design language. It:
   - presents the projects as **hero cards** (name, one-line summary, stack badges, the project's
     accent) with a short intro on what this collection is and, if discernible, how the projects
     relate;
   - **ties them together with iframes**: choosing a card loads that project's guide into an
     embedded `<iframe>` with a relative `src` (`./<project>/index.html`), so the reader explores
     every project inside one shell. Set the iframe `src` only on selection, show the hero until a
     project is picked, give the iframe a generous height and its own loading state, and add no
     `sandbox` attribute that blocks scripts;
   - lists the projects and their relative paths in the print view, because iframes do not print.
5. **Sanity-check the parent page** (Step 7, adapted): every card opens its guide in the iframe,
   relative paths resolve over `file://`, no card points at a guide that failed to build, switching
   projects works, and the page renders at full width. Report which projects built, where each
   guide lives, and the parent page's path.

---

## Step 1: research first, write second (do not skip)

Before writing a word, build an accurate mental model from the repository itself:
- Read the README, `docs/`, specs and architecture notes.
- Identify the **entry points** and trace the **end-to-end flow** of data and control: what comes
  in, each stage, what comes out.
- List the **domain vocabulary** a newcomer will not know (IDs, codes, units, status values, domain
  nouns) and find the authoritative definition of each.
- For any algorithm you will describe in depth, read the implementing file and its documentation so
  the explanation is correct: quote real numbers, thresholds, formulas and edge cases.
- For broad codebases, ask for research subagents in plain words ("Use a subagent to map how a
  request flows through `apps/api`"). Give each one the absolute paths to read, the question to
  answer, that it must not change files, and the shape of the answer you want (findings with file
  paths). Ground every claim in a real file.
- Note the genuine **gotchas**: counter-intuitive conventions, naming traps, "this looks wrong but
  is not".

If research surfaces an ambiguity that Step 0 did not settle and that would change the explanation,
ask one or two clarifying questions in chat before building. Do not re-ask what Step 0 covered.

---

## Step 2: structure, a chaptered narrative with depth layered in

One chapter spine, one source of truth: never two parallel copies of a chapter that can drift. Author
each chapter's concept body **once**, with deeper material attached as separate disclosures:
`{ id, title, summary, concept, deepers: [{ label, kind, html }] }`. `summary` feeds the Overview,
`concept` is the always-visible Guide prose, and each `deepers` entry is one inline expandable.
**Detail extends the concept, it never restates it.** Reuse shared pieces (glossary, pipeline data,
the stepper) instead of authoring them twice.

- **Overview tab**: one condensed view. Hero one-liner, big-picture diagram, one line per stage
  (`summary`), the one gotcha, and a "read on" link into the Guide. Skimmable in about 3 minutes.
- **Guide tab**: the chaptered narrative with a sticky sidebar table of contents and scroll-spy.
  Render each chapter's `concept`. Wherever a `deepers` entry exists, show a clearly marked inline
  trigger (a `▸` disclosure or "Go deeper" chip labelled with the kind of depth: "The exact
  formula", "Peek the code", "When it refuses"), so the reader sees at concept level that more is
  available. Collapsed by default, expands in place. A global **Expand all detail** switch toggles
  them all.

Chapter skeleton, adapted to the system:
1. **Welcome**: the system in one sentence, what this guide covers, read time.
2. **Why it exists**: the problem it solves in plain language, with a "system in one sentence"
   callout.
3. **The vocabulary**: the 5 to 8 terms they will keep meeting, as a card grid; flag the single most
   counter-intuitive one in a "watch" callout.
4. **The big picture**: the whole system as an interactive pipeline or flow diagram.
5. **One chapter per stage**: what it is for, inputs and outputs, key sub-concepts.
6. **Follow a [unit]**: an interactive step-through of one concrete example, end to end.
7. **The mental model**: the system in one breath, a short quiz, and "where next".

Keep concept prose at one calm altitude and push anything heavier into a disclosure. A stage with a
non-trivial algorithm gets its in-depth material (the real method, an interactive visual, a worked
example with real numbers, a "when it refuses or fails" table) in that chapter's disclosures. The
optional deep-dive drawer (Step 3) is only for an aside too large to inline comfortably, such as a
long code peek; never use both for the same thing.

---

## Step 3: required interactive components

- **Two depth tabs, inline disclosures and a global detail switch**, sticky at the top on every
  screen. Tabs: **Overview** (active on load) and **Guide**. Disclosures are labelled
  `<details>`/`<summary>` or ARIA disclosure buttons that name the kind of depth without opening;
  collapsed by default; smooth height and opacity on expand; the `▸` rotates; the body adds to the
  concept. **Expand all detail** opens and closes all of them and stays in two-way sync with the
  individual toggles. Deep-linkable and persistent: tab and detail state in the URL hash (`#guide`,
  `#guide/<chapter>`, `#detail/<chapter>`), last tab and detail remembered in `localStorage`, the
  hash wins. Accessible: `role=tablist`, `tab` and `tabpanel`, `aria-selected`, arrow-key tab
  navigation, `aria-expanded` on every trigger, visible focus rings. Printing expands every
  disclosure.
- **Scroll-progress bar** fixed at the top.
- **Sticky sidebar table of contents with scroll-spy** (IntersectionObserver).
- **Clickable pipeline diagram**: stage chips open a detail panel; data-driven from a JS array.
- **"Follow a [request, record or event]" stepper**: Back and Next through about 6 to 8 steps
  tracing one realistic example end to end, with a live status panel (stage, state, value).
- **Hover glossary tooltips**: inline term spans with a definition tooltip on hover and focus,
  reused wherever the jargon appears.
- **Check your understanding**: click-to-reveal question and answer cards near the end.
- **Deep-dive drawer** (optional, secondary to disclosures): one reusable data-driven shell; a
  right-side slide-over (full sheet on mobile) over a dimmed scrim; deep-linkable (`#deep/<id>`);
  closes with the close button, the scrim or Esc; `role=dialog` and `aria-modal`, focus trapped and
  restored, background scroll locked.
- **For any in-depth algorithm**: at least one manipulable visual, such as a slider-driven SVG chart
  that recomputes live (the real method against a naive baseline) or a segmented toggle that
  re-renders a small diagram. Hand-author the SVG and compute positions in JS. Place it in a Guide
  disclosure on the relevant chapter.

---

## Step 4: design system and technical constraints

- **One `.html` file** with embedded `<style>` and `<script>`. No build step, no bundler, no local
  `node_modules`: a file you open by double-clicking.
- **Libraries come from a CDN, always**, as a small curated set pinned to exact versions in the URL,
  with an SRI `integrity` attribute where the CDN supports it (ESM `+esm` bundles cannot carry SRI,
  so pin the version in the URL). Never reference an unpinned or major-only version. List the
  libraries, their versions and why each is there in a comment at the top of the file. Suggested:
  Alpine.js (tab, disclosure, drawer and stepper state), Motion One (transitions), Floating UI
  (tooltips), highlight.js or Prism (code peeks), and the slim D3 modules `d3-scale`, `d3-shape` and
  `d3-drag` (a draggable chart). Keep the hand-authored SVG and the design system: no UI kit, CSS
  framework or icon font.
- **Degrade gracefully when a CDN fails**: readable content, no blank screen, no endless spinner. Use
  `x-cloak`, a `<noscript>` fallback and timeouts.
- System font stack, **CSS custom properties** for the palette, cards with soft shadows and rounded
  corners, generous whitespace, a warm and clean look that does not read as default Bootstrap.
  Precision over decoration.
- Reusable primitives: the depth tab bar (sticky segmented control with an animated indicator),
  `.callout` (key idea, watch), the `.card` grid, `.kicker` chapter labels, the `▸ Go deeper`
  disclosure, and the optional "Dive deeper" chip with the drawer shell.
- **Craft the motion, do not sprinkle it.** The high-impact moments are the tab switch, the
  disclosure expand and the drawer. Everything else stays calm. Honour
  `prefers-reduced-motion: reduce` (cut transforms, keep instant fades).
- **Warning, the grid trap:** a tab that hides the sidebar (Overview) must collapse the page grid to
  a single column (for example `.tab-overview .shell { grid-template-columns: 1fr }`). If the hidden
  sidebar leaves its grid track behind, `<main>` lands in the narrow track and the whole tab renders
  at phone width on a desktop.
- **Responsive** (the sidebar collapses on mobile); add `print-color-adjust: exact`.
- Render repeated content (stages, steps, glossary, disclosures) from **JS data arrays**, not
  hand-copied HTML.

---

## Step 5: writing and pedagogy

- **Layer, do not duplicate.** The Overview is conceptual and minimal. The Guide's `concept` prose
  stands on its own with **no source code**: intuition over implementation, formulas in plain math
  notation, example data welcome. Real source code, exact thresholds and formulas, and
  concept-to-code toggles live **only inside disclosures**, as extra depth. Never write the same
  explanation twice.
- **Intuition before mechanics**: give the mental picture first, then the precise rule.
- Define jargon the first time it appears; make the one big gotcha memorable.
- Use **worked examples with real numbers** taken from the docs and the code.
- Build **trust by showing limits**: a "when it refuses or fails" table beats another happy-path
  paragraph.
- Short paragraphs, active voice, friendly and precise. End with a one-breath recap.

---

## Step 6: accuracy guardrails

Every concrete claim (a threshold, a formula, an ordering, a default, an edge case) must come from a
file you read, never from a guess. A stated rule must be checkable against the source. Where the code
and a spec disagree, say so instead of smoothing it over.

---

## Step 7: sanity check (after building, before reporting)

Exercise the page; do not assume it works because it parsed. Walk this list, fix what fails and
check again:
- **Both tabs render at full width.** Switch to Overview and Guide and confirm each fills the content
  column on a wide screen. Check the Overview tab against the grid trap especially.
- **Tabs and disclosures.** Switching tabs shows the right content, with nothing stuck on
  `display: none`; every disclosure opens and closes and its body adds to the concept; "Expand all
  detail" opens and collapses all and stays in sync; the tab indicator lands on the selected tab.
- **Responsive both ways.** Narrow, wide, narrow again: the mobile layout works and the page returns
  to the full desktop layout.
- **CDN failure.** With the CDN blocked, readable content still renders. Every CDN URL is pinned to
  an exact version and carries SRI where supported.
- **Clean console and well-formed source.** No console errors; each inline script passes a syntax
  check (extract it to a temporary file outside the repository and run `node --check` or `bun build`
  on it, whichever is installed); tags are
  balanced.
- **Interactions fire**: pipeline chips open the panel; the stepper advances with live status;
  glossary tooltips position and flip near edges; the drawer opens and closes with the close button,
  scrim and Esc and traps focus; deep links open the right state; tab and detail preference survive a
  reload.
- **Print** expands every disclosure.

If you cannot open the page in a real browser here (for example through a browser tool or VS Code's
integrated browser), say so and substitute static checks and DOM stubs. Never claim a visual pass you
did not run.

---

## Step 8: self-review and polish

The sanity check proves the page works. Now read your own output with fresh eyes, as if it were
someone else's pull request, and improve it. For an independent critique, ask for a subagent in
plain words and give it the absolute path of the HTML file, the source folders the claims come from,
the lenses below, and the instruction to report findings without editing.

Review through these lenses and list concrete findings:
- **Accuracy and grounding**: re-check concrete claims against the source files; fix anything off,
  vague or unsupported. No invented numbers.
- **Pedagogy and clarity**: intuition before mechanics; jargon defined on first use; the big gotcha
  memorable; concept prose and its disclosure do not overlap; the Overview skims and the Guide
  teaches.
- **Visual craft**: spacing rhythm, type scale, colour and contrast, consistent use of the
  primitives, empty and loading states, hover and focus states, motion easing, reduced motion.
- **Interaction and accessibility**: keyboard focus order and `aria-*` attributes correct; the grid
  trap gone on every tab.
- **Responsiveness**: desktop and mobile both look intentional, not just unbroken.

**Then implement every improvement that fits inside the single HTML file**: CSS, markup, JS and copy
edits with the libraries already chosen, and no new library, font, image, file or build step. Do not
ask first. Re-run the Step 7 sanity check afterwards.

Anything that does not fit inside the file (a new library, a backend, a screenshot, splitting into
several files) or that is a larger product decision goes to `enhancements.md` instead. Do not
half-implement it. Report a short before-and-after list of what you reviewed and changed.

---

## Deliverable

**Single-project mode:** write `docs/codebase-guide/index.html` and open it in a browser if you can;
it must load on the **Overview** tab. Run Step 7, then Step 8, before reporting. Summarize the two
tabs, the woven disclosures and the interactive pieces, and report the sanity check and what you
polished.

**Multi-project mode:** each project has its own `docs/codebase-guide/<project>/index.html`, built
and sanity-checked by its subagent, and `docs/codebase-guide/index.html` is the parent page that
embeds them in lazy-loaded iframes. Open the parent page, confirm each project loads in its iframe,
then report the root path, the project list with where each guide lives, which subagents succeeded
or failed, and the parent page's sanity check.

**Always write the enhancement options to a file.** Next to every `index.html` (the single guide,
each project guide, and the parent page), write `enhancements.md` as a markdown checklist of concrete
options for that guide:

```
# Codebase guide enhancements: <name>

Generated by /analyze-codebase. Options to deepen or polish `index.html`.
Tick them off as you act on them.

- [ ] **<Option>**: <one-line description>
- [ ] ...
```

**Then offer them, without overloading the wrap-up:**
- **Single-project mode:** list 3 to 5 options as a numbered list in chat and ask which to apply
  (several numbers, "none", or a free-text idea). Apply what the user picks, then tick those items
  off in `enhancements.md`.
- **Multi-project mode:** point the user at the per-project `enhancements.md` files and offer only
  the parent-level options in chat.

### Build checklist (verify before delivering)

- [ ] Grounded in real files: no invented thresholds, formulas or flows.
- [ ] Two tabs (Overview and Guide) and "Expand all detail"; loads on Overview; depth woven in as
      inline disclosures, not a duplicate detailed view; tab and detail state in the URL hash and
      remembered; ARIA and `aria-expanded` in place.
- [ ] No duplicated prose: each concept written once; disclosures add only extra depth; labelled
      triggers show at concept level that depth is available.
- [ ] Pipeline diagram with panel; "Follow a [unit]" stepper with live status; hover glossary.
- [ ] At least one manipulable visual for any in-depth method; worked examples with real numbers; a
      "when it fails or refuses" table.
- [ ] Check-your-understanding cards, a one-breath recap and "where next".
- [ ] Single `.html`; every CDN library pinned to an exact version, with SRI where supported, and the
      page degrades gracefully when the CDN fails; no build step.
- [ ] Step 7 sanity check passed: both tabs full width, disclosures and expand-all work, responsive
      both ways, no console errors, interactions, deep links and print verified.
- [ ] Step 8 self-review done; every self-contained fix applied; Step 7 re-run after the edits;
      other ideas moved to `enhancements.md`.
- [ ] `enhancements.md` written next to every `index.html`.
- [ ] Multi-project: a shared design language written before building; the project guides and the
      parent page share identical `:root` tokens and primitives and differ only by accent.
- [ ] The one big counter-intuitive gotcha is called out memorably.
- [ ] Nothing written outside `docs/codebase-guide/`.
