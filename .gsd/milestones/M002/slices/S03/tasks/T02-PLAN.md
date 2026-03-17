---
estimated_steps: 4
estimated_files: 6
---

# T02: Persist assembled tile groups through starters and the bridge

**Slice:** S03 — Tile Engine & Group Locking
**Milestone:** M002

## Description

Make the canonical tile model real in the product path. This task should thread the new tile actions through the existing bridge mutation route, update starters so the shipped template opens as an assembled composition, and prove bridge/bootstrap/disk round-trip behavior including no-write failures.

Relevant skill to load before implementation: `test`.

## Steps

1. Update the production starter factory so the template resume ships with sensible default frame groups while the blank starter remains simple but valid under the new schema.
2. Extend `/__sfrb/editor` and shared browser bridge helpers to parse and submit the new tile/group actions without adding a tile-specific mutation endpoint.
3. Keep the bridge one-action-per-request contract intact by treating locked-group movement as one canonical `translate_*group*` action and preserving validation-safe persistence.
4. Add starter and bridge integration coverage for split persistence, group creation, lock toggling, locked-group translation, bootstrap round-trip, and invalid-action no-write behavior.

## Must-Haves

- [ ] The shipped template opens with canonical starter group metadata that represents an already assembled resume composition.
- [ ] The bridge persists tile actions by reading current document state, applying one canonical action, validating the result, and then writing to disk.
- [ ] Invalid split/group/lock actions return actionable diagnostics and leave `resume.sfrb.json` unchanged.

## Verification

- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/starter-documents.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`

## Observability Impact

- Signals added/changed: starter group identity, tile action parse/apply outcome, bridge no-write failures, and bootstrap tile/group state after persistence.
- How a future agent inspects this: read `resume.sfrb.json`, call `/__sfrb/bootstrap` in a running workspace, or run the starter/bridge tests.
- Failure state exposed: missing starter groups, bridge action parsing regressions, and silent invalid writes become inspectable at the canonical persistence boundary.

## Inputs

- `src/document/starters.ts` — starter factory introduced by S01 that now needs grouped template output.
- `src/bridge/server.mjs` — existing canonical mutation route widened in S02.
- `web/src/bridge-client.ts` — browser helper layer that should mirror the shared action contract.
- `T01 output` — canonical tile/group schema and pure action semantics that the bridge must apply.

## Expected Output

- `src/document/starters.ts` — template starter with assembled canonical frame groups.
- `src/bridge/server.mjs` — bridge action route handling tile/group actions through the existing validation boundary.
- `web/src/bridge-client.ts` — client helpers for submitting tile/group actions.
- `tests/document/starter-documents.test.ts` and `tests/bridge/bridge-editor-contract.test.ts` — executable proof of starter assembly, persistence round-trip, and invalid-action no-write behavior.