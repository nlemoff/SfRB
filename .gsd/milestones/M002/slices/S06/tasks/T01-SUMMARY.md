---
id: T01
parent: S06
milestone: M002
provides:
  - Canonical freeform-exit reconciliation action/result metadata with no-write diagnostics at the editor and bridge boundary
key_files:
  - src/editor/actions.ts
  - web/src/bridge-client.ts
  - src/bridge/server.mjs
  - tests/document/editor-actions.test.ts
  - tests/bridge/bridge-editor-contract.test.ts
key_decisions:
  - Represent Freeform exit reconciliation as an explicit canonical action over existing frame-group locking instead of persisting browser-local lens state
patterns_established:
  - Add new canonical editor actions through parse/apply/result metadata in src/editor/actions.ts, then mirror the same action and response shape through the bridge client/server and prove both success and no-write failure paths in document + bridge tests
observability_surfaces:
  - /__sfrb/editor success payload reconciliation metadata
  - /__sfrb/bootstrap
  - resume.sfrb.json frameGroups[].locked
  - tests/document/editor-actions.test.ts
  - tests/bridge/bridge-editor-contract.test.ts
duration: ~1h
verification_result: passed
completed_at: 2026-03-16 23:12 PDT
blocker_discovered: false
---

# T01: Define the canonical reconciliation action and no-write diagnostics

**Added a canonical `reconcile_freeform_exit` action that explicitly locks or unlocks a persisted frame group, returns inspectable reconciliation metadata, and rejects invalid/no-op requests without writing `resume.sfrb.json`.**

## What Happened

I extended `src/editor/actions.ts` with a new `reconcile_freeform_exit` action that accepts a canonical `groupId` plus a policy of `keep_locked` or `rejoin_layout`. The action deliberately does **not** persist the active lens; it only persists the meaningful Freeform-exit outcome by toggling the existing canonical `layout.frameGroups[].locked` state.

To make the contract inspectable for future browser and CLI callers, I added `applyEditorActionWithResult()` and an `EditorActionResult` shape. Non-reconciliation actions still return their `actionKind`, while `reconcile_freeform_exit` additionally returns structured reconciliation metadata: origin, structured target, group id, policy, and final locked state.

For no-write safety, the new action rejects two important failure cases at the shared action boundary:
- missing reconciliation targets (`group_not_found`)
- redundant policy requests (`reconciliation_not_needed`) when the requested locked/unlocked outcome is already true

I then mirrored the new action type and reconciliation result metadata through `web/src/bridge-client.ts` and `src/bridge/server.mjs`, so `/__sfrb/editor` now returns the same canonical metadata the action layer computes.

Finally, I extended the existing document and bridge contract suites to prove:
- successful reconciliation to `rejoin_layout`
- successful reconciliation back to `keep_locked`
- rejected redundant reconciliation with actionable diagnostics
- rejected missing-group reconciliation with actionable diagnostics
- byte-stable bootstrap and disk behavior on no-write failures

## Verification

Task-level checks passed under an explicit worktree root override:

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/document/editor-actions.test.ts` ✅
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-editor-contract.test.ts` ✅
- `npm run build` ✅
- `node scripts/verify-s04-editor-smoke.mjs` ✅

Observed task-specific proof:
- document suite passed 18/18 tests
- bridge contract suite passed 13/13 tests
- `/__sfrb/editor` success responses now include `actionKind: "reconcile_freeform_exit"` plus `reconciliation` metadata when applicable
- invalid reconciliation requests preserved bootstrap state and left `resume.sfrb.json` byte-stable in bridge tests

Slice-level spot checks run during T01:
- `tests/web/editor-first-run-guidance.test.ts` ❌ existing readiness failure: temp workspace document rejected with `layout: Unrecognized key: "frameGroups"`
- `tests/web/editor-freeform-mode.test.ts` ❌ same existing readiness failure
- `tests/web/editor-layout-consultant.test.ts` ❌ same existing readiness failure
- `tests/web/editor-mode-reconciliation.test.ts` ❌ file not present yet in this slice
- `node scripts/verify-s05-freeform-smoke.mjs` ❌ script not present yet in this worktree
- `node scripts/verify-s06-mode-reconciliation-smoke.mjs` ❌ script not present yet in this worktree

## Diagnostics

Future agents can inspect this work through:

- `src/editor/actions.ts` — canonical action schema, result metadata, and `reconciliation_not_needed` diagnostics
- `web/src/bridge-client.ts` — mirrored browser contract and reconciliation response type
- `src/bridge/server.mjs` — `/__sfrb/editor` response shape including `reconciliation`
- `/__sfrb/editor` — success payload includes `actionKind` and `reconciliation`; failure payload includes actionable `issues`
- `/__sfrb/bootstrap` and `resume.sfrb.json` — persisted outcome is visible via `layout.frameGroups[].locked`

## Deviations

- The task plan’s verification commands had to be executed with `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 ...` because this repo’s `vitest.config.ts` excludes `**/.gsd/**`, which otherwise makes worktree-local runs unreliable.

## Known Issues

- Several broader slice web checks currently fail before app readiness because temp workspace documents are being rejected with `layout: Unrecognized key: "frameGroups"`. That failure was observed during T01 slice-level verification sampling but was not introduced by the new reconciliation contract.
- `tests/web/editor-mode-reconciliation.test.ts` and `scripts/verify-s06-mode-reconciliation-smoke.mjs` do not exist yet; they are expected later in S06.
- `scripts/verify-s05-freeform-smoke.mjs` is also not present in this worktree; the current available S05 smoke script naming in the repo does not match the slice plan.

## Files Created/Modified

- `src/editor/actions.ts` — added the canonical `reconcile_freeform_exit` action, result metadata, and no-write diagnostics
- `web/src/bridge-client.ts` — mirrored the reconciliation action and bridge success metadata
- `src/bridge/server.mjs` — returned reconciliation metadata from `/__sfrb/editor` writes
- `tests/document/editor-actions.test.ts` — added success and no-write failure coverage for reconciliation behavior
- `tests/bridge/bridge-editor-contract.test.ts` — added bridge-level persistence and no-write stability coverage for reconciliation
- `.gsd/KNOWLEDGE.md` — recorded the worktree-local Vitest root override gotcha
