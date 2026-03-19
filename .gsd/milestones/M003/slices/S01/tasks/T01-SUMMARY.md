---
id: T01
parent: S01
milestone: M003
provides:
  - Dedicated bridge-served printable surface backed by the shared canonical bootstrap payload
key_files:
  - src/bridge/server.mjs
  - web/src/presentation/render-printable-resume.ts
  - web/src/presentation/print-surface.ts
  - web/print.html
  - tests/bridge/bridge-print-surface-contract.test.ts
  - tests/web/printable-presentation-surface.test.ts
key_decisions:
  - D033: Use a dedicated /print route plus a DOM-first printable renderer that consumes /__sfrb/bootstrap instead of introducing an export-only DTO.
patterns_established:
  - Multi-surface bridge routes can share one canonical ready/error payload contract while using separate HTML entries and DOM-first mount code.
observability_surfaces:
  - /print DOM markers (#root data-render-state/data-chrome-free/data-payload-status, page/frame geometry data attrs) and /__sfrb/bootstrap
duration: 1h 21m
verification_result: passed
completed_at: 2026-03-17T09:11:55Z
blocker_discovered: false
---

# T01: Introduce a shared printable renderer and bridge print route

**Added a dedicated `/print` surface that renders canonical resume pages and frames from shared bridge bootstrap data without any editor/debug chrome.**

## What Happened

Loaded the `test` and `frontend-design` skills, then followed the task-plan files named for the bridge/editor runtime. I extracted a dedicated printable renderer into `web/src/presentation/render-printable-resume.ts` and a lightweight print bootstrap into `web/src/presentation/print-surface.ts`, with `web/print.html` + `web/src/print-main.tsx` as the route-specific entry.

On the bridge side, `src/bridge/server.mjs` now serves `/print` from a separate HTML template while continuing to feed the surface through the existing `/__sfrb/bootstrap` ready/error payload contract. I also exported `BRIDGE_PRINT_PATH` from `web/src/bridge-client.ts` and the browser test harness for shared route usage.

The printable renderer preserves canonical page geometry and margin metadata, renders design-mode frames at saved coordinates, and falls back to semantic section flow inside the page margin box for document-mode workspaces. It intentionally excludes editor handles, consultant UI, diagnostics panels, payload preview, and save-state shell UI.

I added `tests/bridge/bridge-print-surface-contract.test.ts` and `tests/web/printable-presentation-surface.test.ts` to lock the route contract and browser-visible chrome-free surface. During verification I had to correct two bridge-server wiring mistakes (`BRIDGE_PRINT_PATH`/`respondHtml` not actually present in source after an earlier edit); no plan-level blocker was discovered.

## Verification

Passed:
- `npx vitest run tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`
- `npm run build`
- Manual browser/UAT on `http://127.0.0.1:4313/print` against a temp design workspace:
  - confirmed title/content rendered from canonical workspace state
  - confirmed `#root[data-render-state="ready"][data-chrome-free="true"][data-payload-status="ready"]`
  - confirmed page/frame geometry markers present
  - confirmed editor/debug chrome absent via DOM evaluation (`#editor-canvas`, `#bridge-payload-preview`, `#editor-save-status`, `#consultant-panel`, drag handles all absent)

Partial / not yet available in this task:
- `node scripts/verify-s01-print-surface.mjs` → script does not exist yet in this worktree (expected for later slice work)
- Failure-path overflow/readiness export-state verification from the slice plan is not complete yet; T02 is planned to add those deterministic markers.
- Docs/handoff check for `.gsd/milestones/M003/slices/S01/S01-SUMMARY.md` cannot pass yet because that slice summary file does not exist before later tasks.

## Diagnostics

Inspect later via:
- Bridge route: `GET /print`
- Shared payload: `GET /__sfrb/bootstrap`
- DOM readiness/chrome markers on `#root`:
  - `data-render-state`
  - `data-chrome-free`
  - `data-payload-status`
  - `data-physics`
  - `data-page-count`
- Page/frame geometry markers:
  - `[data-testid="print-page-*"]` with `data-page-width`, `data-page-height`, and margin attrs
  - `[data-testid="print-frame-*"]` with saved frame box attrs
- Browser tests:
  - `tests/bridge/bridge-print-surface-contract.test.ts`
  - `tests/web/printable-presentation-surface.test.ts`

## Deviations

- I added `web/print.html` and `web/src/print-main.tsx` as route-specific entry files in addition to the task-plan’s expected output files. This was the smallest way to give `/print` its own surface without coupling it to the editor shell.
- The slice verification command text still references the old M002 worktree path, but execution and tests were run from the required M003 worktree.

## Known Issues

- The print surface currently exposes readiness and chrome-free render markers, but not the fuller overflow/risk export-state contract described for S01. That work remains for T02.
- `scripts/verify-s01-print-surface.mjs` is still missing, so built-runtime smoke verification is not yet automated.
- Browser console still shows a 404 for `/favicon.ico` on the print route; it does not block rendering or tests.

## Files Created/Modified

- `src/bridge/server.mjs` — added the dedicated `/print` bridge route and shared HTML response helper.
- `web/src/bridge-client.ts` — exported `BRIDGE_PRINT_PATH` alongside the shared bootstrap contract.
- `web/src/presentation/render-printable-resume.ts` — added the canonical chrome-free printable renderer for design/document physics.
- `web/src/presentation/print-surface.ts` — added the lightweight print-surface bootstrap and ready/error rendering.
- `web/src/print-main.tsx` — added the print-route entrypoint.
- `web/print.html` — added the dedicated HTML shell for the print surface.
- `tests/utils/bridge-browser.ts` — exported the shared print-route constant for tests.
- `tests/bridge/bridge-print-surface-contract.test.ts` — added bridge-route contract coverage for `/print` + `/__sfrb/bootstrap`.
- `tests/web/printable-presentation-surface.test.ts` — added browser coverage for canonical print rendering and chrome absence.
- `.gsd/DECISIONS.md` — recorded D033 for the shared print-route/bootstrap contract choice.
