# S01: Printable Presentation Surface

**Goal:** Establish a dedicated, bridge-served printable presentation surface that renders the canonical resume without editor chrome, preserves canonical page geometry, and exposes explicit export-readiness / overflow state for downstream browser and CLI export flows.
**Demo:** In the shipped runtime, a contributor can open a real workspace through `dist/cli.js open`, navigate to the print/export surface, and see canonical resume content rendered on the correct page box with no editor HUD/handles/diagnostics present, while stable readiness and overflow markers report whether the current document is safe to export.

This slice still exists to retire the highest-risk M003 unknown: print fidelity from the current editor renderer. The override does not change that product need; it changes how the work should be handed off. The plan below keeps S01 tightly focused on the real export surface, but it breaks the work into clean contributor-sized increments with explicit contracts, file targets, and verification so open-source contributors can pick up a task without first absorbing the entire internal GSD corpus.

The grouping is intentional. T01 creates the one thing every later export feature depends on: a dedicated printable renderer and bridge route that read canonical state instead of printing the live editor DOM. T02 closes the trust contract by making the surface self-describing: downstream browser/CLI export code must be able to inspect readiness, overflow risk, and chrome-free render completion deterministically. T03 finishes at the shipped-runtime boundary and leaves downstream contributors with a trustworthy proof trail plus updated roadmap/summary guidance rather than just internal implementation notes.

This slice directly advances active requirement **R013** and partially advances **R011** by ensuring the first export-facing surface is calm and artifact-oriented rather than a printed editor prototype.

## Must-Haves

- The bridge serves a dedicated printable/export presentation route that reads the same canonical workspace payload and saved document state as the editor runtime.
- Printable rendering is shared and chrome-free: canonical content, page size, margins, frames, and semantic text appear, while editor-only affordances (handles, HUDs, diagnostics, save state UI, consultant UI) do not.
- The print surface exposes explicit, inspectable export-state markers for readiness, overflow/risk visibility, and render completion so later browser/CLI PDF flows can wait on them deterministically.
- The first trusted path preserves the common one-page Letter resume geometry from canonical state and does not silently imply multi-page pagination.
- Built-runtime verification proves the print surface from a real workspace, and slice artifacts leave downstream contributors with an honest handoff for S02/S03.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
- `npm run build`
- `node scripts/verify-s01-print-surface.mjs`
- Failure-path check: open a known-overflow workspace on the print surface and verify the export-state marker reports risk/blocked visibility instead of silently presenting a clean-ready state.
- Human/UAT: inspect the print surface in a real browser and confirm it feels like a deliberate resume artifact rather than a stripped editor canvas.

## Observability / Diagnostics

- Runtime signals: printable surface state (`idle`/`rendering`/`ready` plus overflow/risk status), canonical workspace root/document path, active physics mode, and a chrome-free render marker.
- Inspection surfaces: dedicated print/export route, DOM state markers on the print surface, `/__sfrb/bootstrap`, `resume.sfrb.json`, and the built-runtime smoke verifier.
- Failure visibility: route/bootstrap mismatch, physics/render unsupported cases, and overflow-risk conditions remain inspectable through route responses, DOM markers, and smoke-script assertions.
- Redaction constraints: diagnostics may expose workspace-relative file paths, physics mode, frame/block ids, and overflow measurements, but must not expose env-var values, provider secrets, or unrelated local environment state.

## Integration Closure

- Upstream surfaces consumed: `src/document/schema.ts`, `src/document/store.ts`, `src/document/validation.ts`, `src/bridge/server.mjs`, `web/src/bridge-client.ts`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts`, and existing browser/bridge verification helpers in `tests/utils/bridge-browser.ts`.
- New wiring introduced in this slice: shared printable renderer module(s), bridge-served print/export route, export-state DOM contract, and built-runtime print-surface verification.
- What remains before the milestone is truly usable end-to-end: browser export controls, CLI PDF generation, artifact creation, and final presentation-depth polish in S02/S03.

## Tasks

- [ ] **T01: Introduce a shared printable renderer and bridge print route** `est:4h`
  - Why: S02 and S03 cannot safely generate PDFs until the runtime has one canonical, chrome-free presentation surface to target instead of printing the interactive editor DOM.
  - Files: `src/bridge/server.mjs`, `web/src/bridge-client.ts`, `web/src/presentation/render-printable-resume.ts`, `web/src/presentation/print-surface.ts`, `tests/bridge/bridge-print-surface-contract.test.ts`, `tests/web/printable-presentation-surface.test.ts`
  - Do: Extract or introduce a print-focused renderer that consumes canonical document/page geometry for both supported physics paths, reusing editor rendering knowledge where helpful but not editor chrome; add a dedicated bridge route that serves this surface from saved canonical workspace state; and add bridge/browser tests that prove canonical content appears while editor-only controls do not. Keep the implementation DOM-first and dependency-light to match the current bridge/runtime model. Relevant skill to load before implementation: `test`.
  - Verify: `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
  - Done when: a real workspace can load the print route from the bridge, canonical content and page geometry render there, and tests prove the route is fed by canonical state rather than editor-local chrome or draft state.
- [ ] **T02: Expose deterministic export readiness and overflow diagnostics on the print surface** `est:3h`
  - Why: The milestone’s trust bar is not just “render something printable”; downstream browser/CLI export flows need a stable, inspectable contract that says whether export is ready, risky, or blocked.
  - Files: `web/src/presentation/render-printable-resume.ts`, `web/src/presentation/print-surface.ts`, `web/src/editor/Canvas.tsx`, `web/src/bridge-client.ts`, `tests/bridge/bridge-print-surface-contract.test.ts`, `tests/web/printable-presentation-surface.test.ts`
  - Do: Add explicit DOM/state markers for render completion, physics/render support, overflow or clipping risk, and ready-vs-blocked export posture; reuse existing overflow measurement/page geometry knowledge rather than inventing a separate pagination model; and extend tests so a clear one-page case reports ready while a known overflow case surfaces risk/blocked visibility. Keep the contract easy for later Playwright PDF generation and browser export UI to inspect. Relevant skill to load before implementation: `test`.
  - Verify: `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
  - Done when: future automation can determine from the print surface alone whether export is ready or risky, and overflow cases no longer require inferring trust from visual inspection alone.
- [ ] **T03: Prove the shipped print surface and record downstream contributor handoff** `est:3h`
  - Why: S01 only meaningfully closes once the built runtime proves the new route against a real workspace and the milestone artifacts tell downstream contributors exactly what S02/S03 can now build on.
  - Files: `scripts/verify-s01-print-surface.mjs`, `tests/utils/bridge-browser.ts`, `.gsd/milestones/M003/M003-ROADMAP.md`, `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md`, `OPEN_SOURCE_BUILD_PLAN.md`
  - Do: Add a shipped-runtime smoke verifier that opens a real temp workspace, loads the print route, checks chrome-free canonical rendering plus readiness/overflow markers, and proves the route reflects saved canonical state; then update the M003 roadmap, slice summary, and contributor-facing build plan so open-source contributors can clearly see what S01 now guarantees and where S02/S03 begin. Relevant skill to load before implementation: `test`.
  - Verify: `npm run build && node scripts/verify-s01-print-surface.mjs && npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
  - Done when: the built runtime proves the print surface from a real workspace, the handoff docs truthfully describe the new contract, and a fresh contributor could start S02 without rediscovering S01’s invariants.

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
