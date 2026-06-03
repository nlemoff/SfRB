---
id: T02
parent: S01
milestone: M003
provides:
  - Deterministic print-surface export readiness, overflow risk, and blocked-state markers that future browser/CLI export flows can inspect from the DOM alone
key_files:
  - web/src/presentation/render-printable-resume.ts
  - web/src/presentation/print-surface.ts
  - web/src/bridge-client.ts
  - web/print.html
  - tests/bridge/bridge-print-surface-contract.test.ts
  - tests/web/printable-presentation-surface.test.ts
key_decisions:
  - D034: Expose root-level print export markers plus per-page/per-frame measurement attrs, with a small visible diagnostics band kept in sync with the same contract.
patterns_established:
  - Print/export surfaces can publish one contributor-friendly DOM contract by pairing root summary attrs (`data-export-state`, `data-overflow-status`, `data-render-support`) with page/frame measurement attrs that explain why a surface is risky or blocked.
observability_surfaces:
  - `#root[data-render-state][data-payload-status][data-render-support][data-export-state][data-overflow-status][data-risk-count][data-max-overflow-px][data-blocked-reason]`, `#print-export-diagnostics`, `[data-testid="print-page-*"]`, `[data-testid="print-frame-*"]`, and `[data-testid="print-margin-box-*"]`
duration: 1h 32m
verification_result: passed
completed_at: 2026-03-17T09:22:36Z
blocker_discovered: false
---

# T02: Expose deterministic export readiness and overflow diagnostics on the print surface

**Added a deterministic print-surface contract that reports export `ready` vs `risk` vs `blocked`, with explicit overflow/clipping evidence on the DOM instead of leaving trust to visual inference.**

## What Happened

Loaded the `test` skill, inspected the existing overflow logic in `web/src/editor/Canvas.tsx`, and reused the same core measurement idea on the print surface: compare rendered content height to available height after the canonical DOM is mounted, instead of inventing a separate export pagination model.

In `web/src/presentation/render-printable-resume.ts`, I expanded the shared renderer so it now:
- sets root-level machine-readable markers for render support, export state, overflow status, risk count, max overflow, and blocked reason;
- measures design-mode frame overflow from the rendered frame body;
- measures document-mode margin-box flow overflow from the rendered page flow;
- records per-frame and per-page measurement attrs (`data-overflow-status`, `data-overflow-px`, measured heights, clip status where relevant);
- renders a small visible diagnostics band that mirrors the same contract for contributors doing manual verification.

In `web/src/presentation/print-surface.ts`, I aligned loading and error states with the same contract so the surface now moves through a deterministic lifecycle: pending while bootstrapping, ready/risk after successful render, and blocked on shared payload failure. I also updated `web/print.html` so the static shell starts in an explicit pending state before client bootstrap completes.

In `web/src/bridge-client.ts`, I added shared union types for print render support / overflow / export state so the route modules use a common vocabulary instead of ad hoc strings.

I extended the existing bridge/browser tests rather than replacing them. The updated tests now prove three important cases from the actual `/print` route: a clear design workspace reports `ready`, an overflowing design workspace reports `risk` with non-zero measurements, and a bootstrap failure reports `blocked` with payload-error visibility.

## Verification

Passed:
- `npx vitest run tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
- `npm run build`
- Manual browser spot check on the real `/print` route:
  - clear workspace at `http://127.0.0.1:4313/print` showed `#root[data-export-state="ready"][data-overflow-status="clear"][data-render-support="supported"]` and the visible "Export ready" diagnostics band
  - overflowing workspace at `http://127.0.0.1:4314/print` showed `#root[data-export-state="risk"][data-overflow-status="risk"][data-render-support="supported"]`, visible "Export risk" diagnostics, and `print-frame-summaryFrame[data-overflow-status="risk"]`

Observed / partial slice-level verification:
- `node scripts/verify-s01-print-surface.mjs` currently fails with `MODULE_NOT_FOUND` because that verifier does not exist yet in this worktree; that is expected follow-on work for T03.
- Docs/handoff checks for `OPEN_SOURCE_BUILD_PLAN.md`, `.gsd/milestones/M003/M003-ROADMAP.md`, and `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md` remain for T03.

## Diagnostics

Inspect later via:
- Root print-surface contract on `#root`:
  - `data-render-state`
  - `data-payload-status`
  - `data-render-support`
  - `data-export-state`
  - `data-overflow-status`
  - `data-risk-count`
  - `data-max-overflow-px`
  - `data-blocked-reason`
- Visible contributor-facing summary:
  - `#print-export-diagnostics`
  - `[data-testid="print-export-status-label"]`
  - `[data-testid="print-export-status-headline"]`
  - `[data-testid="print-export-status-detail"]`
- Design-mode evidence:
  - `[data-testid="print-frame-*"]` with `data-overflow-status`, `data-overflow-px`, `data-measured-content-height`, `data-measured-available-height`, `data-clip-status`, `data-clip-px`
- Document-mode evidence:
  - `[data-testid="print-page-*"]`, `[data-testid="print-margin-box-*"]`, and `[data-testid="print-flow-*"]` with overflow measurement attrs
- Error/blocked surface:
  - `#print-surface-error`
  - `[data-testid="print-error-export-status"]`

## Deviations

- I added a small visible diagnostics band (`#print-export-diagnostics`) in addition to the machine-readable attrs. The task plan required inspectable readiness/risk/blocked state; this extra surface keeps manual contributor verification honest without creating a second source of truth because it mirrors the exact same DOM contract.
- The slice verification command text still references the old M002 worktree path, but execution was run from the required M003 worktree.

## Known Issues

- `scripts/verify-s01-print-surface.mjs` still does not exist, so the slice-level shipped-runtime verifier remains incomplete until T03.
- The manual browser checks still surface a harmless `/favicon.ico` 404 from the local bridge server; it does not affect export-state markers or tests.
- Unsupported-physics blocking is represented in the renderer contract, but the current bridge validation normally prevents unsupported physics from reaching a ready payload; the blocked path exercised in this task is the shared payload-error route.

## Files Created/Modified

- `web/src/presentation/render-printable-resume.ts` — added root export-state markers, frame/page overflow measurement, and the visible diagnostics band for ready/risk/blocked print states.
- `web/src/presentation/print-surface.ts` — aligned loading/error lifecycle with the same deterministic export-state contract and blocked-state visibility.
- `web/src/bridge-client.ts` — added shared print-surface state union types used by the renderer/bootstrap modules.
- `web/print.html` — seeded the print shell with explicit pending-state markers before client bootstrap resolves.
- `tests/bridge/bridge-print-surface-contract.test.ts` — extended route-contract coverage to assert the new pending-state shell markers.
- `tests/web/printable-presentation-surface.test.ts` — added ready/risk/blocked browser coverage for the real `/print` surface.
- `.gsd/DECISIONS.md` — recorded D034 for the print export-readiness observability contract.
