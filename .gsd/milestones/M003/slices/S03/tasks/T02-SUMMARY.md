---
id: T02
parent: S03
milestone: M003
provides:
  - One integrated proof that a real browser edit persists to canonical workspace state, appears on the shared `/print` preview, and still exports as a non-empty PDF through `dist/cli.js export` from the same workspace.
key_files:
  - tests/web/export-assembly.test.ts
  - scripts/verify-m003-s03-export-assembly.mjs
  - .gsd/milestones/M003/slices/S03/S03-PLAN.md
  - .gsd/STATE.md
key_decisions:
  - Keep the assembled trust proof on the shipped contracts by reusing the existing browser export popup path (`/print`) and built CLI export path (`dist/cli.js export`) instead of introducing any new route, marker, or PDF inspection layer.
patterns_established:
  - Cross-surface export proof should assert three distinct checkpoints on one workspace: browser-side canonical save, shared print popup marker/text agreement, and CLI artifact existence with `%PDF` signature only.
observability_surfaces:
  - tests/web/export-assembly.test.ts, scripts/verify-m003-s03-export-assembly.mjs console output (popup state + CLI exit/artifact bytes), shared `#root` marker attrs on `/print`, and generated artifact path/size.
duration: 1h 10m
verification_result: passed
completed_at: 2026-03-17T10:51:35Z
blocker_discovered: false
---

# T02: Add assembled browser-edit to shared-preview to CLI-export proof

**Added an end-to-end trust proof that a browser edit survives canonical save, appears on the shared print popup, and still exports as `%PDF` through the built CLI from the same workspace.**

## What Happened

I added `tests/web/export-assembly.test.ts` as the dedicated S03 integration proof. It opens a real built bridge workspace, edits the summary through the browser editor using the shipped design-mode interaction, waits for canonical save/reconciliation, verifies the workspace file now contains the edited text, opens the existing browser export popup, and asserts the popup `/print` surface shows the edited summary while still exposing the expected `#root` ready/clear export markers. The same test then runs `dist/cli.js export` against that workspace and verifies the produced artifact exists, is non-empty, and starts with `%PDF`.

I also created `scripts/verify-m003-s03-export-assembly.mjs` as the built-runtime smoke verifier named explicitly for M003/S03. It resolves repo paths from `import.meta.url`, provisions a temp workspace, performs the same browser edit → popup preview → CLI export flow on the built runtime, and logs popup marker state plus CLI artifact path/bytes so failures localize cleanly to browser save, shared preview, or PDF generation.

No helper or export-policy changes were required beyond the new proof surfaces; the shipped S02 ready/risk/blocked behavior stayed intact and was revalidated as part of slice verification.

## Verification

Passed:
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/export-assembly.test.ts tests/cli/export-command.test.ts`
- `npm --prefix /home/nlemo/SfRB/.gsd/worktrees/M003 run build && node /home/nlemo/SfRB/.gsd/worktrees/M003/scripts/verify-m003-s03-export-assembly.mjs`
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/printable-presentation-surface.test.ts tests/web/browser-export-flow.test.ts tests/web/export-assembly.test.ts tests/cli/export-command.test.ts`
- `npm --prefix /home/nlemo/SfRB/.gsd/worktrees/M003 run build`
- `node /home/nlemo/SfRB/.gsd/worktrees/M003/scripts/verify-s02-export-flows.mjs`
- `node /home/nlemo/SfRB/.gsd/worktrees/M003/scripts/verify-m003-s03-export-assembly.mjs`

Browser/UAT spot-check passed on the real built runtime via `node dist/cli.js open --cwd /tmp/sfrb-browser-uat-D5HiPt --port 4175 --no-open` plus browser assertions confirming:
- editor-side browser text entry persisted
- popup `/print` route reached `#root[data-print-mode="preview"][data-export-state="ready"][data-overflow-status="clear"][data-risk-count="0"][data-max-overflow-px="0"]`
- popup preview text contained the edited summary
- preview diagnostics/header were visible and no new console/network failures appeared after the settled popup state

## Diagnostics

Inspect later with:
- `tests/web/export-assembly.test.ts` for the canonical save → popup preview → CLI export assertions
- `scripts/verify-m003-s03-export-assembly.mjs` for built-runtime smoke output, especially:
  - `M003/S03 popup state: export=..., overflow=..., blockedReason=..., risks=..., maxOverflowPx=...`
  - `M003/S03 CLI export: exit=..., artifact=..., bytes=..., signature=%PDF`
- shared popup root markers on `#root`
- generated PDF artifact path and byte size from smoke/test failures

## Deviations

- None.

## Known Issues

- None.

## Files Created/Modified

- `tests/web/export-assembly.test.ts` — added the dedicated assembled proof covering browser edit persistence, shared `/print` popup reflection, and built CLI PDF export on one workspace.
- `scripts/verify-m003-s03-export-assembly.mjs` — added the built-runtime S03 smoke verifier with `import.meta.url`-based repo resolution and explicit popup/CLI diagnostics.
- `.gsd/milestones/M003/slices/S03/S03-PLAN.md` — marked T02 complete.
- `.gsd/STATE.md` — advanced the active next action to T03.
