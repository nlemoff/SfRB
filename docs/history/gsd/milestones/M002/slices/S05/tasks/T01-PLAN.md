---
estimated_steps: 4
estimated_files: 5
---

# T01: Lock the freeform element scope and canonical move diagnostics

**Slice:** S05 — Freeform Element Editor
**Milestone:** M002

## Description

Start at the shared truth boundary. This task should formalize the first shipped freeform element set and the move/blocked-state semantics so the rest of S05 can build on one honest canonical model instead of drifting into browser-only freeform behavior or accidental schema expansion.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect the current S02/S03 action contract and frame/group model to confirm which existing positioned objects are already canonically movable and which behaviors are still tile-gated.
2. Keep S05 scoped to existing persisted objects—block-backed frames, bullet-backed frames, and split-line fragments—and avoid introducing a new generic `layout.elements` schema for decorative primitives in this slice.
3. Extend `src/editor/actions.ts` and `web/src/bridge-client.ts` only as needed to expose freeform-facing diagnostics or guardrails for individual frame movement, especially when a frame belongs to a locked group.
4. Add document and bridge tests proving valid single-element geometry commits still work canonically and invalid or blocked freeform moves fail with actionable diagnostics and no write.

## Must-Haves

- [ ] The task preserves one canonical persistence model for freeform movement rather than creating a browser-only element layer.
- [ ] The first shipped freeform element set is explicit in code/tests and does not imply standalone divider/line primitives already exist canonically.
- [ ] Locked-group member moves and malformed frame-box payloads produce inspectable no-write outcomes instead of silent drift.

## Verification

- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/editor-actions.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`

## Observability Impact

- Signals added/changed: freeform-relevant action diagnostics, blocked-move reasons, and canonical frame/group target ids at the action boundary.
- How a future agent inspects this: read `src/editor/actions.ts` and `web/src/bridge-client.ts`, or run the document/bridge tests.
- Failure state exposed: unsupported frame targets, locked-group member drags, and malformed move payloads become localizable before the browser surface is involved.

## Inputs

- `src/editor/actions.ts` — existing shared parser/apply contract for frame and group movement.
- `web/src/bridge-client.ts` — browser mirror of the canonical action union.
- `web/src/editor/engine.ts` — current tile-only gating that will later consume the clarified diagnostics.
- `S05-RESEARCH.md` and decision D035 — scope guidance to ship Freeform over existing persisted objects and defer decorative primitives.

## Expected Output

- `src/editor/actions.ts` — clarified freeform-compatible movement/diagnostic behavior at the shared action boundary.
- `web/src/bridge-client.ts` — mirrored action typing/helpers for any new diagnostics shape.
- `tests/document/editor-actions.test.ts` and `tests/bridge/bridge-editor-contract.test.ts` — proof that valid moves persist canonically and blocked/invalid moves are no-write.