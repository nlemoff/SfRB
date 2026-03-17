# S01: Printable Presentation Surface

**Goal:** Establish a dedicated, bridge-served printable presentation surface that renders the canonical resume without editor chrome, preserves canonical page geometry, exposes explicit export-readiness / overflow state for downstream browser and CLI export flows, and leaves behind a contributor-ready handoff that open-source collaborators can continue without replaying the entire internal planning history.

**Demo:** In the shipped runtime, a contributor can open a real workspace through `dist/cli.js open`, navigate to the print/export surface, and see canonical resume content rendered on the correct page box with no editor HUD/handles/diagnostics present, while stable readiness and overflow markers report whether the current document is safe to export. That same contributor can then read `OPEN_SOURCE_BUILD_PLAN.md` plus the refreshed M003 roadmap and understand exactly what S01 now guarantees, what S02/S03 must build next, and what a clean PR into `DEV` should summarize.

This slice still exists to retire the highest-risk M003 unknown: print fidelity from the current editor renderer. The override does not change that product need; it changes how the work must be packaged and handed off. S01 therefore stays tightly focused on the real export surface, but every incomplete task now ends with explicit contributor-facing artifacts so outside collaborators can join future work cleanly.

The grouping remains intentional. T01 establishes the canonical printable renderer and bridge route. T02 makes the surface self-describing through deterministic readiness and overflow signals. T03 proves the shipped runtime, updates the contributor-facing roadmap/build plan, and prepares a PR-ready summary boundary for merging the planning refresh into `DEV`.

This slice directly advances active requirement **R013** and partially advances **R011** by ensuring the first export-facing surface is calm, artifact-oriented, and documented in a way that outside contributors can extend responsibly.

## Must-Haves

- The bridge serves a dedicated printable/export presentation route that reads the same canonical workspace payload and saved document state as the editor runtime.
- Printable rendering is shared and chrome-free: canonical content, page size, margins, frames, and semantic text appear, while editor-only affordances (handles, HUDs, diagnostics, save state UI, consultant UI) do not.
- The print surface exposes explicit, inspectable export-state markers for readiness, overflow/risk visibility, and render completion so later browser/CLI PDF flows can wait on them deterministically.
- The first trusted path preserves the common one-page Letter resume geometry from canonical state and does not silently imply multi-page pagination.
- Built-runtime verification proves the print surface from a real workspace.
- Slice artifacts leave downstream contributors with an honest handoff: updated roadmap language, a streamlined open-source build plan, and a concise summary that can be reused in the eventual PR into `DEV`.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
- `npm run build`
- `node scripts/verify-s01-print-surface.mjs`
- Failure-path check: open a known-overflow workspace on the print surface and verify the export-state marker reports risk/blocked visibility instead of silently presenting a clean-ready state.
- Docs/handoff check: read `OPEN_SOURCE_BUILD_PLAN.md`, `.gsd/milestones/M003/M003-ROADMAP.md`, and `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md` and confirm a fresh contributor could identify the next contribution lane without consulting historical M001/M002 planning.
- Human/UAT: inspect the print surface in a real browser and confirm it feels like a deliberate resume artifact rather than a stripped editor canvas.

## Observability / Diagnostics

- Runtime signals: printable surface state (`idle`/`rendering`/`ready` plus overflow/risk status), canonical workspace root/document path, active physics mode, and a chrome-free render marker.
- Inspection surfaces: dedicated print/export route, DOM state markers on the print surface, `/__sfrb/bootstrap`, `resume.sfrb.json`, the built-runtime smoke verifier, and contributor-facing handoff docs that describe the contract truthfully.
- Failure visibility: route/bootstrap mismatch, physics/render unsupported cases, overflow-risk conditions, and handoff drift remain inspectable through route responses, DOM markers, smoke-script assertions, and roadmap/build-plan text.
- Redaction constraints: diagnostics may expose workspace-relative file paths, physics mode, frame/block ids, and overflow measurements, but must not expose env-var values, provider secrets, or unrelated local environment state.

## Integration Closure

