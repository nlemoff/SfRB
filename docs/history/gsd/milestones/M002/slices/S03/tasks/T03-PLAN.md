---
estimated_steps: 5
estimated_files: 6
---

# T03: Build the browser tile editor for split, group, lock, and locked dragging

**Slice:** S03 — Tile Engine & Group Locking
**Milestone:** M002

## Description

Turn the canonical tile model into an actual editing surface. This task should extend the browser editor engine and canvas so users can split visible tiles, select/group them, toggle lock state, and drag locked compositions through calm, explicit UI that commits canonical actions instead of whole-document writes.

Relevant skills to load before implementation: `frontend-design`, `test`.

## Steps

1. Expand the editor engine with group-aware selection, local multi-select state, and drag bookkeeping while keeping session-only gesture details out of persisted document state.
2. Update `Canvas.tsx` rendering and its structure-key inputs so split/group/lock changes reliably rerender when canonical bootstrap state changes.
3. Add restrained tile affordances for splitting a multi-line block, grouping the current selection, showing lock state, and dragging a locked group as one composition without turning the UI into a noisy fragment board.
4. Route committed tile operations through shared bridge-client action helpers and preserve existing design-mode editing behavior where tile-specific interactions are not in play.
5. Add browser coverage that proves a user can split tiles, group/lock them, drag the locked group, and persist through canonical action payloads rather than whole-document posts.

## Must-Haves

- [ ] Split/group/lock controls are explicit and visually calm enough for the non-technical primary user.
- [ ] The canvas stays in sync with canonical refetches after tile actions; group membership or lock indicators do not go stale due to missing structure-key inputs.
- [ ] Locked-group dragging persists as one meaningful canonical action while ordinary design-mode editing still works.

## Verification

- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-design-mode.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-tile-mode.test.ts`

## Observability Impact

- Signals added/changed: browser selection/group state, visible lock indicators, tile action submission path, and post-save UI reconciliation for grouped tiles.
- How a future agent inspects this: run the browser tests, inspect stable tile/group testids/selectors, or watch `/__sfrb/bootstrap` state after a UI action.
- Failure state exposed: stale group visuals, incorrect drag payload shape, or split/group controls that stop dispatching canonical actions become localizable in browser test output.

## Inputs

- `web/src/editor/engine.ts` and `web/src/editor/Canvas.tsx` — current design-mode selection/drag/edit seams the tile UX must extend.
- `web/src/bridge-client.ts` — canonical action submission helpers from T02.
- `T01 output` — persisted group/lock semantics that browser UI must reflect.
- `T02 output` — bridge/bootstrap round-trip behavior the browser must rely on.

## Expected Output

- `web/src/editor/engine.ts` — group-aware tile interaction state and commit logic.
- `web/src/editor/Canvas.tsx` and `web/src/App.tsx` — user-facing tile controls, lock indicators, and rerender-safe group visuals.
- `tests/web/editor-tile-mode.test.ts` — executable browser proof for split/group/lock/drag behavior.
- `tests/web/editor-design-mode.test.ts` — regression coverage showing existing design-mode editing still works with the new tile layer.