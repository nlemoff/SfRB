---
id: T03
parent: S04
milestone: M001
provides:
  - Design-mode page/frame rendering, frame dragging persistence, linked inline text editing, and final built-path editor proof across document and design physics.
key_files:
  - web/src/editor/Canvas.tsx
  - web/src/editor/engine.ts
  - web/src/App.tsx
  - tests/web/editor-design-mode.test.ts
  - scripts/verify-s04-editor-smoke.mjs
  - .gsd/DECISIONS.md
key_decisions:
  - In design physics, start frame movement from a dedicated drag handle and reserve double-click inside the frame for inline text editing.
patterns_established:
  - Keep one mode-aware editor engine that composes canonical payload + local text/frame overrides, then persists through the same validated `/__sfrb/editor` route used by document mode.
  - Verify drag persistence through durable signals (`idle` + bridge update + canonical payload change) instead of racing a transient `saving` state.
observability_surfaces:
  - `#editor-selected-frame[data-selected-frame-id]`
  - `#editor-selected-frame-box[data-frame-box]`
  - `#editor-drag-affordance-status[data-drag-affordances]`
  - `#editor-save-status[data-save-state]` and `#editor-save-error`
  - `/__sfrb/bootstrap`, `resume.sfrb.json`, `tests/web/editor-design-mode.test.ts`, and `scripts/verify-s04-editor-smoke.mjs`
duration: 3h 52m
verification_result: passed
completed_at: 2026-03-14 01:23:43 PDT
blocker_discovered: false
---

# T03: Add design-mode frame dragging and prove the real editor path

**Added a shared design-mode canvas that renders canonical pages/frames, persists dragged frame geometry through the validated bridge, keeps linked text editable, and proves the real `dist/cli.js open` path across both physics modes.**

## What Happened

I extended the S04 editor engine from a document-only text editor into a mode-aware canvas engine that tracks both selected blocks and selected frames, composes local text/frame overrides against the canonical bootstrap payload, and persists them through the existing validated bridge mutation route. That kept T03 on the same `/__sfrb/bootstrap` + `/__sfrb/editor` reconciliation contract established in T01/T02 instead of introducing a second design-only data path.

On the DOM side, `web/src/editor/Canvas.tsx` now renders both semantic document flow and fixed-layout design pages from canonical `layout.pages` / `layout.frames`. Design mode uses the real page size and frame box coordinates, preserves z-order, exposes stable diagnostics for selected frame identity and selected frame box coordinates, and renders one explicit drag handle per frame. I split design-mode interactions so a normal click selects the frame, dragging starts only from the handle, and inline text editing stays available via double-click inside the linked frame. That avoided drag-vs-edit pointer conflicts while keeping block↔frame linkage intact.

I updated the app shell copy in `web/src/App.tsx` so the shipped UI accurately describes both physics modes and always mounts the real canvas for ready payloads, including design workspaces.

For proof, I replaced the T03 placeholder browser test with a real Playwright-backed design-mode flow that verifies canonical geometry rendering, frame selection diagnostics, drag persistence to disk, linked text editing, and the design/document affordance split. I also finished `scripts/verify-s04-editor-smoke.mjs` so the built `dist/cli.js open` runtime now proves both document-mode inline editing and design-mode drag persistence. During verification I found one flaky wait that depended on briefly observing `data-save-state="saving"`; I replaced that with durable checks (`idle` + bridge update + payload change), which matches the real bridge lifecycle more reliably.

## Verification

Passed:
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-document-mode.test.ts`
- `npm test -- --run tests/web/editor-design-mode.test.ts`
- `node scripts/verify-s04-editor-smoke.mjs`
- Built-path failure check: launched `node dist/cli.js open --cwd <temp-workspace> --port 0 --no-open`, POSTed a physics-invalid browser mutation, observed `409 physics_invalid` with a path-aware rejection message, and confirmed `/__sfrb/bootstrap` plus `resume.sfrb.json` kept the last good canonical frame-free state.

Also directly exercised the shipped UI with browser tooling against a real local design workspace and explicitly verified:
- design physics renders in the browser shell
- drag affordances are visible in design mode
- frame selection diagnostics update when a frame is clicked

## Diagnostics

Future agents can inspect T03 behavior by:
- opening a design workspace and checking `#editor-selected-frame[data-selected-frame-id]`
- reading `#editor-selected-frame-box[data-frame-box]` after a drag to confirm the local/persisted box coordinates
- comparing `#editor-drag-affordance-status[data-drag-affordances]` between document (`absent`) and design (`present`) workspaces
- watching `#editor-save-status[data-save-state]`, `#editor-save-error`, and `#bridge-last-signal`
- reading `/__sfrb/bootstrap` or `resume.sfrb.json` after a drag/edit to confirm canonical persistence
- running `tests/web/editor-design-mode.test.ts` or `node scripts/verify-s04-editor-smoke.mjs`

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `web/src/editor/Canvas.tsx` — added shared document/design rendering, selected-frame diagnostics, drag handles, frame dragging, and linked frame editing behavior.
- `web/src/editor/engine.ts` — extended the editor engine to track selected frames, local frame-box overrides, and mode-aware commit/reconciliation logic.
- `web/src/App.tsx` — updated the shell copy and mounted the real canvas for design-mode ready payloads instead of the old T03 placeholder clear state.
- `tests/web/editor-design-mode.test.ts` — replaced the placeholder with a real browser-level proof for canonical geometry rendering, drag persistence, and linked text editing.
- `scripts/verify-s04-editor-smoke.mjs` — finished the built-path smoke coverage across both document and design physics modes.
- `.gsd/DECISIONS.md` — recorded the design-mode drag-handle vs double-click-edit interaction split for downstream work.
- `.gsd/milestones/M001/slices/S04/S04-PLAN.md` — marked T03 complete.
- `.gsd/STATE.md` — updated shared execution state after closing S04.
