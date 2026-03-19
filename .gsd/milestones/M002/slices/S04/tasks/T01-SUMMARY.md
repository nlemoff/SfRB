---
id: T01
parent: S04
milestone: M002
provides:
  - Minimal canonical writing-first structure actions for inserting, removing, and reordering blocks/sections through the shared editor boundary
key_files:
  - src/editor/actions.ts
  - web/src/bridge-client.ts
  - tests/document/editor-actions.test.ts
  - tests/bridge/bridge-editor-contract.test.ts
key_decisions:
  - Kept text-structure edits canonical at the shared action boundary and made design-workspace safety come from deterministic frame linkage/order preservation instead of browser-only rewrites
patterns_established:
  - Structure edits update semantic order first, then normalize layout frame order/zIndex from section/block order so design documents stay validation-safe
observability_surfaces:
  - /__sfrb/editor actionKind responses, actionable action_invalid issues, tests/document/editor-actions.test.ts, tests/bridge/bridge-editor-contract.test.ts
duration: 1h
verification_result: passed
completed_at: 2026-03-16 19:22 PDT
blocker_discovered: false
---

# T01: Add canonical text-structure actions for writing-first edits

**Added canonical insert/remove/move block and move section actions, threaded them through the bridge client, and verified successful apply plus no-write failure paths in both document and bridge tests.**

## What Happened

I extended `src/editor/actions.ts` with a minimal writing-first structure action set:

- `insert_block`
- `remove_block`
- `move_block`
- `move_section`

The apply layer now preserves the semantic model and, when frames are present, keeps design-workspace linkage safe by normalizing layout frame ordering and `zIndex` from semantic section/block order after supported structure edits. Insertions near framed blocks require a linked frame payload; frame-free documents reject stray frame payloads. Unsupported removals (for example removing the only block in a section) fail loudly with actionable diagnostics.

I also extended `web/src/bridge-client.ts` so the browser-side contract knows about the new canonical action kinds and has typed submit helpers ready for later text-mode UI work.

On the test side, I added document-level coverage for valid insert/remove/reorder operations, design-safe frame/group behavior, frame-free document insertion, and malformed/unsupported targets. I added bridge coverage proving the new actions persist through `/__sfrb/editor` into `/__sfrb/bootstrap` and `resume.sfrb.json`, plus failure-path proof that invalid structure actions return actionable `action_invalid` issues without mutating bootstrap or disk state.

## Verification

Task-plan verification passed:

- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/editor-actions.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`

Slice-level verification status after T01:

- Passed: `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-first-run-guidance.test.ts`
- Passed: `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-design-mode.test.ts`
- Passed: `node scripts/verify-s04-editor-smoke.mjs`
- Expected not-yet-available: `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-text-mode.test.ts` (file does not exist yet because T02/T03 have not introduced text-mode browser coverage)

## Diagnostics

Future agents can inspect this work through:

- `src/editor/actions.ts` for the canonical schemas, apply logic, and action-specific diagnostics
- `web/src/bridge-client.ts` for the browser-visible contract and typed helpers
- `tests/document/editor-actions.test.ts` for local apply-path and unsupported-target behavior
- `tests/bridge/bridge-editor-contract.test.ts` for bridge persistence and no-write failure proofs
- `/__sfrb/editor` responses, which now expose the new `actionKind` values and actionable `issues` for malformed or unsupported structure edits

## Deviations

None.

## Known Issues

- `tests/web/editor-text-mode.test.ts` is still absent; that browser-level text-lens coverage belongs to T02/T03.

## Files Created/Modified

- `src/editor/actions.ts` — added canonical writing-first structure actions, deterministic semantic/frame reordering helpers, and new actionable application errors
- `web/src/bridge-client.ts` — extended the shared bridge action union and added typed submit helpers for insert/remove/move actions
- `tests/document/editor-actions.test.ts` — added contract/apply coverage for valid structure edits and invalid/unsupported targets
- `tests/bridge/bridge-editor-contract.test.ts` — added end-to-end bridge persistence and no-write failure coverage for the new text-structure actions
- `.gsd/milestones/M002/slices/S04/S04-PLAN.md` — marked T01 complete
