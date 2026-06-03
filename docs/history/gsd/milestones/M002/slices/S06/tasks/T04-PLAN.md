---
estimated_steps: 4
estimated_files: 5
---

# T04: Add shipped-runtime reconciliation proof and record slice evidence

**Slice:** S06 — Mode Reconciliation & Layout Policies
**Milestone:** M002

## Description

Close the slice at the real runtime boundary. This task should add a dedicated S06 smoke verifier for the built `dist/cli.js open` loop, then record the resulting proof in the roadmap, requirements, and slice summary so later agents can rely on one authoritative evidence trail.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect the existing S04 and S05 smoke scripts to reuse their proven build/open/bootstrap/disk verification pattern, including the existing browser helpers in `tests/utils/bridge-browser.ts`.
2. Add `scripts/verify-s06-mode-reconciliation-smoke.mjs` to open a real design workspace, enter Freeform, trigger a reconciliation-relevant transition, assert a successful explicit policy path, and then assert an invalid/no-write path by re-checking `#editor-last-action-kind`, `/__sfrb/bootstrap`, and `resume.sfrb.json`.
3. Re-run the standing S04/S05 smoke proofs alongside the new S06 verifier so cross-lens reconciliation changes do not regress earlier text or freeform guarantees.
4. Update `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M002/M002-ROADMAP.md`, and `.gsd/milestones/M002/slices/S06/S06-SUMMARY.md` with the final evidence and any important verification caveats discovered while running the built-runtime proof.

## Must-Haves

- [ ] The built-runtime verifier proves an explicit reconciliation outcome on a real workspace rather than only in an in-process browser test.
- [ ] The verifier includes a no-write failure case with visible diagnostics and byte-stable bootstrap/disk state.
- [ ] Slice evidence is recorded in the project docs so S07 can consume S06 as a finished trust-contract slice.

## Verification

- `npm run build`
- `node scripts/verify-s04-editor-smoke.mjs`
- `node scripts/verify-s05-freeform-smoke.mjs`
- `node scripts/verify-s06-mode-reconciliation-smoke.mjs`

## Observability Impact

- Signals added/changed: shipped-runtime reconciliation summary/assertions and any new smoke-only selectors used to verify explicit policy outcomes.
- How a future agent inspects this: run the three smoke scripts, inspect their output, and read the updated requirement/roadmap/summary artifacts.
- Failure state exposed: built-runtime regressions in explicit reconciliation, bootstrap persistence, or no-write behavior become isolated to the shipped loop instead of being confused with in-process test failures.

## Inputs

- `scripts/verify-s04-editor-smoke.mjs` and `scripts/verify-s05-freeform-smoke.mjs` — the existing shipped-runtime proof pattern to preserve.
- `tests/utils/bridge-browser.ts` — reusable browser/runtime helper layer for temp workspaces and bootstrap assertions.
- `tests/web/editor-mode-reconciliation.test.ts` — browser-level behavior expectations that the smoke test should mirror at the shipped runtime boundary.
- `.gsd/REQUIREMENTS.md` and `.gsd/milestones/M002/M002-ROADMAP.md` — status artifacts that need final evidence once the runtime proof passes.

## Expected Output

- `scripts/verify-s06-mode-reconciliation-smoke.mjs` — built-runtime proof for explicit reconciliation success and no-write failure paths.
- `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M002/M002-ROADMAP.md`, and `.gsd/milestones/M002/slices/S06/S06-SUMMARY.md` — updated evidence that S06 retired the mode-reconciliation risk.
- `tests/utils/bridge-browser.ts` — any helper adjustments needed to support the new smoke flow.
