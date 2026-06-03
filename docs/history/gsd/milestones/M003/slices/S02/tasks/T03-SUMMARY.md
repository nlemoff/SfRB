---
id: T03
parent: S02
milestone: M003
provides:
  - Browser export UX in the real app shell that probes the shared artifact route, mirrors ready/risk/blocked state, and opens the shared print surface without introducing a second renderer.
key_files:
  - web/src/App.tsx
  - web/src/bridge-client.ts
  - tests/web/browser-export-flow.test.ts
  - tests/cli/export-command.test.ts
  - OPEN_SOURCE_BUILD_PLAN.md
  - .gsd/milestones/M003/M003-ROADMAP.md
  - .gsd/milestones/M003/slices/S02/S02-SUMMARY.md
key_decisions:
  - Use a hidden same-origin `/print?mode=artifact` iframe probe in the browser shell so export trust state comes from the shared print surface markers, while the user-facing action opens `/print` and only requests browser print on `ready`.
patterns_established:
  - Browser export controls should consume shared print-surface markers (`data-export-state`, `data-overflow-status`, `data-blocked-reason`, `data-risk-count`, `data-max-overflow-px`) instead of recomputing readiness inside `App.tsx`.
observability_surfaces:
  - browser export UI state on `#browser-export-panel[data-export-state][data-overflow-status][data-blocked-reason][data-risk-count][data-max-overflow-px][data-last-action]`
  - shared artifact probe at `#browser-export-probe`
  - shared print surface root markers on `/print` and `/print?mode=artifact`
  - `tests/web/browser-export-flow.test.ts`
  - `node /home/nlemo/SfRB/.gsd/worktrees/M003/scripts/verify-s02-export-flows.mjs`
duration: 2h 33m
verification_result: passed
completed_at: 2026-03-17T10:23:27Z
blocker_discovered: false
---

# T03: Wire browser export UX and refresh S02 handoff docs

**Added a real browser export affordance that mirrors the shared print-surface trust contract, plus refreshed S02 handoff docs that hand S03 a polish-ready transport boundary.**

## What Happened

I updated `web/src/App.tsx` and `web/src/bridge-client.ts` so the editor shell now reads the shared export state from a hidden same-origin `/print?mode=artifact` probe instead of inventing a second renderer or a second readiness algorithm. The new browser export panel surfaces `ready`, `risk`, and `blocked` states with explicit copy, carries the root marker values onto `#browser-export-panel`, and tracks the last user-facing action (`idle`, `surface-opened`, `print-requested`, `popup-blocked`).

The export button now opens/focuses the shared `/print` surface. When the shared artifact probe reports `ready`, the shell requests browser print behavior; when the probe reports `risk` or `blocked`, the shell still opens the shared print surface for inspection but withholds any trustworthy export cue in the editor shell.

I added `tests/web/browser-export-flow.test.ts` to prove the ready/risk/blocked behavior against the real bridge/browser runtime, and I refreshed the contributor-facing docs in `OPEN_SOURCE_BUILD_PLAN.md`, `.gsd/milestones/M003/M003-ROADMAP.md`, and the new `.gsd/milestones/M003/slices/S02/S02-SUMMARY.md` so S03 inherits the shipped transport contract instead of rediscovering it. While running final slice verification, I also fixed `tests/cli/export-command.test.ts` to resolve the built command from the worktree repo root via `import.meta.url` rather than `process.cwd()`, which was pointing at the parent repo during Vitest/background-job runs.

## Verification

Passed:

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/browser-export-flow.test.ts tests/web/printable-presentation-surface.test.ts`
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/bridge/bridge-print-surface-contract.test.ts tests/cli/export-command.test.ts tests/web/printable-presentation-surface.test.ts tests/web/browser-export-flow.test.ts`
- `npm run build`
- `node /home/nlemo/SfRB/.gsd/worktrees/M003/scripts/verify-s02-export-flows.mjs`

Browser/UAT performed on the real app shell:

- Ready workspace: verified the browser shell showed `Export ready`, the button note changed to “requested browser print because the artifact surface is ready,” and a shared `/print` page opened.
- Risk workspace: verified the browser shell showed `Export risk`, surfaced overflow-warning copy with no trustworthy export cue, and the button note changed to “without requesting browser print because risk markers are present.”

## Diagnostics

Future agents can inspect this work through:

- `#browser-export-panel[data-export-state][data-overflow-status][data-blocked-reason][data-risk-count][data-max-overflow-px][data-last-action]` in the real app shell.
- `#browser-export-probe` to confirm the shell is consuming `/print?mode=artifact` rather than duplicating renderer logic.
- `/print` and `/print?mode=artifact` root markers on `#root`.
- `tests/web/browser-export-flow.test.ts` for the browser-facing ready/risk/blocked contract.
- `tests/cli/export-command.test.ts` and `scripts/verify-s02-export-flows.mjs` for the shared transport/runtime contract.

## Deviations

- I updated `tests/cli/export-command.test.ts` even though it was not listed in the T03 file set, because the slice-level verification gate exposed a real worktree-path bug in that test harness. The production export behavior was already correct; the test needed to resolve built files from the worktree root rather than `process.cwd()`.

## Known Issues

- Browser-tool UAT could reliably verify the ready/risk state and the shared `/print` popup URL from the shell, but the popup page itself sometimes remained in a `loading` snapshot when the browser tool raced the print dialog request. The Playwright/Vitest browser test covers the popup readiness contract deterministically.

## Files Created/Modified

- `web/src/App.tsx` — added the browser export panel, artifact-route probe, ready/risk/blocked copy, and shared `/print` launch behavior.
- `web/src/bridge-client.ts` — added shared print URL/snapshot helpers for browser export state mirroring.
- `tests/web/browser-export-flow.test.ts` — added real bridge/browser coverage for ready, risk, and blocked browser export flows.
- `tests/cli/export-command.test.ts` — fixed built-file resolution so slice verification runs against this worktree instead of the parent repo cwd.
- `OPEN_SOURCE_BUILD_PLAN.md` — refreshed the public handoff to treat S02 as shipped and point S03 at polish/assembly work.
- `.gsd/milestones/M003/M003-ROADMAP.md` — updated milestone handoff text to the shipped S02 transport boundary.
- `.gsd/milestones/M003/slices/S02/S02-SUMMARY.md` — created the slice handoff summary for S03/PR reuse.
- `.gsd/KNOWLEDGE.md` — recorded the cross-iframe `instanceof HTMLElement` gotcha for browser probes.
- `.gsd/DECISIONS.md` — recorded the browser export probe/launch decision (via GSD decision D036).
