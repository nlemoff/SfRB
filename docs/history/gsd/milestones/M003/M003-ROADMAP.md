# M003: Export & Presentation Depth

**Vision:** Make SfRB feel finished at the moment that matters most: a user can take the real editor state they built, export a trustworthy PDF that matches it, and rely on stronger presentation behavior for the common one-page resume path without drifting away from the canonical model. The milestone should also stay legible to open-source contributors: each slice should end with a truthful handoff that a PR into `DEV` can summarize without replaying the full internal planning archive.

## Why this milestone matters now

M001 and M002 established the product foundation: one canonical local document, a bridge-served browser runtime, guided editing lenses, and structured mutation parity. M003 is where that work becomes externally trustworthy. The user is no longer only editing a resume — they are expecting a clean artifact they can actually send.

For contributors, this milestone should be read as **artifact trust first, polish second**. The work is not “make printing pretty.” The work is to make export derive from the same canonical model as the editor, expose explicit risk when content does not fit, and only then layer presentation depth on top. The public build plan should mirror this logic without replacing the internal GSD docs.

## Success Criteria

- A user can export a PDF from the real browser/bridge flow and the artifact matches the canonical resume they built rather than a separate export-only representation.
- The common one-page resume path exports cleanly with editor chrome absent and page geometry preserved.
- When export would clip or overflow, the product surfaces an explicit warning or failure state instead of silently producing an untrustworthy PDF.
- Browser export and CLI export derive from the same printable presentation surface and stay coherent after canonical edits made through either path.
- Presentation depth is materially improved: the exported artifact and export preview feel deliberate, calm, and product-grade rather than like a printed editor prototype.
- A fresh contributor can identify the next slice or lane from the roadmap and `OPEN_SOURCE_BUILD_PLAN.md` without needing to reinterpret completed M001/M002 history.

## Key Risks / Unknowns

- Print fidelity from the current editor renderer — `web/src/editor/Canvas.tsx` mixes content with editor-only chrome, so printing the existing DOM risks leaking handles, HUDs, and diagnostics into the PDF.
- Export trust without a pagination engine — the system has page geometry and overflow signals, but not true multi-page reflow; the milestone must avoid silent clipping while still shipping a usable export path.
- Cross-surface drift between browser, bridge, CLI, and artifact generation — if browser preview, CLI export, and canonical saved state do not share one renderer contract, M003 can appear to work while eroding trust.
- Contributor drift — if the public plan and milestone docs diverge, outside contributors may optimize for the wrong seam or duplicate work.

## Proof Strategy

- Print fidelity from the current editor renderer → retired in **S01** by proving a real bridge-served export presentation route renders canonical content without editor chrome and exposes explicit export-readiness / overflow state.
- Export trust without a pagination engine → retire in **S02** by proving one-page PDF generation succeeds for the happy path and visibly blocks or warns on known-overflow cases instead of clipping silently.
- Cross-surface drift between browser, bridge, CLI, and artifact generation → retire in **S02** by proving the real browser shell and `dist/cli.js export` both consume the shared `/print` markers, gate export off the same ready/risk/blocked policy, and preserve repeat-artifact regeneration semantics.
- Contributor drift → mitigate at the end of each slice by updating the roadmap, slice summary, and open-source build plan with concise, PR-reusable handoff language.

## Verification Classes

- Contract verification: presentation-renderer tests, export-route payload/ready-state tests, CLI export command tests, artifact existence/non-empty checks, and targeted regression coverage for overflow/failure signaling.
- Integration verification: built runtime exercised through the bridge, browser export preview/UI, shared export route, Playwright PDF generation, and CLI export invocation against real temp workspaces.
- Operational verification: local export flow through `dist/cli.js open` and `dist/cli.js export`, including deterministic readiness/wait behavior before PDF generation and real file regeneration on repeated export.
- UAT / human verification: exported artifact and preview feel calm, polished, and free of editor chrome; presentation polish still satisfies the sleek/minimal product bar from R011.
- Handoff verification: contributor-facing docs truthfully describe what is already done, what is next, and which lane a new contributor can start in.

## Milestone Definition of Done

This milestone is complete only when all are true:

