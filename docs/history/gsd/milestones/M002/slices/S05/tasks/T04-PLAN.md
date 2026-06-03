---
estimated_steps: 4
estimated_files: 5
---

# T04: Add shipped-runtime freeform smoke proof and record slice evidence

**Slice:** S05 — Freeform Element Editor
**Milestone:** M002

## Description

Retire the slice with built-path evidence. This task should add a dedicated S05 smoke verifier that exercises Freeform through the shipped CLI/browser runtime and then record the resulting proof so later slices can rely on it without rediscovering the behavior.

Relevant skill to load before implementation: `test`.

## Steps

1. Add `scripts/verify-s05-freeform-smoke.mjs` to open a real workspace through `dist/cli.js open`, switch into Freeform, and select/move at least one supported page element.
2. Re-check `Last action`, `/__sfrb/bootstrap`, and on-disk `resume.sfrb.json` after the move so the built runtime proves canonical persistence rather than an in-memory browser illusion.
3. Exercise an invalid or blocked freeform move in the same smoke flow and verify diagnostics are visible while bootstrap and disk state remain unchanged.
4. After the verifier passes, update the S05 summary plus any requirement/roadmap evidence files so the slice’s proof is recorded for future agents.

## Must-Haves

- [ ] The built runtime proves Freeform is available and functional through the shipped local loop.
- [ ] Smoke verification confirms a supported element move persists through bridge, bootstrap, and disk.
- [ ] The failure path proves invalid or blocked freeform moves surface diagnostics and do not mutate `resume.sfrb.json`.

## Verification

- `node scripts/verify-s05-freeform-smoke.mjs`
- Confirm the script inspects `Last action`, `/__sfrb/bootstrap`, and on-disk document state for both success and no-write failure flows.

## Observability Impact

- Signals added/changed: built-runtime freeform action evidence, last-action inspection during smoke, and blocked-move diagnostic assertions.
- How a future agent inspects this: run `node scripts/verify-s05-freeform-smoke.mjs` and read the recorded S05 summary/evidence files.
- Failure state exposed: shipped-runtime freeform regressions, bootstrap/disk drift, and invalid-action silent-write bugs become inspectable outside the in-process test runner.

## Inputs

- `tests/utils/bridge-browser.ts` — existing helpers for standing up built-runtime browser flows.
- `scripts/verify-s04-editor-smoke.mjs` — prior slice pattern for built-runtime proof and no-write failure assertions.
- `T03 output` — working freeform browser interactions and observability signals.
- `.gsd/REQUIREMENTS.md` and `.gsd/milestones/M002/M002-ROADMAP.md` — files where validated evidence may be recorded after the verifier passes.

## Expected Output

- `scripts/verify-s05-freeform-smoke.mjs` — built-runtime verifier for freeform success and blocked/no-write flows.
- `.gsd/milestones/M002/slices/S05/S05-SUMMARY.md` — recorded slice proof for future agents.
- `.gsd/REQUIREMENTS.md` and `.gsd/milestones/M002/M002-ROADMAP.md` — updated evidence/status once S05 proof is complete.