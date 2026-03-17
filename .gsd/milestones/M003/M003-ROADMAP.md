# M003: Export & Presentation Depth

**Vision:** Make SfRB feel finished at the moment that matters most: a user can take the real editor state they built, export a trustworthy PDF that matches it, and rely on stronger presentation behavior for the common one-page resume path without drifting away from the canonical model.

## Why this milestone matters now

M001 and M002 established the product foundation: one canonical local document, a bridge-served browser runtime, guided editing lenses, and structured mutation parity. M003 is where that work becomes externally trustworthy. The user is no longer only editing a resume — they are expecting a clean artifact they can actually send.

For contributors, this milestone should be read as **artifact trust first, polish second**. The work is not “make printing pretty.” The work is to make export derive from the same canonical model as the editor, expose explicit risk when content does not fit, and only then layer presentation depth on top.

## Success Criteria

- A user can export a PDF from the real browser/bridge flow and the artifact matches the canonical resume they built rather than a separate export-only representation.
- The common one-page resume path exports cleanly with editor chrome absent and page geometry preserved.
- When export would clip or overflow, the product surfaces an explicit warning or failure state instead of silently producing an untrustworthy PDF.
- Browser export and CLI export derive from the same printable presentation surface and stay coherent after canonical edits made through either path.
- Presentation depth is materially improved: the exported artifact and export preview feel deliberate, calm, and product-grade rather than like a printed editor prototype.

## Key Risks / Unknowns

- Print fidelity from the current editor renderer — `web/src/editor/Canvas.tsx` mixes content with editor-only chrome, so printing the existing DOM risks leaking handles, HUDs, and diagnostics into the PDF.
- Export trust without a pagination engine — the system has page geometry and overflow signals, but not true multi-page reflow; the milestone must avoid silent clipping while still shipping a usable export path.
- Cross-surface drift between browser, bridge, CLI, and artifact generation — if browser preview, CLI export, and canonical saved state do not share one renderer contract, M003 can appear to work while eroding trust.

## Proof Strategy

- Print fidelity from the current editor renderer → retire in S01 by proving a real bridge-served export presentation route renders canonical content without editor chrome and exposes explicit export-readiness / overflow state.
- Export trust without a pagination engine → retire in S02 by proving one-page PDF generation succeeds for the happy path and visibly blocks or warns on known-overflow cases instead of clipping silently.
- Cross-surface drift between browser, bridge, CLI, and artifact generation → retire in S03 by proving a real workspace can be edited through browser and CLI paths, then exported through the assembled runtime with artifact checks against current canonical state.

## Verification Classes

- Contract verification: presentation-renderer tests, export-route payload/ready-state tests, CLI export command tests, artifact existence/non-empty checks, and targeted regression coverage for overflow/failure signaling.
- Integration verification: built runtime exercised through the bridge, browser export preview/UI, shared export route, Playwright PDF generation, and CLI export invocation against real temp workspaces.
- Operational verification: local export flow through `dist/cli.js open` and `dist/cli.js export`, including deterministic readiness/wait behavior before PDF generation and real file regeneration on repeated export.
- UAT / human verification: exported artifact and preview feel calm, polished, and free of editor chrome; presentation polish still satisfies the sleek/minimal product bar from R011.

## Milestone Definition of Done

This milestone is complete only when all are true:

- All slice deliverables are complete.
- The printable presentation renderer, browser export UX, bridge route, and CLI export path are all wired to the same canonical model and real runtime.
- The real entrypoints exist and are exercised: browser export from `dist/cli.js open` and CLI export from `dist/cli.js export` (or the finalized equivalent command contract).
- Success criteria are re-checked against live behavior and real PDF artifacts, not just DOM snapshots or fixture-only tests.
- Final integrated acceptance passes: a user can edit a real workspace, export a PDF that matches what they built, and receive explicit failure visibility instead of silent clipping when the content does not fit.

## Requirement Coverage

- Covers: R013
- Partially covers: R011
- Leaves for later: advanced multi-page pagination controls, additional paper-size/custom print controls, and any deeper AI-assisted presentation features beyond export trust.
- Orphan risks: none; the main remaining non-goal is true multi-page layout/reflow sophistication, which is intentionally deferred rather than silently implied.

## Slices

- [ ] **S01: Printable Presentation Surface** `risk:high` `depends:[]`
  > After this: the shipped runtime exposes a real export/print preview surface that renders canonical resume content without editor chrome, preserves page geometry, and visibly reports whether the current document is safe to export.
- [ ] **S02: Shared PDF Export Flows** `risk:medium` `depends:[S01]`
  > After this: the user can trigger PDF export from the browser and the CLI through the same print renderer, with real one-page PDF artifacts generated for the happy path and explicit blocked/warned behavior for overflow cases.
- [ ] **S03: Presentation Depth & Final Export Assembly** `risk:medium` `depends:[S01,S02]`
  > After this: export presentation is polished across the supported paths, and a real edited workspace is proven end-to-end through browser edit, CLI edit, export preview, and final PDF artifact verification.

## Open-Source Contribution Shape

These slices stay sequential at the milestone level, but contributors should think in **lanes** rather than one monolithic stream:

### Lane A — Shared rendering contract
- Canonical page geometry, printable DOM structure, chrome-free rendering, and reusable page/frame/text composition.
- Starts in S01 and remains the source of truth for S02/S03.

### Lane B — Runtime route and state contract
- Bridge print/export route, readiness markers, overflow/risk markers, and route-level failure visibility.
- Begins in S01, then supports export automation in S02.

### Lane C — Export transport and artifact generation
- Browser export affordances, CLI `export` command, Playwright PDF generation, and artifact regeneration semantics.
- Primarily S02 work after the renderer contract is proven.

### Lane D — Presentation polish and end-to-end proof
- Calm export preview, final product-grade surface treatment, repeated export verification, and real browser+CLI edited-workspace acceptance.
- Primarily S03 work.

### Lane E — Docs and contributor handoff
- Public roadmap notes, slice summaries, smoke scripts, and truthful downstream handoff after each slice so new contributors can join without replaying the whole internal planning history.
- Should happen at the end of each slice, not as a substitute for implementation.

## Boundary Map

### S01 → S02

Produces:
- A dedicated bridge-served export/print route that loads the same canonical workspace payload used by the editor runtime.
- A shared printable presentation renderer and page-geometry contract for canonical pages, margins, frames, and semantic content.
- Explicit export-state signals for readiness, overflow/risk visibility, and chrome-free render completion that downstream browser/CLI export flows can wait on.

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- A stable chrome-free presentation surface that later polish work can refine without reintroducing editor HUD/diagnostic UI.
- A testable invariant that exported output is derived from canonical saved state rather than browser-local draft or gesture state.

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- Browser export controls and CLI export command wiring that both target the shared print route.
- Real PDF artifact generation and failure-path contracts for success, overflow-blocked export, and repeat export regeneration.
- Deterministic runtime markers/scripts for assembled export verification in built-runtime smoke coverage.

Consumes:
- S01 printable presentation route, shared renderer, and readiness diagnostics

## Forward Milestone Alignment

M001 and M002 are historical foundation milestones and should not be re-opened during future planning. After M003, the next roadmap should stay contributor-friendly by continuing the same lane model:

- **M004 (provisional): Template & Presentation System** — deepen reusable resume themes, template quality, and presentation customization without forking the canonical model.
- **M005 (provisional): Distribution, Automation & Ecosystem** — improve packaging, docs, scripted workflows, and external contributor ergonomics once export trust is solid.

These are intentionally directional rather than fully committed slices. Their purpose is to keep future planning legible for outside contributors without pretending later work is already specified.
