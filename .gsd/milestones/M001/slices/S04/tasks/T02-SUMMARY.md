---
id: T02
parent: S04
milestone: M001
provides:
  - A document-mode DOM editor surface with stable selection/editing state, inline textarea editing, debounced/blur/Enter commits through the validated bridge mutation route, and browser-observable affordance/save diagnostics.
key_files:
  - web/src/App.tsx
  - web/src/editor/Canvas.tsx
  - web/src/editor/engine.ts
  - tests/web/editor-document-mode.test.ts
  - scripts/verify-s04-editor-smoke.mjs
key_decisions:
  - Reconcile document-mode payload refreshes by semantic structure and targeted DOM patching instead of rebuilding the block tree on every ready payload.
patterns_established:
  - Keep the active textarea local to the canvas and drive save/refetch reconciliation through a small editor engine that tracks selected block, active draft, local text overrides, and bridge save lifecycle separately from the outer shell.
observability_surfaces:
  - `#editor-canvas[data-physics-mode]`, `#editor-selected-block[data-selected-block-id]`, `#editor-drag-affordance-status[data-drag-affordances]`, `#editor-active-textarea`, `#editor-save-status[data-save-state]`, `#bridge-last-signal`, `tests/web/editor-document-mode.test.ts`, and `scripts/verify-s04-editor-smoke.mjs --mode document`
duration: 2h 37m
verification_result: passed
completed_at: 2026-03-14T01:10:00-07:00
blocker_discovered: false
---

# T02: Ship document-mode inline editing on a DOM-first canvas surface

**Shipped the document-mode canvas editor: semantic-flow rendering now supports click-to-edit textarea updates that persist through the bridge without destroying the active edit session on save-triggered refetches.**

## What Happened

I replaced the S03 preview-only shell with a stable app shell plus a document-mode editor canvas mounted into it. `web/src/editor/engine.ts` now owns the small editor state model for T02: selected block identity, active edit session, draft text/dirty tracking, local text overrides during reconciliation, debounced commits, and mirrored bridge save lifecycle via the existing status store. That let the outer app keep `/__sfrb/bootstrap` as canonical while the canvas preserved local editing continuity.

`web/src/editor/Canvas.tsx` renders document workspaces strictly from semantic section/block order, not `layout.frames`, and exposes explicit document-mode observability hooks. Blocks are editable via a native textarea surface that commits on debounce, blur, or Enter. Drag affordances are surfaced as explicitly absent in document mode, and no frame-handle UI is rendered.

The most important runtime fix was reconciliation: the first cut still rebuilt the block tree on each ready-payload refresh, which destroyed the textarea when a save-triggered bridge update arrived. I changed the canvas to reconcile by stable semantic structure and patch existing block DOM instead of replacing it wholesale. That preserved focus/caret across the bridge write → watcher invalidation → bootstrap refetch loop and satisfied the task’s “no blanket `innerHTML` rerender while typing” requirement.

I then replaced the T02 placeholders with real browser-capable verification. `tests/web/editor-document-mode.test.ts` now launches the real built `dist/cli.js open` path, opens the page in Chromium, edits text inline, confirms the active textarea survives save/refetch, verifies disk write-back to `resume.sfrb.json`, and asserts document-mode drag affordances stay absent. `scripts/verify-s04-editor-smoke.mjs` now provides the document-mode smoke path for the same real runtime.

## Verification

Passed:
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-document-mode.test.ts`
- `node scripts/verify-s04-editor-smoke.mjs --mode document`
- `node scripts/verify-s04-editor-smoke.mjs`
- Built-path failure check via a real `node dist/cli.js open --cwd <temp> --port 0 --no-open` run, a physics-invalid POST to `/__sfrb/editor`, and a follow-up `/__sfrb/bootstrap` fetch. Confirmed:
  - mutation response `status: 409`
  - `code: physics_invalid`
  - `name: DocumentPhysicsValidationError`
  - issue path `layout.frames.0`
  - bootstrap remained `200` with the last good canonical document and `layout.frames.length === 0`
  - no stderr noise
- Real browser verification against a live local bridge using the browser tool. Explicit checks passed for:
  - `#editor-canvas[data-physics-mode='document']` visible
  - selected-block identity updating to `summaryBlock`
  - `#editor-drag-affordance-status[data-drag-affordances='absent']`
  - inline textarea edit persistence through `sfrb:bridge-update`
  - final `#editor-save-status[data-save-state='idle']`
  - no browser console errors and no failed network requests
  - on-disk `resume.sfrb.json` text updated while `layout.frames` stayed empty

Expected intermediate slice-status failure (still pending T03):
- `npm test -- --run tests/web/editor-design-mode.test.ts` → fails with the explicit T03 placeholder message

## Diagnostics

Future agents can inspect the shipped document-mode editor by:
- opening a document-physics workspace and checking `#editor-selected-block[data-selected-block-id]`
- observing `#editor-save-status[data-save-state]` and `#editor-save-error`
- checking `#editor-drag-affordance-status[data-drag-affordances='absent']` to confirm the document-mode affordance split
- inspecting `#bridge-last-signal` after an inline edit to confirm watcher-driven refetch reconciliation
- using `#editor-active-textarea` during an active edit to verify focus/caret preservation
- running `tests/web/editor-document-mode.test.ts`
- running `node scripts/verify-s04-editor-smoke.mjs --mode document`

## Deviations

- I introduced a new `web/src/editor/Canvas.tsx` file plus a dedicated `web/src/editor/engine.ts` state layer rather than keeping all T02 behavior inside `web/src/App.tsx`. This is still within the task plan’s expected output and was necessary to avoid destructive shell-wide rerenders during active edits.
- The smoke script now defaults to the document-mode path and supports `--mode document`; design-mode smoke remains for T03 rather than being prematurely stubbed into this script.

## Known Issues

- Design-mode rendering, frame selection, and frame dragging are still intentionally unimplemented; `tests/web/editor-design-mode.test.ts` remains the explicit T03 placeholder until that work lands.
- The current document-mode editor is optimized for stable semantic structure during active edits. If a future external mutation changes the section/block structure mid-edit, T03/S05 may need a richer reconciliation policy than the current structure-key patching.

## Files Created/Modified

- `web/src/App.tsx` — replaced the preview-only full rerender shell with a stable app shell that mounts the editor canvas, updates diagnostics imperatively, and preserves existing bridge/save observability.
- `web/src/editor/Canvas.tsx` — added the DOM-first document-mode canvas surface, semantic block rendering, inline textarea editing, and document-mode affordance diagnostics.
- `web/src/editor/engine.ts` — added the shared editor state/commit layer for selection, draft tracking, debounced commits, local overrides, and save lifecycle mirroring.
- `tests/web/editor-document-mode.test.ts` — replaced the T02 placeholder with real Chromium-backed coverage of inline editing, refetch-safe textarea persistence, drag-affordance absence, and JSON write-back.
- `scripts/verify-s04-editor-smoke.mjs` — replaced the pending placeholder with a real document-mode smoke path against the built CLI-opened bridge runtime.
- `.gsd/DECISIONS.md` — recorded the keyed canvas reconciliation decision for downstream T03/S05 work.
- `.gsd/milestones/M001/slices/S04/S04-PLAN.md` — marked T02 complete.
- `.gsd/STATE.md` — advanced slice state to T03.
