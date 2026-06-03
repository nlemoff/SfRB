---
id: T03
parent: S01
milestone: M003
provides:
  - Built-runtime proof that the shipped `/print` surface works against real temp workspaces, plus concise contributor handoff docs for S02/S03 and the eventual PR into `DEV`
key_files:
  - scripts/verify-s01-print-surface.mjs
  - tests/utils/bridge-browser.ts
  - .gsd/milestones/M003/M003-ROADMAP.md
  - .gsd/milestones/M003/slices/S01/S01-SUMMARY.md
  - OPEN_SOURCE_BUILD_PLAN.md
  - .gsd/milestones/M003/slices/S01/S01-PLAN.md
key_decisions:
  - No new architectural decision was added; this task hardened the shipped-runtime verifier boundary by resolving build/runtime roots from file location instead of `process.cwd()` so worktree-targeted proof stays truthful under Vitest and background-job execution.
patterns_established:
  - Shipped-runtime smoke scripts and shared bridge-browser helpers should spawn `dist/cli.js` from a path-stable repo root derived from `import.meta.url`, then prove ready/risk/blocked states from the same DOM contract that browser and CLI export flows will consume.
observability_surfaces:
  - `scripts/verify-s01-print-surface.mjs`, `/print`, `/__sfrb/bootstrap`, `#root[data-render-state][data-payload-status][data-export-state][data-overflow-status][data-blocked-reason]`, `#print-export-diagnostics`, `.gsd/milestones/M003/M003-ROADMAP.md`, `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md`, and `OPEN_SOURCE_BUILD_PLAN.md`
duration: 2h 14m
verification_result: passed
completed_at: 2026-03-17T09:36:00Z
blocker_discovered: false
---

# T03: Prove the shipped print surface and record open-source / PR handoff

**Added an authoritative shipped-runtime `/print` smoke verifier, hardened the shared bridge/browser helper against worktree-path drift, and refreshed the roadmap/summary/public build-plan docs so S01 closes as a clean handoff into S02/S03 and the future PR into `DEV`.**

## What Happened

Loaded the `test` skill, inspected the existing smoke scripts plus `tests/utils/bridge-browser.ts`, and mirrored the established temp-workspace + `dist/cli.js open` pattern for a new shipped-runtime verifier instead of inventing a second harness.

I added `scripts/verify-s01-print-surface.mjs`, which now:
- creates real temp workspaces from the built starter-document factory;
- opens the actual built bridge runtime through `dist/cli.js open`;
- verifies a happy-path design workspace reaches chrome-free `Export ready` state on `/print`;
- verifies a known-overflow workspace reaches visible `Export risk` with non-zero overflow evidence;
- verifies a post-startup canonical payload failure reaches `Export blocked` / `payload-error` instead of leaving the surface looking trustworthy.

While verifying, I found a non-obvious harness bug: both the new smoke script and the shared `tests/utils/bridge-browser.ts` helper were using `process.cwd()`, which can point at the repo root rather than the M003 worktree under Vitest/background-job execution. That caused builds and spawned bridge processes to hit the wrong `dist/` tree. I fixed both to resolve the worktree repo root from `import.meta.url`, which made the built-runtime proof and the existing print-surface tests deterministic again.

For handoff, I:
- marked S01 as shipped in `.gsd/milestones/M003/M003-ROADMAP.md` and clarified exactly what S02 and S03 should consume next;
- created `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md` with the slice guarantees, downstream consumers, and a PR-ready one-paragraph summary seed;
- refreshed `OPEN_SOURCE_BUILD_PLAN.md` so outside contributors can see the current milestone state, open lanes, and future milestone order without reading the full internal archive;
- updated `.gsd/milestones/M003/slices/S01/S01-PLAN.md` so T03 is checked off and the stale M002-path verification references now point at the M003 worktree.

I also recorded the worktree-root gotcha in `.gsd/KNOWLEDGE.md` because it would otherwise be easy for a future agent to misdiagnose as a product regression.

