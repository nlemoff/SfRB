---
id: T01
parent: S05
milestone: M002
provides:
  - Canonical freeform frame-move scope and blocked-move diagnostics at the shared action boundary
key_files:
  - src/editor/actions.ts
  - web/src/bridge-client.ts
  - tests/document/editor-actions.test.ts
  - tests/bridge/bridge-editor-contract.test.ts
key_decisions:
  - D036: Reject individual set_frame_box moves for locked-group members and require translate_frame_group.
patterns_established:
  - Use inspectFrameMoveTarget/inspectBridgeFrameMoveTarget to classify canonical freeform frame targets and surface frameId/groupId diagnostics before browser-only behavior is added.
observability_surfaces:
  - src/editor/actions.ts inspectFrameMoveTarget, web/src/bridge-client.ts inspectBridgeFrameMoveTarget, bridge action_invalid issues for frameId/groupId/box.width
duration: 1h
verification_result: passed
completed_at: 2026-03-16 20:41 PDT
blocker_discovered: false
---

# T01: Lock the freeform element scope and canonical move diagnostics

**Added a canonical frame-move inspection helper, blocked locked-group member `set_frame_box` writes, and covered valid/invalid freeform move behavior in document and bridge tests.**

## What Happened

I kept S05 scoped to the existing persisted frame model and did not introduce any new `layout.elements` layer or decorative primitive schema. In `src/editor/actions.ts` I added a shared `inspectFrameMoveTarget()` helper that classifies the first shipped freeform element set as `block_frame`, `bullet_frame`, or `split_line_fragment`, and reports whether the target frame is blocked by locked group membership.

I then tightened `set_frame_box` so individual frame moves are rejected with `frame_move_blocked` when the target frame belongs to a locked group. The failure stays no-write and exposes actionable `frameId` and `groupId` issues telling callers to use `translate_frame_group` instead.

In `web/src/bridge-client.ts` I mirrored the same freeform scope and target-inspection shape with `BRIDGE_FREEFORM_ELEMENT_SCOPE` and `inspectBridgeFrameMoveTarget()` so later browser work in S05 can preflight the same canonical rules before trying a mutation.

Finally, I extended the contract tests to prove:
- canonical single-frame geometry commits still persist through `set_frame_box`
- the first shipped freeform scope is explicit in code/tests
- locked-group member moves fail with inspectable diagnostics and no write
- malformed frame-box payloads fail validation and leave bootstrap/disk unchanged

## Verification

Passed:
- `npm test -- --reporter=verbose tests/document/editor-actions.test.ts`
- `npm test -- --reporter=verbose tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --reporter=verbose tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --reporter=verbose tests/web/editor-tile-mode.test.ts`

Observed expected partial slice state:
- `tests/web/editor-freeform-mode.test.ts` does not exist yet in T01
- `node scripts/verify-s05-freeform-smoke.mjs` fails because the smoke script is scheduled for T04 and is not present yet

Failure-path behavior confirmed by tests:
- blocked locked-group member `set_frame_box` returns `action_invalid` with `frameId`/`groupId` diagnostics and no disk write
- malformed `set_frame_box.box.width` returns `EditorActionParseError` diagnostics and no disk write

## Diagnostics

Future agents can inspect:
- `src/editor/actions.ts` → `inspectFrameMoveTarget()` and `frame_move_blocked`
- `web/src/bridge-client.ts` → `BRIDGE_FREEFORM_ELEMENT_SCOPE` and `inspectBridgeFrameMoveTarget()`
- `tests/document/editor-actions.test.ts` → scope classification plus blocked/invalid frame-move coverage
- `tests/bridge/bridge-editor-contract.test.ts` → persisted single-frame move success and no-write bridge failure paths

Bridge-visible failure diagnostics now include stable issue paths such as `frameId`, `groupId`, and `box.width`.

## Deviations

The plan’s literal `npm test -- --run <absolute path>` form mis-resolved in this worktree/harness, so I verified the same targets with `npm test -- --reporter=verbose <relative-path>` instead.

## Known Issues

`tests/web/editor-freeform-mode.test.ts` and `scripts/verify-s05-freeform-smoke.mjs` are still absent because they belong to later S05 tasks.

## Files Created/Modified

- `src/editor/actions.ts` — added canonical freeform element classification, frame-move inspection, and locked-group member write blocking.
- `web/src/bridge-client.ts` — mirrored the canonical freeform scope and browser-side frame target inspection helper.
- `tests/document/editor-actions.test.ts` — added scope classification, locked-group member block, and malformed frame-box validation coverage.
- `tests/bridge/bridge-editor-contract.test.ts` — added single-frame persistence coverage plus blocked/malformed no-write bridge assertions.
- `.gsd/DECISIONS.md` — recorded D036 for locked-group member movement behavior.