- All slice deliverables are complete.
- The printable presentation renderer, browser export UX, bridge route, and CLI export path are all wired to the same canonical model and real runtime.
- The real entrypoints exist and are exercised: browser export from `dist/cli.js open` and CLI export from `dist/cli.js export` (or the finalized equivalent command contract).
- Success criteria are re-checked against live behavior and real PDF artifacts, not just DOM snapshots or fixture-only tests.
- Contributor-facing roadmap and build-plan artifacts are updated at slice boundaries so the open-source contribution story remains aligned with actual milestone state.
- Final integrated acceptance passes: a user can edit a real workspace, export a PDF that matches what they built, and receive explicit failure visibility instead of silent clipping when the content does not fit.

## Requirement Coverage

- Covers: R013
- Partially covers: R011
- Leaves for later: advanced multi-page pagination controls, additional paper-size/custom print controls, and any deeper AI-assisted presentation features beyond export trust.
- Orphan risks: none; the main remaining non-goal is true multi-page layout/reflow sophistication, which is intentionally deferred rather than silently implied.

## Slices

- [x] **S01: Printable Presentation Surface** `risk:high` `depends:[]`
  > Shipped boundary: the runtime now exposes a real `/print` route backed by canonical bootstrap state, renders a chrome-free printable surface, preserves one-page page/frame geometry, publishes deterministic `ready` / `risk` / `blocked` export markers, and has a built-runtime smoke verifier plus contributor-facing handoff docs.
- [x] **S02: Shared PDF Export Flows** `risk:medium` `depends:[S01]`
  > Shipped boundary: `/print?mode=artifact` now provides the chrome-free artifact view of the shared renderer, `dist/cli.js export` generates real PDFs only after the shared route reports `ready`, and the browser shell opens the same print surface while mirroring its ready / risk / blocked trust policy.
- [x] **S03: Presentation Depth & Final Export Assembly** `risk:medium` `depends:[S01,S02]`
  > Shipped boundary: the shared preview/artifact surfaces now feel calmer without changing the root export-marker contract, the browser shell still mirrors artifact-route truth instead of recomputing readiness, and the assembled runtime is proven end to end by persisting a real browser edit to canonical state, reflecting it on `/print`, and exporting a non-empty `%PDF` through `dist/cli.js export` from that same workspace.

## Current Handoff After S03

M003 is now complete. Future contributors should treat the export/presentation work in this milestone as a shipped trust contract rather than an active discovery area.

Downstream contributors can rely on these invariants:

- `dist/cli.js open` and `dist/cli.js export` still derive from the same canonical workspace model used by the browser editor.
- `/print` remains the human-facing shared preview surface, and `/print?mode=artifact` remains the chrome-free artifact surface.
- The shared print root contract is unchanged and still drives automation plus browser/CLI trust decisions through `#root[data-export-state][data-overflow-status][data-blocked-reason][data-risk-count][data-max-overflow-px]` alongside the existing render/payload markers.
- Browser export in `web/src/App.tsx` continues to source truth from the artifact-route iframe probe (`readBridgePrintSurfaceSnapshot()`), so ready / risk / blocked semantics remain mirrored rather than reimplemented.
- Preview polish is intentionally preview-only: calmer framing, diagnostics presentation, and export copy appear on `/print`, while artifact mode stays chrome-free and marker-compatible.
- The assembled acceptance proof is now shipped: `tests/web/export-assembly.test.ts` plus `scripts/verify-m003-s03-export-assembly.mjs` prove browser edit persistence, shared popup preview agreement, and successful `%PDF` CLI export on one workspace.
- `scripts/verify-s02-export-flows.mjs` and the focused Vitest suites remain the baseline transport regression checks for the underlying ready / risk / blocked policy.

Explicit non-goals still deferred beyond M003:

- true multi-page pagination or reflow
- deeper paper-size or custom print controls
- richer export controls beyond the current trustworthy one-page path

That means post-M003 work should extend or harden the existing trust contract, not imply those deferred capabilities are already shipped.

## Open-Source Contribution Shape

The milestone is complete, but contributors can still think in **lanes** when choosing follow-on work:

