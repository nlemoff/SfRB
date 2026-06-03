---
id: T02
parent: S03
milestone: M002
provides:
  - Template starters now persist canonical assembled frame-group metadata, and the bridge/client path accepts split/group/lock/translate tile actions through the existing one-action mutation route.
key_files:
  - src/document/starters.ts
  - src/bridge/server.mjs
  - web/src/bridge-client.ts
  - tests/document/starter-documents.test.ts
  - tests/bridge/bridge-editor-contract.test.ts
key_decisions:
  - Reused the existing `/__sfrb/editor` mutation boundary for all tile actions and added `actionKind` observability instead of creating a tile-specific persistence API.
patterns_established:
  - Starter group metadata exists only in design physics; document physics remains frame/frameGroup-free and is still validated through the same canonical document boundary.
  - Bridge tile persistence always follows read current document -> parse one canonical action -> apply -> validate for schema + physics -> write to disk.
observability_surfaces:
  - `/__sfrb/bootstrap`
  - `/__sfrb/editor`
  - `resume.sfrb.json`
  - tests/bridge/bridge-editor-contract.test.ts
  - tests/document/starter-documents.test.ts
duration: 1h15m
verification_result: passed
completed_at: 2026-03-16 18:31:25 PDT
blocker_discovered: false
---

# T02: Persist assembled tile groups through starters and the bridge

**Shipped assembled template frame groups plus bridge/client tile-action persistence, with round-trip and no-write proof through the canonical editor route.**

## What Happened

I updated `src/document/starters.ts` so the design-mode template starter now opens with two locked canonical frame groups (`starterHeroGroup` and `starterExperienceGroup`) while blank starters remain intentionally sparse and both starters still stay valid under their respective physics rules.

I widened the shared bridge contract in `web/src/bridge-client.ts` to mirror the full tile action surface introduced in T01: split, create/remove group, lock toggle, and locked-group translation. I also extended the mirrored document typing so browser callers can inspect `layout.frameGroups` and per-block `split` provenance directly from bootstrap payloads.

On the bridge runtime side in `src/bridge/server.mjs`, I kept the existing `/__sfrb/editor` endpoint and one-action-per-request model intact. Tile actions now continue through the same canonical path as legacy actions: read current workspace document, parse a single action, apply it, validate the resulting document against schema and workspace physics, then write to disk. I added `actionKind` to mutation success/failure payloads so future agents can inspect which canonical action succeeded or failed without guessing from free-form messages.

I replaced the starter and bridge integration tests to prove the real behavior: template bootstrap assembly, bridge persistence of split/create-group/lock/translate sequences, bootstrap+disk round-trips, and invalid split/group failures that preserve both bootstrap state and raw `resume.sfrb.json` bytes.

## Verification

Required task verification:
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/starter-documents.test.ts` ✅
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts` ✅

Additional concrete checks run from `/home/nlemo/SfRB/.gsd/worktrees/M002`:
- `npm run build` ✅
- `npm test -- --run tests/document/editor-actions.test.ts` ✅
- `npm test -- --run tests/document/starter-documents.test.ts` ✅
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts` ✅
- `npm test -- --run tests/web/editor-design-mode.test.ts` ✅
- Failure-path behavior confirmed in `tests/bridge/bridge-editor-contract.test.ts` by asserting invalid split/group actions return localized diagnostics and leave both `/__sfrb/bootstrap` and on-disk `resume.sfrb.json` unchanged. ✅

Slice-level verification status after T02:
- `tests/document/editor-actions.test.ts` ✅
- `tests/document/starter-documents.test.ts` ✅
- `tests/bridge/bridge-editor-contract.test.ts` ✅
- `tests/web/editor-design-mode.test.ts` ✅
- `tests/web/editor-tile-mode.test.ts` not runnable yet: file does not exist in this worktree
- `node scripts/verify-s03-tile-engine.mjs` not runnable yet: script does not exist in this worktree

## Diagnostics

Inspect later via:
- `resume.sfrb.json` for persisted `layout.frameGroups` and split provenance.
- `/__sfrb/bootstrap` for canonical starter identity, grouped layout state, and post-save round-trip payloads.
- `/__sfrb/editor` responses for `actionKind`, `code`, `name`, and `issues` on both success/failure paths.
- `tests/document/starter-documents.test.ts` for starter assembly expectations.
- `tests/bridge/bridge-editor-contract.test.ts` for persisted split/group/lock/translate examples and byte-for-byte no-write guards.

## Deviations

None.

## Known Issues

- `tests/web/editor-tile-mode.test.ts` is referenced by the slice plan but is not present yet in this worktree; that broader verification remains for later slice work.
- `scripts/verify-s03-tile-engine.mjs` is referenced by the slice plan but is not present yet in this worktree; built-runtime tile smoke proof remains for T04.

## Files Created/Modified

- `src/document/starters.ts` — added canonical template frame groups for design starters while keeping blank/document starters valid and simple.
- `src/bridge/server.mjs` — preserved the shared mutation route for tile actions and added `actionKind` observability on mutation results.
- `web/src/bridge-client.ts` — mirrored the full tile action contract plus grouped/split document typing and helper submission functions.
- `tests/document/starter-documents.test.ts` — proved starter metadata, blank-starter sparsity, and assembled template frame-group output.
- `tests/bridge/bridge-editor-contract.test.ts` — proved tile action persistence, bootstrap/disk round-trip behavior, and invalid-action no-write failures.
