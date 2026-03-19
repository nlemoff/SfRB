---
estimated_steps: 4
estimated_files: 4
---

# T04: Add built-runtime tile smoke proof and finalize slice evidence

**Slice:** S03 — Tile Engine & Group Locking
**Milestone:** M002

## Description

Retire the slice with real shipped-runtime evidence. This task should add a focused operational verifier for the built `dist/cli.js open` path, prove tile actions survive bridge/bootstrap/disk round-trip, prove one invalid action does not write, and then record the resulting evidence in the roadmap/requirements artifacts that later slices will read.

Relevant skill to load before implementation: `test`.

## Steps

1. Add a built-runtime verification script that creates or opens a design workspace through the built CLI and waits for the real bridge runtime to become ready.
2. Drive split, group, lock, and locked-group translation through `/__sfrb/editor`, then re-read `/__sfrb/bootstrap` and on-disk `resume.sfrb.json` to prove the same canonical state survived the runtime boundary.
3. Submit one intentionally invalid tile/group action and assert that the bridge returns actionable diagnostics while bootstrap/disk state remains unchanged.
4. After the verifier passes, update `.gsd/REQUIREMENTS.md` and the M002 roadmap evidence only where the new proof meaningfully advances R015 / S03 status.

## Must-Haves

- [ ] The verifier exercises the shipped runtime path, not internal helper functions alone.
- [ ] Runtime proof covers success and failure paths for canonical tile actions.
- [ ] Slice evidence is updated only after the operational proof passes.

## Verification

- `node scripts/verify-s03-tile-engine.mjs`
- Confirm the script checks both `/__sfrb/bootstrap` and on-disk `resume.sfrb.json`, and fails if the invalid action causes any write drift.

## Observability Impact

- Signals added/changed: built-runtime action outcomes, bootstrap/disk parity for grouped tiles, and invalid-action no-write diagnostics.
- How a future agent inspects this: run `node scripts/verify-s03-tile-engine.mjs` and inspect its reported bridge/bootstrap/disk assertions.
- Failure state exposed: real-runtime persistence drift, missing group/lock state after reload, and invalid-action write leaks become visible without opening the browser manually.

## Inputs

- `scripts/verify-s02-editor-actions.mjs` and `tests/utils/bridge-browser.ts` — existing runtime-proof patterns to reuse instead of inventing a new harness.
- `T02 output` — bridge/runtime persistence for tile actions.
- `T03 output` — final tile behaviors that the operational verifier should reflect.

## Expected Output

- `scripts/verify-s03-tile-engine.mjs` — operational proof for canonical tile/group behavior through the built runtime.
- `.gsd/REQUIREMENTS.md` — updated validation/evidence notes for R015 if the slice proof passes.
- `.gsd/milestones/M002/M002-ROADMAP.md` — slice evidence/status notes updated to reflect the new runtime proof.