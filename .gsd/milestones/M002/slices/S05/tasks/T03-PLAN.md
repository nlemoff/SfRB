---
estimated_steps: 5
estimated_files: 6
---

# T03: Wire freeform selection and drag commits through the editor engine

**Slice:** S05 — Freeform Element Editor
**Milestone:** M002

## Description

Make the surface real. This task should remove the tile-only behavior gates that currently prevent Freeform from selecting and moving canonical positioned objects, while preserving S03’s group/lock invariants and exposing an inspectable blocked state when a member move is disallowed.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect the current selection, drag preview, pending-action, and commit paths in `web/src/editor/engine.ts` to identify where they are artificially limited to Tile.
2. Extend the engine so Freeform can select supported individual frames, preview movement, and commit geometry changes through the same canonical `set_frame_box` path already used elsewhere.
3. Preserve browser-local selection/drag-preview state as session-local UI, but route meaningful geometry commits through the shared bridge action layer rather than whole-document rewrites.
4. Handle locked-group members intentionally: either block the individual drag with visible state or route through the existing group movement path where appropriate, without bypassing S03 invariants.
5. Add browser coverage proving a freeform move updates `Last action`, `/__sfrb/bootstrap`, and disk-backed geometry while tile-mode tests continue to protect split/group/lock behavior.

## Must-Haves

- [ ] Supported individual page elements can be selected and moved in Freeform through canonical actions.
- [ ] Drag preview and selection state stay browser-local, but persisted geometry changes still round-trip through `/__sfrb/editor` and `resume.sfrb.json`.
- [ ] Locked or invalid freeform moves expose an inspectable blocked state and do not silently mutate group state.

## Verification

- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-freeform-mode.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-tile-mode.test.ts`

## Observability Impact

- Signals added/changed: selected freeform frame id, geometry preview/commit state, last action kind after freeform drags, and blocked-member state for locked groups.
- How a future agent inspects this: run the web tests, inspect `Last action`, or check the freeform snapshot/testids exposed by `web/src/editor/engine.ts` and `web/src/editor/Canvas.tsx`.
- Failure state exposed: tile-only gating, drag preview that never commits, bridge no-op regressions, and group-lock bypass bugs become distinguishable.

## Inputs

- `web/src/editor/engine.ts` — current tile-gated selection/drag logic.
- `web/src/editor/Canvas.tsx` — freeform surface and frame event wiring added in T02.
- `web/src/bridge-client.ts` — canonical action submit helpers for frame movement.
- `tests/web/editor-tile-mode.test.ts` and `tests/utils/bridge-browser.ts` — existing movement/regression patterns to preserve.

## Expected Output

- `web/src/editor/engine.ts` and `web/src/editor/Canvas.tsx` — freeform-capable selection, drag preview, blocked-state, and commit behavior.
- `tests/web/editor-freeform-mode.test.ts` — browser proof for freeform selection, move persistence, and blocked/no-write cases.
- `tests/web/editor-tile-mode.test.ts` — retained regression coverage for tile split/group/lock invariants.