## Verification

Passed:
- `cd /home/nlemo/SfRB/.gsd/worktrees/M003 && npm run build && node /home/nlemo/SfRB/.gsd/worktrees/M003/scripts/verify-s01-print-surface.mjs`
- `cd /home/nlemo/SfRB/.gsd/worktrees/M003 && npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 /home/nlemo/SfRB/.gsd/worktrees/M003/tests/bridge/bridge-print-surface-contract.test.ts /home/nlemo/SfRB/.gsd/worktrees/M003/tests/web/printable-presentation-surface.test.ts`
- Browser/UAT spot check on a live built `/print` route at `http://127.0.0.1:4318/print`:
  - screenshot confirmed a deliberate print artifact rather than the editor canvas
  - explicit browser assertions passed for `#root[data-render-state="ready"][data-export-state="ready"][data-overflow-status="clear"][data-chrome-free="true"][data-payload-status="ready"]`
  - explicit browser assertions passed for visible title, diagnostics band, page node, and frame node
- Docs spot check:
  - `OPEN_SOURCE_BUILD_PLAN.md` now identifies S01 as shipped, S02 as next, S03 as follow-on, and calls out the active contribution lanes without reopening M001/M002
  - `.gsd/milestones/M003/M003-ROADMAP.md` and `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md` now describe the exact S01 contract and PR-summary boundary

Note on the written slice-plan command: the plan originally referenced the old M002 worktree path for Vitest. I updated the slice plan to point at M003 and verified the equivalent M003-root command above.

## Diagnostics

Inspect later via:
- `node scripts/verify-s01-print-surface.mjs` for shipped-runtime ready/risk/blocked proof
- `/print` for the real printable surface
- `/__sfrb/bootstrap` for canonical ready/error payload inspection
- `#root` attrs on the print surface:
  - `data-render-state`
  - `data-payload-status`
  - `data-render-support`
  - `data-export-state`
  - `data-overflow-status`
  - `data-risk-count`
  - `data-max-overflow-px`
  - `data-blocked-reason`
- `#print-export-diagnostics`, `[data-testid="print-page-*"]`, `[data-testid="print-frame-*"]`, and `#print-surface-error` for visible/manual inspection
- `.gsd/milestones/M003/M003-ROADMAP.md`, `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md`, and `OPEN_SOURCE_BUILD_PLAN.md` for contributor-facing handoff context

## Deviations

- The inherited slice-plan/test command text still pointed at the old M002 worktree. I corrected the S01 plan to reference the M003 worktree and verified the equivalent M003-root Vitest command.
- I touched `tests/utils/bridge-browser.ts` in addition to the new smoke script because the shared helper had the same `process.cwd()` worktree-drift bug and would otherwise keep producing false failures when executed outside the worktree cwd.

## Known Issues

- The live browser session still logs a harmless local `favicon.ico` 404 from the bridge server. It does not affect print-route readiness, overflow diagnostics, or shipped-runtime verification.

## Files Created/Modified

- `scripts/verify-s01-print-surface.mjs` — added the built-runtime smoke verifier for ready, overflow-risk, and blocked-payload print-surface behavior.
- `tests/utils/bridge-browser.ts` — made build/spawn helpers resolve the correct worktree repo root from file location instead of `process.cwd()`.
- `.gsd/milestones/M003/M003-ROADMAP.md` — marked S01 shipped and clarified the exact S01 → S02/S03 handoff.
- `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md` — added the slice-level contract summary and PR-ready handoff seed.
- `OPEN_SOURCE_BUILD_PLAN.md` — refreshed the contributor-facing milestone map, active lanes, and next work after S01.
- `.gsd/milestones/M003/slices/S01/S01-PLAN.md` — marked T03 done and corrected stale M002 verification paths to the M003 worktree.
- `.gsd/KNOWLEDGE.md` — recorded the worktree-root verifier gotcha for future agents.
- `.gsd/STATE.md` — advanced state to reflect S01 completion and the S02 handoff.