### Lane A — Shared rendering contract
- Canonical page geometry, printable DOM structure, chrome-free rendering, and reusable page/frame/text composition.
- **Status after M003:** shipped for the one-page trust path; follow-on work should harden or extend the existing renderer without reintroducing editor chrome.
- Good next tasks: geometry regression coverage, renderer cleanup, future template/presentation-system seams that still preserve canonical print markers.

### Lane B — Runtime route and state contract
- Bridge print/export route, readiness markers, overflow/risk markers, and route-level failure visibility.
- **Status after M003:** stable and consumed by browser + CLI export.
- Good next tasks: bounded route hardening, diagnostics refinements, and future capability work that continues to publish explicit readiness/failure state.

### Lane C — Export transport and artifact generation
- Browser export affordances, CLI `export` command, Playwright PDF generation, and artifact regeneration semantics.
- **Status after M003:** shipped and regression-sensitive rather than greenfield.
- Good next tasks: transport hardening, artifact regression checks, packaging/distribution work, and future controls that preserve the current trust policy.

### Lane D — Presentation system follow-on
- Template quality, reusable themes, presentation customization, and deeper visual-system work.
- **Status after M003:** ready to become the next milestone lane, but it must build on the shipped canonical export surface rather than fork it.
- Good next tasks: template/theme system exploration, polish that composes with the shared renderer, and contributor ergonomics for presentation-level extensions.

### Lane E — Docs, proof, and contributor handoff
- Smoke verifiers, slice summaries, roadmap updates, contributor docs, and PR-ready summary text.
- **Status after M003:** keep the repo truthful as follow-on milestones are scoped; do not let public docs drift ahead of the shipped trust contract.
- Good next tasks: M004 planning handoff, packaging/docs cleanup, and regression-proof documentation around the current export contract.

## Boundary Map

### S01 → S02

Produces:
- A dedicated bridge-served export/print route that loads the same canonical workspace payload used by the editor runtime.
- A shared printable presentation renderer and page-geometry contract for canonical pages, margins, frames, and semantic content.
- Explicit export-state signals for readiness, overflow/risk visibility, and chrome-free render completion that downstream browser/CLI export flows can wait on.
- A built-runtime verifier (`scripts/verify-s01-print-surface.mjs`) and contributor-facing docs that describe the contract truthfully.

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- A stable chrome-free presentation surface that later polish work can refine without reintroducing editor HUD/diagnostic UI.
- A testable invariant that exported output is derived from canonical saved state rather than browser-local draft or gesture state.
- A concise, PR-reusable summary of what S01 actually accomplished.

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- Browser export controls and CLI export command wiring that both target the shared print route.
- Real PDF artifact generation and failure-path contracts for success, overflow-blocked export, and repeat export regeneration.
- Deterministic runtime markers/scripts for assembled export verification in built-runtime smoke coverage.
- Updated contributor docs describing how final presentation polish should build on the export transport already in place.

Consumes:
- S01 printable presentation route, shared renderer, and readiness diagnostics

### M003 → Later Milestones

Produces:
- One shipped one-page export trust path that is shared across browser preview, browser print, and CLI PDF export.
- A product-grade preview treatment that preserves explicit ready / risk / blocked visibility instead of polishing it away.
- A final milestone handoff with PR-ready language and concrete verification anchors future contributors can cite without replaying internal planning history.

Consumes:
- M001/M002 canonical model, bridge runtime, and guided editing foundation

## Forward Milestone Alignment

M001 and M002 are historical foundation milestones and should not be re-opened during future planning. After completed M003, the next roadmap should stay contributor-friendly by continuing the same lane model:

- **M004 (provisional): Template & Presentation System** — deepen reusable resume themes, template quality, presentation customization, and template contribution ergonomics without forking the canonical model.
- **M005 (provisional): Distribution, Automation & Ecosystem** — improve packaging, docs, scripted workflows, contributor automation, and external ecosystem support once export trust is solid.

These are intentionally directional rather than fully committed slices. Their purpose is to keep future planning legible for outside contributors without pretending later work is already specified. The eventual PRs into `DEV` should summarize milestone movement in this same simplified shape.
