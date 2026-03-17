# SfRB

SfRB (Straightforward Resume Builder) is a local-first resume builder with a CLI entrypoint and a browser-based editor. It keeps one canonical `resume.sfrb.json` document model, validates workspace rules before persistence, and supports both document-style editing and fixed-layout design editing.

The current stable baseline is **M002 complete**, with **M003** now focused on export and presentation depth:
- `sfrb init` creates real starter workspaces without storing API secrets in the repo
- `sfrb open` launches the local bridge and browser editor
- document mode supports inline editing
- design mode supports frame editing, dragging, and overflow measurement
- the guided editing flow keeps browser and CLI work tied to one canonical document model
- the AI layout consultant can detect overflow, show a ghost preview, and persist accepted fixes through the canonical write path

## Why this project exists

Most resume tools force a bad tradeoff:
- document tools are easy to edit but weak on layout control
- design tools are flexible but brittle once content changes
- AI tools can suggest changes, but often without a trustworthy local source of truth

SfRB is trying to close that gap with:
- a **local-first** workflow
- a **single canonical JSON model**
- a **CLI + browser** editing loop
- **workspace physics** for document-mode vs design-mode behavior
- an **AI layout consultant** that proposes fixes without bypassing the canonical write boundary

## Status

This repo is still early, but it is not a toy spike anymore.

What is already proven in the shipped flow:
- canonical local authoring through `sfrb init` and `sfrb open`
- starter workspace creation for template and blank resumes
- validated writes back to `resume.sfrb.json`
- document-mode inline editing
- design-mode frame dragging, linked text editing, and overflow measurement
- structured browser/CLI action parity over the canonical document model
- bridge-backed AI overflow detection and ghost-preview acceptance/rejection

The current active build track is **M003: Export & Presentation Depth**.

The authoritative internal project status lives in:
- `.gsd/PROJECT.md` — current project state
- `.gsd/STATE.md` — quick-glance current status
- `.gsd/REQUIREMENTS.md` — capability contract and validation state
- `.gsd/DECISIONS.md` — append-only architectural decisions
- `.gsd/milestones/` — milestone/slice/task planning and summaries

For a contributor-oriented roadmap that is easier to scan than the full GSD archive, read `OPEN_SOURCE_BUILD_PLAN.md`.

## Quick start

### Requirements

- Node.js `>=20`
- npm

### Install

```bash
npm install
```

### Browser test setup

Playwright is used for browser-level editor tests and smoke verification. It is **not** required just to build the CLI, but it **is** required for the web/editor verification paths.

Install the Chromium browser used by the repo's Playwright-based tests:

```bash
npm run test:setup:browsers
```

### Build

```bash
npm run build
```

### Test

Run the full Vitest suite:

```bash
npm test
```

Run only the browser/editor tests:

```bash
npm run test:web
```

Run the built-runtime smoke verification scripts:

```bash
npm run verify:smoke
```

### Schema checks

```bash
npm run schema:generate
npm run schema:check
```

## CLI usage

Build first so the CLI exists in `dist/`.

```bash
npm run build
node dist/cli.js --help
```

Available commands include:

```bash
node dist/cli.js init
node dist/cli.js open
```

## Project shape

Key files and boundaries:

- `src/cli.ts` — CLI entrypoint
- `src/commands/init.ts` — workspace initialization
- `src/commands/open.ts` — local bridge startup
- `src/bridge/server.mjs` — browser bridge runtime
- `src/agent/LayoutConsultant.ts` — AI consultant provider boundary and proposal validation
- `web/` — browser editor UI
- `schema.json` — generated document schema artifact
- `.gsd/` — planning, requirements, decision, and execution artifacts

Canonical local workspace files:

- `sfrb.config.json` — workspace config, including AI provider metadata and physics mode
- `resume.sfrb.json` — canonical resume document

Runtime boundaries worth understanding before you change things:

- browser state is reconciled from `/__sfrb/bootstrap`
- browser mutations persist through `/__sfrb/editor`
- AI layout proposals are requested through `/__sfrb/consultant`
- API secrets stay in environment variables, not in committed config
- the browser must never receive raw provider secrets or auth headers

## How planning works

This repo uses the `.gsd/` directory as the planning and execution source of truth.

### Planning model

Work is organized as:
- **Milestones** — major phases, such as `M001`
- **Slices** — vertical increments within a milestone, such as `S05`
- **Tasks** — single-unit implementation steps inside a slice

Key files:
- `.gsd/PROJECT.md` — what the project is right now
- `.gsd/STATE.md` — what is active right now
- `.gsd/REQUIREMENTS.md` — what capabilities are active, validated, deferred, or out of scope
- `.gsd/DECISIONS.md` — important architectural/pattern decisions
- `.gsd/milestones/M001/M001-ROADMAP.md` — milestone roadmap and slice completion state
- `.gsd/milestones/M001/slices/...` — slice plan, summary, and UAT docs

### How decisions get made

The project tries to avoid vague “someday” roadmaps.

The normal order is:
1. identify or refine a requirement
2. place it into a milestone/slice
3. document the execution plan
4. implement and verify it
5. write summary/UAT artifacts
6. update requirements and current-state docs only when proof exists

