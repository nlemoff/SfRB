---
id: S04
parent: M001
milestone: M001
provides:
  - A mode-aware DOM-first editor over the canonical bridge, with validated browser writes, document-mode inline editing, design-mode frame dragging, and built-path proof across both physics modes.
requires:
  - slice: S03
    provides: The canonical `/__sfrb/bootstrap` + bridge-event runtime path that S04 reuses for refetch-based reconciliation and browser startup.
affects:
  - S05
key_files:
  - src/bridge/server.mjs
  - web/src/bridge-client.ts
  - web/src/App.tsx
  - web/src/editor/Canvas.tsx
  - web/src/editor/engine.ts
  - tests/utils/bridge-browser.ts
  - tests/bridge/bridge-editor-contract.test.ts
  - tests/web/editor-document-mode.test.ts
  - tests/web/editor-design-mode.test.ts
  - scripts/verify-s04-editor-smoke.mjs
  - .gsd/milestones/M001/M001-ROADMAP.md
key_decisions:
  - Keep `/__sfrb/bootstrap` as the only canonical browser inspection surface and use `/__sfrb/editor` as the validated write boundary.
  - Reconcile document-mode edits by semantic structure and targeted DOM patching instead of destructive full rerenders.
  - In design physics, use a dedicated drag handle for movement and double-click inside the frame for inline text editing.
patterns_established:
  - Browser save lifecycle mirrors mutation responses, while canonical document state always comes back through bootstrap refetches.
  - One editor engine composes canonical payload + local text/frame overrides for both document and design physics.
  - Built-path browser verification uses the real `dist/cli.js open` runtime against temp workspaces instead of mocked bridge internals.
observability_surfaces:
  - `/__sfrb/bootstrap`
  - `/__sfrb/editor`
  - `#editor-save-status[data-save-state]`
  - `#editor-save-error`
  - `#editor-selected-block[data-selected-block-id]`
  - `#editor-selected-frame[data-selected-frame-id]`
  - `#editor-selected-frame-box[data-frame-box]`
  - `#editor-drag-affordance-status[data-drag-affordances]`
  - `#bridge-last-signal`
  - `tests/bridge/bridge-editor-contract.test.ts`
  - `tests/web/editor-document-mode.test.ts`
  - `tests/web/editor-design-mode.test.ts`
  - `scripts/verify-s04-editor-smoke.mjs`
drill_down_paths:
  - .gsd/milestones/M001/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T03-SUMMARY.md
duration: 7h 54m
verification_result: passed
completed_at: 2026-03-14 02:22 PDT
---

# S04: Canvas Editor Foundation

**Shipped a DOM-first browser editor that edits the canonical local resume model in both document and design physics, with validated bridge writes, stable observability, and built-path proof through the real `dist/cli.js open` runtime.**

## What Happened

S04 closed the write side of the local editor loop.

The first task widened the bridge/browser contract and added the validated mutation boundary. The browser can now fetch full page and frame geometry, and browser-originated document changes go through `/__sfrb/editor`, where schema validation and workspace physics validation both run before `resume.sfrb.json` is updated. Failures stay path-aware, bootstrap remains canonical, and the browser save surface mirrors idle/saving/error without inventing a second client-side source of truth.

The second task replaced the read-only S03 shell with a real document-mode editor mounted into the browser shell. The editor engine tracks selection, active draft state, local text overrides, debounced commits, and save/refetch lifecycle separately from the outer app shell. The document-mode canvas renders semantic flow order rather than frame geometry, uses a native textarea for inline editing, preserves focus through save-triggered refetches, and exposes stable diagnostics that make drag affordances explicitly absent in document mode.

The third task layered design physics onto that same engine instead of adding a second path. The design canvas renders canonical pages and frames from `layout.pages` / `layout.frames`, exposes frame selection and selected box diagnostics, persists drag updates through the same validated bridge route, and keeps linked text editable inside the dragged frame. The interaction split changed deliberately: drag begins from a dedicated handle, while double-click inside the frame enters text editing, which avoids drag-vs-edit conflicts.

By the end of the slice, the real built `dist/cli.js open` path proved both document-mode inline editing and design-mode drag persistence, plus the invalid-mutation rejection path that leaves the last good canonical bootstrap state intact.

## Verification

