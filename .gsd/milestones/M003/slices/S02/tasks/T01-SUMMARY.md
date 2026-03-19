---
id: T01
parent: S02
milestone: M003
provides:
  - Shared `/print` preview/artifact modes that reuse the same canonical renderer and root export markers.
key_files:
  - src/bridge/server.mjs
  - web/src/print-main.tsx
  - web/src/presentation/print-surface.ts
  - web/src/presentation/render-printable-resume.ts
  - tests/bridge/bridge-print-surface-contract.test.ts
  - tests/web/printable-presentation-surface.test.ts
key_decisions:
  - Use `?mode=artifact` on the existing `/print` route instead of introducing a second print/export route or renderer.
patterns_established:
  - Keep preview-only shell chrome conditional in the shared renderer while preserving export diagnostics on `#root` in every mode.
observability_surfaces:
  - /print DOM markers on `#root[data-print-mode][data-export-state][data-overflow-status][data-blocked-reason]`
duration: 1h 7m
verification_result: passed
completed_at: 2026-03-17 02:57:14 PDT
blocker_discovered: false
---

# T01: Add artifact mode to the shared `/print` surface

**Added a mode-aware shared `/print` surface so preview and artifact rendering use the same canonical payload and renderer, while artifact mode strips preview chrome but keeps root export diagnostics intact.**

## What Happened

Loaded the `test` skill (plus `frontend-design` because the task touched the shipped print UI) and implemented the task plan directly on the existing S01 surface.

I updated `src/bridge/server.mjs` so the bridge matches `/print` by pathname instead of exact string equality, which keeps the route working for `/print?mode=artifact` without creating a second entrypoint. In `web/print.html` and `web/src/print-main.tsx`, I added explicit print-mode bootstrapping via `?mode=artifact`, defaulting to preview mode for direct contributor visits to `/print`.

The shared print bootstrap in `web/src/presentation/print-surface.ts` now passes a typed `mode` into the renderer and stamps `data-print-mode` onto `#root` during loading, ready, and error states. The canonical renderer in `web/src/presentation/render-printable-resume.ts` remains the single source of truth for page rendering and export diagnostics, but its shell is now mode-aware: preview mode still shows the human-readable header and diagnostics band, while artifact mode renders only the page stack with plain export-friendly shell styling. Root-level export markers (`data-export-state`, `data-overflow-status`, `data-blocked-reason`, `data-risk-count`, `data-max-overflow-px`) are preserved in both modes.

I then extended the bridge and browser tests to prove the contract rather than infer it visually. The bridge test now covers both `/print` and `/print?mode=artifact` on the same canonical bootstrap payload. The browser-facing print-surface tests now verify preview vs artifact DOM differences, shared content/marker parity, artifact-mode risk signaling without preview chrome, and blocked-state marker parity across both modes.

## Verification

Passed targeted task verification:

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
  - Result: 7 tests passed across 2 files.

Passed slice-level checks already available at this task boundary:

- `npm run build`
  - Result: passed.
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/bridge/bridge-print-surface-contract.test.ts tests/cli/export-command.test.ts tests/web/printable-presentation-surface.test.ts tests/web/browser-export-flow.test.ts`
  - Result: passed for the currently present bridge/web files; the CLI/browser-export files referenced by the slice plan do not exist yet in this worktree, so Vitest ran the two available files only.

Manual browser spot check against the real built runtime:

- Started `node dist/cli.js open --cwd /tmp/sfrb-t01-browser-3Bg1p7 --port 4317 --no-open`
- Verified `/print` with explicit browser assertions:
  - `#root[data-print-mode='preview'][data-export-state='ready'][data-overflow-status='clear']`
  - preview header visible
  - diagnostics band visible
- Verified `/print?mode=artifact` with explicit browser assertions/evaluation:
  - `#root[data-print-mode='artifact'][data-export-state='ready'][data-overflow-status='clear']`
  - page stack visible
  - `headerCount: 0`
  - `diagnosticsCount: 0`
  - canonical block text still present
- Browser diagnostics: no console errors, no failed network requests.

Additional slice command run for status tracking:

- `node scripts/verify-s02-export-flows.mjs`
  - Result: fails because `scripts/verify-s02-export-flows.mjs` does not exist yet; this is expected to land in T02 per the slice plan.

## Diagnostics

Future agents can inspect the shipped T01 contract by loading:

- `/print`
- `/print?mode=artifact`

Then reading these root markers on `#root`:

- `data-print-mode`
- `data-export-state`
- `data-overflow-status`
- `data-blocked-reason`
- `data-risk-count`
- `data-max-overflow-px`

Preview-only chrome is exposed via DOM presence/absence checks:

- preview-only header: `[data-testid="print-surface-header"]`
- preview-only diagnostics band: `[data-testid="print-export-diagnostics"]`

Executable proof lives in:

- `tests/bridge/bridge-print-surface-contract.test.ts`
- `tests/web/printable-presentation-surface.test.ts`

## Deviations

None.

## Known Issues

- The slice-plan verification artifacts for later tasks are not present yet in this worktree: `tests/cli/export-command.test.ts`, `tests/web/browser-export-flow.test.ts`, and `scripts/verify-s02-export-flows.mjs`. Their absence does not block T01, but the full slice verification matrix cannot complete until T02/T03 land.

## Files Created/Modified

- `src/bridge/server.mjs` — made `/print` route matching pathname-aware so query-driven print modes resolve through the shared route.
- `web/print.html` — added a root-level `data-print-mode` bootstrap marker.
- `web/src/print-main.tsx` — parsed `?mode=artifact` and passed the resolved mode into the shared print bootstrap.
- `web/src/presentation/print-surface.ts` — added typed print-mode handling for loading/ready/error states and preserved root export diagnostics across modes.
- `web/src/presentation/render-printable-resume.ts` — kept the canonical renderer shared while making preview chrome conditional and artifact shell export-friendly.
- `tests/bridge/bridge-print-surface-contract.test.ts` — extended route-contract coverage to prove preview and artifact modes share the same bootstrap payload.
- `tests/web/printable-presentation-surface.test.ts` — added preview/artifact parity checks and explicit artifact-mode chrome exclusion coverage.