That means planning files are not decoration. They are the contract for what is actually being built and what has actually been proven.

### What a good planning PR looks like

A planning-focused PR is welcome if it improves clarity without inventing fake certainty. Good planning PRs usually do one of these:
- sharpen requirements so they are testable
- split a risky slice into smaller vertical steps
- improve milestone sequencing
- add missing observability or verification requirements
- reconcile stale docs after real code landed

## Contributing

Contributions are welcome, but this repo will be easier to work with if changes follow the project’s existing rules instead of bypassing them.

### Before you open a PR

Please do these first:
- read this README
- read `.gsd/PROJECT.md`
- read `.gsd/STATE.md`
- read `.gsd/REQUIREMENTS.md`
- look at the relevant milestone/slice docs under `.gsd/milestones/`
- check whether the change already has a planned slice or open direction

If your change is larger than a small bug fix or doc cleanup, open an issue or discussion first so the direction is agreed before code lands.

### Good first contributions

These are the easiest high-value contributions right now:
- README/docs clarity improvements
- test reliability improvements
- browser diagnostics/observability improvements
- fixture cleanup and temp-workspace test helpers
- print/export surface verification helpers
- bug fixes in validation, bridge sync, or editor state reconciliation
- accessibility improvements in the browser editor

### High-value PRs we actively want

If you want to work on meaningful next-step contributions, these are the kinds of PRs likely to help most:

#### 1. M003 printable presentation and export groundwork
- shared printable renderer work
- bridge print/export route wiring
- export-readiness and overflow-risk diagnostics
- print/export verification helpers

#### 2. CLI and automation improvements
- safer non-interactive automation paths
- future `export` command groundwork
- more explicit diagnostics for local agent and CI use

#### 3. Editor and presentation polish
- accessibility improvements
- selection/editing edge-case fixes
- design-mode overflow measurement hardening
- calmer export-preview and artifact-oriented UI polish

#### 4. Testing and verification
- stronger built-runtime verification
- lower-flake browser tests
- better smoke scripts for real workspace flows
- better failure-path coverage

#### 5. Documentation and contributor handoff
- roadmap clarity
- contributor onboarding docs
- truthful slice summaries after real work lands
- public-facing docs that stay aligned with `.gsd/` source docs

### PRs we are less likely to accept quickly

These are not banned, but they will need stronger justification:
- large refactors with no clear user or reliability payoff
- framework churn for its own sake
- abstractions that make the current code harder to debug
- features that bypass the canonical local document boundary
- changes that move secrets into committed config or browser-visible state
- UI rewrites that ignore the existing document-vs-design physics model

### PR expectations

A good PR here should usually:
- stay aligned with the canonical local document model
- preserve the `/__sfrb/bootstrap` and `/__sfrb/editor` contract unless the PR is explicitly changing it
- avoid leaking secrets into logs, browser payloads, or committed files
- include the lightest sufficient tests or verification
- update `.gsd/` artifacts when the change materially affects project state, planning, or validated behavior
- explain tradeoffs plainly

## Branch hierarchy

The repo should follow this promotion model:

- `main` — most up-to-date **stable** branch
- `DEV` — integration branch for active development
- `TEST` — pre-release validation branch between `DEV` and `main`

Promotion flow:

1. branch off `DEV` for feature or fix work
2. merge the work branch back into `DEV`
3. promote `DEV` into `TEST`
4. validate in `TEST`
5. promote `TEST` into `main`

In short:

`feature/fix branch -> DEV -> TEST -> main`

### Branching rules

- Do **not** branch new work directly from `main` unless it is an explicit hotfix process.
- `main` should remain releasable.
- `DEV` is where integration happens.
- `TEST` is where promotion candidates are verified before landing in `main`.
- Keep promotion directional: `DEV -> TEST -> main`.
- If a branch needs backmerged policy or docs changes from stable, do that before promotion.
- If a PR changes release/process policy, update the README and any affected `.gsd/` docs in the same change.

## Release and promotion checklist

Before promoting upward:

- branch is based on the current intended source branch
- `npm run build` passes
- `npm test` passes
- milestone/slice docs in `.gsd/` reflect actual shipped state
- requirement/status docs are not stale
- any license-related file additions or changes are present
- branch is clean and ready to merge upward

## License

This repository is licensed under the **Apache License 2.0**. See [`LICENSE`](./LICENSE).

If you redistribute this project or derivative works, the practical rules from Apache 2.0 that matter here are:

- include a copy of the Apache 2.0 license
- keep existing copyright, attribution, patent, and license notices
- mark files you changed with prominent notices
- if a `NOTICE` file is added later, include its required attributions when redistributing
- do not imply warranties; the project is provided on an `AS IS` basis
- do not assume trademark rights from the license

This README is guidance only. The `LICENSE` file is the authority.

## Status going forward

M001 and M002 are treated as the shipped foundation. The active build track is now M003: create a shared printable presentation surface, then add trustworthy PDF export and presentation depth on top of it.

If you want to contribute and you are not sure where to start, docs, tests, verification helpers, and M003 planning/execution work are the safest high-value places to begin.
