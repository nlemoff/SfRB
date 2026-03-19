---
estimated_steps: 4
estimated_files: 4
---

# T04: Add built-runtime action smoke proof and slice evidence for future CLI parity

**Slice:** S02 — Canonical Editor Action Model
**Milestone:** M002

## Description

Close the loop with an operational check that exercises the shipped runtime rather than in-process helpers. This task should prove structured actions are real end-to-end inputs to the running editor bridge and leave behind the evidence needed to advance R009 when the slice is complete.

Relevant skill to load before implementation: `test`.

## Steps

1. Replace or supplement the existing S02 smoke script with one that launches the built runtime against a real workspace and submits canonical structured actions through the running bridge.
2. Verify at least one committed block-text action and one committed frame-box action by re-reading both bootstrap state and on-disk `resume.sfrb.json` after each mutation.
3. Include a failure-path probe that submits an invalid structured action and asserts that the response exposes actionable diagnostics without mutating disk state.
4. After the script passes, update requirement/roadmap evidence for the slice so future agents can see that R009 now has operational proof tied to the real runtime.

## Must-Haves

- [ ] The built-runtime smoke script proves structured actions are accepted through the real `/__sfrb/editor` path, not only through imported helpers.
- [ ] The script validates both success and failure paths by checking bootstrap state, disk state, and invalid-action diagnostics.
- [ ] Slice evidence updates cite the new action-focused proof rather than the old whole-document smoke framing.

## Verification

- `node scripts/verify-s02-editor-actions.mjs`
- Confirm the script fails if either canonical action does not persist, if invalid action diagnostics disappear, or if disk state changes after the invalid payload.

## Observability Impact

- Signals added/changed: the operational smoke path now directly reports structured-action success/failure against the built runtime.
- How a future agent inspects this: run `node scripts/verify-s02-editor-actions.mjs` and compare bootstrap/disk state before and after actions.
- Failure state exposed: runtime-only regressions in the built CLI/open path become visible even if unit and browser tests still pass.

## Inputs

- `scripts/verify-s02-document-smoke.mjs` or the current S02 smoke entrypoint — baseline script to replace or supersede.
- `tests/utils/bridge-browser.ts` — existing runtime helpers and workspace setup patterns.
- `S02-PLAN.md` verification section — target behaviors the operational smoke must prove.

## Expected Output

- `scripts/verify-s02-editor-actions.mjs` — built-runtime structured-action smoke verifier.
- `.gsd/REQUIREMENTS.md` — R009 validation notes updated after proof is complete.
- `.gsd/milestones/M002/M002-ROADMAP.md` — slice completion state/evidence ready to record once implementation lands.