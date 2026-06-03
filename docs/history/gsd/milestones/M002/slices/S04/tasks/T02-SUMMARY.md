---
id: T02
parent: S04
milestone: M002
provides:
  - Explicit browser-local Text/Tile/Freeform lens selection with a calm writing-first text surface that works in both document and design workspaces without changing canonical physics
key_files:
  - web/src/App.tsx
  - web/src/editor/Canvas.tsx
  - web/src/editor/engine.ts
  - tests/web/editor-first-run-guidance.test.ts
  - tests/web/editor-text-mode.test.ts
key_decisions:
  - Kept active lens state browser-local and distinct from workspace.physics while hiding secondary tile/diagnostics chrome in Text mode but preserving hidden stable testids for agent inspection
patterns_established:
  - Default the shell lens from workspace physics on first ready payload, then treat later lens changes as browser-local UI state threaded through the editor engine snapshot so rendering and chrome can react without mutating canonical document state
  - In Text mode, render semantic sections/blocks even for design workspaces and suppress tile drag/group affordances instead of inventing a third persisted workspace mode
observability_surfaces:
  - #editing-lenses[data-active-lens], #shell-active-lens, #editor-canvas[data-active-lens], [data-testid="editor-text-surface"], #editor-save-status[data-active-lens], hidden-but-stable diagnostics/testids, tests/web/editor-first-run-guidance.test.ts, tests/web/editor-text-mode.test.ts
duration: 2h
verification_result: passed
completed_at: 2026-03-16 19:42:54 PDT
blocker_discovered: false
---

# T02: Introduce an explicit text lens and calm writing-surface shell

**Added a real Text lens in the shell, routed the canvas through lens-aware rendering, and proved that design workspaces can enter a calm writing surface with tile/drag chrome suppressed.**

## What Happened

I converted the shell lens cards in `web/src/App.tsx` into real mode controls with stable lens state (`#editing-lenses[data-active-lens]`, `#shell-active-lens`) and made the active lens browser-local instead of coupling it to canonical `workspace.physics`. The app now defaults to Text for document workspaces and Tile for design workspaces on first ready payload, then preserves subsequent user lens changes locally.

I extended `web/src/editor/engine.ts` with explicit `activeLens` state so the engine snapshot distinguishes lens from physics and can suppress tile-only selection/drag/group behavior outside Tile mode. That let `web/src/editor/Canvas.tsx` render three clear surfaces: a calm writing-first text surface over semantic sections/blocks, the existing design/tile frame surface, and a lightweight Freeform preview state. In Text mode, design workspaces render semantic flow instead of frames, while tile toolbar/drag affordances/consultant chrome are hidden from the visible UI.

I also tuned the surrounding shell feedback to feel less technical in Text mode: writing-oriented save copy (`All changes saved`, `Saving latest wording…`), warmer idle styling, and hidden secondary diagnostics while keeping those hidden DOM nodes/testids intact for future automation and debugging. Finally, I updated browser coverage so guidance tests prove real lens switching and a new text-mode suite proves design-workspace Text mode availability, hidden tile chrome, and canonical text persistence.

## Verification

Passed targeted task verification:

- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run tests/web/editor-text-mode.test.ts`

Passed slice-level verification checks run during this task:

- `npm test -- --run ./tests/document/editor-actions.test.ts`
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run tests/web/editor-text-mode.test.ts`
- `npm test -- --run tests/web/editor-design-mode.test.ts`
- `node scripts/verify-s04-editor-smoke.mjs`

Real browser verification against a live `dist/cli.js open` bridge also confirmed:

- active lens switched to `text` while `#physics-mode` remained `design`
- `[data-testid="editor-text-surface"]` rendered in a design workspace
- tile toolbar hidden, drag affordances reported `absent`, and frame handles disappeared in Text mode
- writing status showed `All changes saved`

## Diagnostics

Future agents can inspect this work through:

- `web/src/App.tsx` for shell-local lens selection, chrome hiding, and writing-status copy
- `web/src/editor/engine.ts` for `activeLens` state and tile-behavior suppression outside Tile mode
- `web/src/editor/Canvas.tsx` for lens-aware render paths and calm text-surface chrome
- `#editing-lenses[data-active-lens]`
- `#shell-active-lens`
- `#editor-canvas[data-active-lens]`
- `[data-testid="editor-text-surface"]`
- `#editor-drag-affordance-status[data-drag-affordances]`
- hidden-but-stable `#bridge-status`, `#diagnostics-panel`, and `#consultant-panel` state while Text mode is active
- `tests/web/editor-first-run-guidance.test.ts`
- `tests/web/editor-text-mode.test.ts`

## Deviations

None.

## Known Issues

- Vitest filters absolute worktree paths under `.gsd/worktrees/...` as excluded input in this repo, so slice verification had to be run with worktree-relative `tests/...` paths instead of the absolute task-plan command strings.
- `scripts/verify-s04-editor-smoke.mjs` still verifies the pre-T03/T04 editing flow; it passed here, but later tasks still need to extend it for explicit text-lens structure-edit coverage and invalid text-action failure proof.

## Files Created/Modified

- `web/src/App.tsx` — replaced static lens cards with real shell controls, added active-lens observability, and hid secondary chrome in Text mode while preserving diagnostics surfaces for inspection
- `web/src/editor/Canvas.tsx` — added lens-aware rendering, calm writing-surface text mode, freeform preview rendering, and tile-chrome suppression outside Tile mode
- `web/src/editor/engine.ts` — added browser-local `activeLens` state to the editor snapshot and gated tile-only selection/drag/group behavior on that lens
- `tests/web/editor-first-run-guidance.test.ts` — now asserts explicit lens switching, default lens selection, and design-workspace text-lens availability during starter replacement flows
- `tests/web/editor-text-mode.test.ts` — new browser proof for calm Text mode in design/document workspaces, including hidden drag/tile chrome and canonical text persistence
- `.gsd/milestones/M002/slices/S04/S04-PLAN.md` — marked T02 complete
- `.gsd/DECISIONS.md` — recorded the browser-local lens vs canonical physics decision as D034