- Upstream surfaces consumed: `src/document/schema.ts`, `src/document/store.ts`, `src/document/validation.ts`, `src/bridge/server.mjs`, `web/src/bridge-client.ts`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts`, and existing browser/bridge verification helpers in `tests/utils/bridge-browser.ts`.
- New wiring introduced in this slice: shared printable renderer module(s), bridge-served print/export route, export-state DOM contract, built-runtime print-surface verification, and refreshed contributor-facing roadmap/build-plan guidance.
- What remains before the milestone is truly usable end-to-end: browser export controls, CLI PDF generation, artifact creation, final presentation-depth polish in S02/S03, and the actual GitHub PR/merge flow that will carry this planning refresh into `DEV`.

## Tasks

- [x] **T01: Introduce a shared printable renderer and bridge print route** `est:4h`
  - Why: S02 and S03 cannot safely generate PDFs until the runtime has one canonical, chrome-free presentation surface to target instead of printing the interactive editor DOM.
  - Files: `src/bridge/server.mjs`, `web/src/bridge-client.ts`, `web/src/presentation/render-printable-resume.ts`, `web/src/presentation/print-surface.ts`, `tests/bridge/bridge-print-surface-contract.test.ts`, `tests/web/printable-presentation-surface.test.ts`
  - Do: Extract or introduce a print-focused renderer that consumes canonical document/page geometry for both supported physics paths, reusing editor rendering knowledge where helpful but not editor chrome; add a dedicated bridge route that serves this surface from saved canonical workspace state; and add bridge/browser tests that prove canonical content appears while editor-only controls do not. Keep the implementation DOM-first and dependency-light to match the current bridge/runtime model. Relevant skill to load before implementation: `test`.
  - Verify: `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
  - Done when: a real workspace can load the print route from the bridge, canonical content and page geometry render there, and tests prove the route is fed by canonical state rather than editor-local chrome or draft state.
- [x] **T02: Expose deterministic export readiness and overflow diagnostics on the print surface** `est:3h`
  - Why: The milestone’s trust bar is not just “render something printable”; downstream browser/CLI export flows need a stable, inspectable contract that says whether export is ready, risky, or blocked.
  - Files: `web/src/presentation/render-printable-resume.ts`, `web/src/presentation/print-surface.ts`, `web/src/editor/Canvas.tsx`, `web/src/bridge-client.ts`, `tests/bridge/bridge-print-surface-contract.test.ts`, `tests/web/printable-presentation-surface.test.ts`
  - Do: Add explicit DOM/state markers for render completion, physics/render support, overflow or clipping risk, and ready-vs-blocked export posture; reuse existing overflow measurement/page geometry knowledge rather than inventing a separate pagination model; and extend tests so a clear one-page case reports ready while a known overflow case surfaces risk/blocked visibility. Keep the contract easy for later Playwright PDF generation and browser export UI to inspect. Relevant skill to load before implementation: `test`.
  - Verify: `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
  - Done when: future automation can determine from the print surface alone whether export is ready or risky, and overflow cases no longer require inferring trust from visual inspection alone.
- [x] **T03: Prove the shipped print surface and record open-source / PR handoff** `est:3h`
  - Why: S01 only meaningfully closes once the built runtime proves the new route against a real workspace and the milestone artifacts tell downstream contributors exactly what S02/S03 can now build on and what a merge into `DEV` should summarize.
  - Files: `scripts/verify-s01-print-surface.mjs`, `tests/utils/bridge-browser.ts`, `.gsd/milestones/M003/M003-ROADMAP.md`, `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md`, `OPEN_SOURCE_BUILD_PLAN.md`
  - Do: Add a shipped-runtime smoke verifier that opens a real temp workspace, loads the print route, checks chrome-free canonical rendering plus readiness/overflow markers, and proves the route reflects saved canonical state; then update the M003 roadmap, slice summary, and contributor-facing build plan so open-source contributors can clearly see what S01 now guarantees, where S02/S03 begin, and which contribution lanes are unlocked next. Ensure the summary artifacts are concise enough to seed the eventual PR description into `DEV` without inventing a second source of truth. Relevant skill to load before implementation: `test`.
  - Verify: `npm run build && node scripts/verify-s01-print-surface.mjs && npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
  - Done when: the built runtime proves the print surface from a real workspace, the handoff docs truthfully describe the new contract, and a fresh contributor could start S02 or write a PR summary without rediscovering S01’s invariants.

## Files Likely Touched

- `src/bridge/server.mjs`
- `web/src/bridge-client.ts`
- `web/src/presentation/render-printable-resume.ts`
- `web/src/presentation/print-surface.ts`
- `web/src/editor/Canvas.tsx`
- `tests/bridge/bridge-print-surface-contract.test.ts`
- `tests/web/printable-presentation-surface.test.ts`
- `scripts/verify-s01-print-surface.mjs`
- `tests/utils/bridge-browser.ts`
- `.gsd/milestones/M003/M003-ROADMAP.md`
- `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md`
- `OPEN_SOURCE_BUILD_PLAN.md`
