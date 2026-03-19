---
id: T03
parent: S05
milestone: M002
provides:
  - Freeform can now select, preview-drag, and persist supported canonical frames through `set_frame_box`, while locked-group member drags stay blocked and inspectable.
key_files:
  - web/src/editor/engine.ts
  - web/src/editor/Canvas.tsx
  - tests/web/editor-freeform-mode.test.ts
key_decisions:
  - In Freeform, locked-group member drags remain blocked instead of silently translating the group, and drag initiation waits for pointer movement so click-selection does not masquerade as a failed move.
patterns_established:
  - Keep freeform selection/preview state browser-local in the canvas, but commit real geometry through the shared bridge action path and expose move-state HUD testids for preview/blocked/idle inspection.
observability_surfaces:
  - `web/src/editor/engine.ts` snapshot fields `selectedFrameMoveState` / `selectedFrameMoveDiagnostic`, `web/src/editor/Canvas.tsx` HUD testids `freeform-move-state`, `freeform-selected-element-geometry`, `freeform-placement-note`, `#editor-last-action-kind`, `/__sfrb/bootstrap`, and `resume.sfrb.json`
duration: 1h 28m
verification_result: passed
completed_at: 2026-03-16 22:45 PDT
blocker_discovered: false
---

# T03: Wire freeform selection and drag commits through the editor engine

**Freeform now moves supported canonical page elements through the real editor action loop, shows preview/blocked move state in-browser, and preserves locked-group no-write behavior.**

## What Happened

I removed the remaining tile-only drag gate in the editor engine for individual frame moves, but kept the S03 invariants intact. `web/src/editor/engine.ts` now exposes freeform-aware move diagnostics in its snapshot, allows freeform frame drags to preview and commit through canonical `set_frame_box`, and records an explicit blocked-member state when a selected element belongs to a locked group.

In `web/src/editor/Canvas.tsx`, I wired the Freeform surface to start real element drags on the frame itself, added a small pointer-movement threshold so ordinary click-selection stays calm, and surfaced stable HUD observability for move lifecycle state (`idle` / `preview` / `blocked` / `saving`) plus live geometry. Locked-group member drags now remain visibly blocked in Freeform instead of silently mutating group state.

I expanded `tests/web/editor-freeform-mode.test.ts` to prove both sides of the contract: a successful freeform drag writes a canonical `set_frame_box` action, updates `Last action`, round-trips through `/__sfrb/bootstrap`, and persists to `resume.sfrb.json`; a blocked locked-member drag leaves geometry and mutation request count unchanged while exposing blocked HUD state. Tile regression coverage remained green in `tests/web/editor-tile-mode.test.ts`.

## Verification

Passed task verification:

- `npm test -- --run tests/web/editor-freeform-mode.test.ts`
- `npm test -- --run tests/web/editor-tile-mode.test.ts`

Passed additional slice checks from this worktree:

- `npm test -- --run tests/document/editor-actions.test.ts`
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run tests/web/editor-freeform-mode.test.ts`
- `npm test -- --run tests/web/editor-tile-mode.test.ts`

Partial slice-matrix note:

- `node scripts/verify-s05-freeform-smoke.mjs` could not run because `scripts/verify-s05-freeform-smoke.mjs` does not exist yet in this worktree; that shipped-runtime verifier is the planned deliverable for T04, not a regression introduced by T03.

Behavior confirmed by browser tests:

- Freeform drag preview updates HUD move state to `preview`
- Freeform commit writes `action.kind === 'set_frame_box'` to `/__sfrb/editor`
- `#editor-last-action-kind` becomes `set_frame_box`
- `/__sfrb/bootstrap` reflects the new box
- `resume.sfrb.json` reflects the new box
- Locked-group member drag attempts keep HUD state blocked and produce no additional editor mutation request

## Diagnostics

Future agents can inspect this work through:

- `web/src/editor/engine.ts` → `selectedFrameMoveState`, `selectedFrameMoveDiagnostic`, freeform-capable `beginFrameDrag()`, `previewDrag()`, and `commitDrag()`
- `web/src/editor/Canvas.tsx` → `freeform-move-state`, `freeform-selected-element-geometry`, `freeform-placement-note`, direct freeform frame pointer wiring, and blocked-member styling
- `tests/web/editor-freeform-mode.test.ts` → canonical freeform move persistence plus blocked/no-write browser proof
- `#editor-last-action-kind` in the app sidebar
- `/__sfrb/bootstrap` and on-disk `resume.sfrb.json` for persisted geometry confirmation

## Deviations

None.

## Known Issues

- The slice verification command in the plan uses absolute worktree paths, but Vitest discovery excludes `.gsd/**`; from this worktree the tests must be run with project-relative filters such as `tests/web/editor-freeform-mode.test.ts`.
- `scripts/verify-s05-freeform-smoke.mjs` is still missing and remains for T04.

## Files Created/Modified

- `web/src/editor/engine.ts` — enabled freeform frame drag preview/commit through canonical actions and exposed blocked/preview diagnostics in the editor snapshot.
- `web/src/editor/Canvas.tsx` — wired direct freeform dragging, movement-threshold initiation, HUD move-state observability, and blocked-member visuals.
- `tests/web/editor-freeform-mode.test.ts` — added browser proof for freeform persistence to `/__sfrb/editor`, `/__sfrb/bootstrap`, and disk, plus blocked no-write coverage.
- `.gsd/KNOWLEDGE.md` — recorded the freeform drag-threshold rule so future agents do not regress click-selection into blocked drag state.
- `.gsd/milestones/M002/slices/S05/S05-PLAN.md` — marked T03 complete.
- `.gsd/STATE.md` — advanced the next action to T04.
