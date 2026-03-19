---
estimated_steps: 4
estimated_files: 5
---

# T04: Extend built-runtime smoke proof for text mode and record slice evidence

**Slice:** S04 — Text Mode as Real Writing Surface
**Milestone:** M002

## Description

Retire the slice with shipped-runtime evidence. This task should extend the existing S04 smoke verifier so the built CLI/browser loop proves text mode works in real workspaces, including a no-write failure path, and then record the resulting evidence in the milestone artifacts.

Relevant skill to load before implementation: `test`.

## Steps

1. Extend `scripts/verify-s04-editor-smoke.mjs` so it exercises the built `dist/cli.js open` path in both document and design workspaces, explicitly switches into Text mode, and performs a real content edit plus one supported structure edit.
2. Re-check `/__sfrb/bootstrap`, `Last action`, and on-disk `resume.sfrb.json` after those actions so the built runtime proves canonical persistence rather than an in-memory browser illusion.
3. Add an invalid text-action submission in the smoke flow and verify diagnostics are visible while bootstrap and disk state remain unchanged.
4. After the verifier passes, update the S04 summary plus requirement/roadmap evidence so later slices can rely on recorded proof instead of rediscovering it.

## Must-Haves

- [ ] The built runtime proves Text mode is available and functional in both document and design workspaces.
- [ ] Smoke verification confirms at least one canonical structure action persists through bridge/bootstrap/disk.
- [ ] The failure path proves invalid text actions surface diagnostics and do not mutate `resume.sfrb.json`.

## Verification

- `node scripts/verify-s04-editor-smoke.mjs`
- Confirm the script inspects `/__sfrb/bootstrap`, `Last action`, and on-disk document state for both success and invalid-action no-write flows.

## Observability Impact

- Signals added/changed: built-runtime text-lens action evidence, last-action inspection during smoke, and failure-path diagnostic assertions.
- How a future agent inspects this: run `node scripts/verify-s04-editor-smoke.mjs` and read the recorded S04 summary/evidence files.
- Failure state exposed: shipped-runtime lens regressions, bootstrap/disk drift, and invalid-action silent-write bugs become inspectable outside the in-process test runner.

## Inputs

- `scripts/verify-s04-editor-smoke.mjs` — existing built-runtime S04 smoke path to extend rather than replace.
- `tests/utils/bridge-browser.ts` — shared helpers for standing up workspaces and browser-driven checks.
- `T03 output` — working text-mode browser interactions and observability signals.
- `.gsd/REQUIREMENTS.md` and `.gsd/milestones/M002/M002-ROADMAP.md` — places where validated slice evidence is ultimately recorded.

## Expected Output

- `scripts/verify-s04-editor-smoke.mjs` — built-runtime verifier covering text mode success and invalid-action no-write flows.
- `.gsd/milestones/M002/slices/S04/S04-SUMMARY.md` — recorded slice proof for future agents.
- `.gsd/REQUIREMENTS.md` and `.gsd/milestones/M002/M002-ROADMAP.md` — updated evidence/status once the runtime verifier passes.