Passed:
- `npm run build`
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-document-mode.test.ts`
- `npm test -- --run tests/web/editor-design-mode.test.ts`
- `node scripts/verify-s04-editor-smoke.mjs`
- Built-path invalid-mutation check via `node dist/cli.js open --cwd <temp-workspace> --port 0 --no-open`
  - confirmed `/__sfrb/editor` returns `409 physics_invalid`
  - confirmed the error payload stays path-aware
  - confirmed `/__sfrb/bootstrap` and `resume.sfrb.json` keep the last good canonical state

## Requirements Advanced

- R001 — The canonical local authoring loop now supports real browser-originated text edits and design-frame geometry edits through the shipped bridge path; S05 still has to prove the consultant workflow on top of that loop.
- R006 — S04 established the observable editor surface and validated mutation boundary S05 will use for overflow detection and ghost-preview proposals.

## Requirements Validated

- R004 — The editor now proves both document-mode inline editing and design-mode frame dragging/link-preserving text editing, with persistence back to `resume.sfrb.json` through validated writes.

## New Requirements Surfaced

- None.

## Requirements Invalidated or Re-scoped

- None.

## Deviations

None.

## Known Limitations

- The AI layout consultant, overflow detection, ghost previews, and accept/reject workflow are still not implemented; that remains S05 scope.
- The current reconciliation strategy is optimized for stable section/block structure during active edits. If future external mutations reorder semantic structure mid-edit, the engine may need a richer merge policy.

## Follow-ups

- S05 should build directly on the existing `/__sfrb/bootstrap` + `/__sfrb/editor` contract instead of adding another browser state path.
- If larger resumes expose performance or reconciliation edge cases, instrument the editor engine around structure-changing external mutations before adding consultant-driven transforms.

## Files Created/Modified

- `src/bridge/server.mjs` — added the validated `/__sfrb/editor` mutation route and richer bootstrap/editor diagnostics.
- `web/src/bridge-client.ts` — widened the canonical payload types and added mutation/save-status helpers.
- `web/src/App.tsx` — mounted the real editor shell, preserved diagnostics, and rendered canonical ready/error state around the editor.
- `web/src/editor/Canvas.tsx` — added the shared DOM-first document/design surface, inline editing, drag handles, and selection diagnostics.
- `web/src/editor/engine.ts` — added the mode-aware editor engine for selection, drafts, local overrides, debounced commits, and frame-box persistence.
- `tests/utils/bridge-browser.ts` — added the shared built-runtime helpers for editor/bridge verification.
- `tests/bridge/bridge-editor-contract.test.ts` — proved valid writes, rejected invalid writes, and canonical bootstrap refetch behavior.
- `tests/web/editor-document-mode.test.ts` — proved document-mode inline editing, save/refetch-safe textarea persistence, and absent drag affordances.
- `tests/web/editor-design-mode.test.ts` — proved canonical frame rendering, drag persistence, and linked text editing in design mode.
- `scripts/verify-s04-editor-smoke.mjs` — proved both physics modes end-to-end against the built CLI-opened bridge runtime.
- `.gsd/milestones/M001/M001-ROADMAP.md` — marked S04 complete.
- `.gsd/PROJECT.md` — refreshed current project state after recovering and validating S04.
- `.gsd/REQUIREMENTS.md` — created the explicit capability contract and mapped S04 proof into it.
- `.gsd/STATE.md` — advanced handoff state to S05 planning.

## Forward Intelligence

### What the next slice should know
- The browser contract is now stable: bootstrap remains canonical, bridge events stay invalidation-only, and browser writes go through `/__sfrb/editor`.
- The editor already exposes reliable DOM diagnostics for selected block/frame identity, affordance mode, save lifecycle, and last bridge signal. Reuse those surfaces in S05 rather than inventing new ones.
- The fastest trustworthy proof for any S05 mutation is still the real `dist/cli.js open` runtime against a temp workspace, not an isolated unit test alone.

### What's fragile
- `web/src/editor/engine.ts` reconciliation around active edits — it assumes semantic structure is stable while local editing is in progress.
- `src/bridge/server.mjs` route ordering — `/__sfrb/bootstrap` and `/__sfrb/editor` need to stay ahead of any HTML fallback behavior.

### Authoritative diagnostics
- `tests/bridge/bridge-editor-contract.test.ts` — highest-signal proof for accepted vs rejected browser writes and canonical bootstrap integrity.
- `tests/web/editor-document-mode.test.ts` / `tests/web/editor-design-mode.test.ts` — best proof that the affordance split and persistence behavior still match the shipped editor.
- `node scripts/verify-s04-editor-smoke.mjs` — quickest end-to-end check of both physics modes through the built CLI-opened runtime.

### What assumptions changed
- “The browser editor can get away with a preview-only payload” — in practice, S04 needed full page/frame geometry plus a validated mutation route before the editor could be real.
- “Design-mode save proof should watch a transient `saving` state” — in practice, durable signals (`idle` + bridge update + canonical payload change) are more reliable and less flaky.
