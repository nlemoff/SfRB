---
id: T04
parent: S05
milestone: M002
provides:
  - Built-runtime proof that Freeform works through the shipped `dist/cli.js open` loop, persists supported element moves canonically, and exposes a blocked/no-write failure path future agents can inspect.
key_files:
  - scripts/verify-s05-freeform-smoke.mjs
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M002/M002-ROADMAP.md
  - .gsd/milestones/M002/slices/S05/S05-SUMMARY.md
  - .gsd/milestones/M002/slices/S05/S05-PLAN.md
  - .gsd/STATE.md
key_decisions:
  - Prove the failure path through a real blocked Freeform drag in the shipped browser surface instead of only by posting a synthetic invalid action, so the runtime evidence includes visible HUD diagnostics as well as no-write guarantees.
patterns_established:
  - Slice-closing Freeform proof should compare `#editor-last-action-kind`, `/__sfrb/bootstrap`, and on-disk `resume.sfrb.json` after a successful drag and again after a blocked drag to catch browser-only illusions and silent-write regressions.
observability_surfaces:
  - `node scripts/verify-s05-freeform-smoke.mjs`; `#editor-last-action-kind`; `[data-testid="freeform-move-state"]`; `[data-testid="freeform-placement-note"]`; `/__sfrb/bootstrap`; `resume.sfrb.json`
duration: 1h
verification_result: passed
completed_at: 2026-03-16 22:53 PDT
blocker_discovered: false
---

# T04: Add shipped-runtime freeform smoke proof and record slice evidence

**Added a shipped-runtime Freeform smoke verifier, proved the blocked/no-write path in-browser, and recorded S05/R014 as closed with operational evidence.**

## What Happened

I added `scripts/verify-s05-freeform-smoke.mjs` as the slice-closing runtime proof for S05. The script builds the app, creates a real design workspace, starts the shipped `dist/cli.js open` runtime, switches into Freeform, selects `summaryFrame`, drags it, and then re-checks `#editor-last-action-kind`, `/__sfrb/bootstrap`, and `resume.sfrb.json` to prove the move persisted canonically.

For the failure path, the same runtime flow switches through Tile just long enough to split/group/lock the summary lines, returns to Freeform, attempts to drag a locked-group member, and verifies the Freeform HUD exposes blocked diagnostics while `Last action`, bootstrap state, and on-disk JSON remain unchanged. The script also records editor mutation requests in the browser so the blocked drag can prove no extra `/__sfrb/editor` write was posted.

After the verifier passed, I recorded the new evidence in `.gsd/REQUIREMENTS.md` (R008 advanced, R014 validated), marked S05 complete in `.gsd/milestones/M002/M002-ROADMAP.md`, wrote the slice summary in `.gsd/milestones/M002/slices/S05/S05-SUMMARY.md`, marked T04 complete in `.gsd/milestones/M002/slices/S05/S05-PLAN.md`, and advanced `.gsd/STATE.md` to S06.

## Verification

Passed:
- `node scripts/verify-s05-freeform-smoke.mjs`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/editor-actions.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-freeform-mode.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-tile-mode.test.ts`

Explicit runtime behaviors confirmed:
- built `dist/cli.js open` served a real design workspace with a shipped Freeform lens
- successful Freeform drag persisted through canonical `set_frame_box`
- `#editor-last-action-kind` became `set_frame_box` after the successful move
- `/__sfrb/bootstrap` and `resume.sfrb.json` matched the moved frame geometry
- blocked locked-member Freeform drag exposed visible HUD diagnostics
- blocked drag caused no new `/__sfrb/editor` mutation, no bootstrap drift, and no disk drift

## Diagnostics

Future agents can inspect S05 proof via:

- `node scripts/verify-s05-freeform-smoke.mjs`
- `#editor-last-action-kind`
- `[data-testid="freeform-selected-element-geometry"]`
- `[data-testid="freeform-move-state"]`
- `[data-testid="freeform-placement-note"]`
- `/__sfrb/bootstrap`
- `resume.sfrb.json`
- `.gsd/milestones/M002/slices/S05/S05-SUMMARY.md` for the recorded slice closeout evidence

## Deviations

- I verified the no-write failure path through an actual blocked Freeform drag instead of relying solely on a direct invalid `/__sfrb/editor` POST, because the task plan explicitly called for visible diagnostics in the shipped runtime and this proves that behavior at the user interaction boundary.

## Known Issues

- The repo-root `async_bash` run for the slice matrix hit the known `**/.gsd/**` Vitest exclusion and reported “No test files found.” The authoritative slice verification is the successful worktree-shell run above, which executes from `/home/nlemo/SfRB/.gsd/worktrees/M002`.

## Files Created/Modified

- `scripts/verify-s05-freeform-smoke.mjs` — built-runtime Freeform smoke verifier covering success persistence plus blocked/no-write diagnostics.
- `.gsd/REQUIREMENTS.md` — advanced R008 evidence and validated R014 with the new shipped-runtime proof.
- `.gsd/milestones/M002/M002-ROADMAP.md` — marked S05 complete and recorded built-runtime proof language.
- `.gsd/milestones/M002/slices/S05/S05-SUMMARY.md` — recorded the full slice closeout evidence for future agents.
- `.gsd/milestones/M002/slices/S05/S05-PLAN.md` — marked T04 complete.
- `.gsd/STATE.md` — advanced the active slice/next action to S06.
