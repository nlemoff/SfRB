# S01: Printable Presentation Surface — Summary

## Outcome

S01 shipped the first trustworthy export boundary for M003.

The built runtime now serves a dedicated `/print` route from the same canonical bootstrap payload used by the editor. That surface renders the resume without editor chrome, preserves the current one-page Letter geometry, and exposes deterministic DOM markers that say whether the surface is `ready`, `risk`, or `blocked` for downstream export work.

## What S01 Guarantees

Contributors can now rely on these facts without reopening the earlier slice tasks:

- `dist/cli.js open` serves `/print` as a real bridge route, not a test-only harness.
- The print surface is chrome-free. Editor HUD, drag handles, save-state UI, consultant UI, and bridge diagnostics are not part of the printable DOM.
- Canonical page and frame geometry are surfaced directly on the DOM through `[data-testid="print-page-*"]`, `[data-testid="print-frame-*"]`, `[data-testid="print-flow-*"]`, and `#print-export-diagnostics`.
- `#root` publishes stable diagnostics for automation: `data-render-state`, `data-payload-status`, `data-render-support`, `data-export-state`, `data-overflow-status`, `data-risk-count`, `data-max-overflow-px`, and `data-blocked-reason`.
- Known overflow no longer hides behind a visually plausible page. The print surface reports `risk` with measurable evidence, and payload/bootstrap failure reports `blocked`.
- `scripts/verify-s01-print-surface.mjs` proves the shipped runtime through ready, overflow-risk, and blocked-payload cases.

## What S02 Should Consume Next

S02 should build PDF generation on top of the existing S01 contract instead of inventing a second representation.

Specifically, S02 should:

- wait on S01’s existing print markers before attempting browser or CLI PDF generation
- treat `data-export-state="ready"` as the happy-path gate
- treat `data-export-state="risk"` and `data-export-state="blocked"` as explicit user-facing warning/failure states
- generate browser and CLI artifacts from the same `/print` surface

## What S03 Should Consume Next

S03 should assume the print route and readiness contract already exist.

Its work should focus on:

- polishing the presentation of the preview/artifact without removing the S01 diagnostics
- proving the assembled browser-edit → export-preview → PDF artifact flow after S02 lands
- leaving the final milestone-level handoff and PR summary for `DEV`

## PR-Ready Summary Seed

Use this shape when opening the planning/implementation PR into `DEV`:

> Shipped a canonical bridge-served `/print` surface for M003 that renders chrome-free resume pages from saved workspace state, exposes deterministic export ready/risk/blocked diagnostics on the DOM, and adds built-runtime smoke coverage plus contributor handoff docs so S02 can add PDF generation without rediscovering the print contract.

## Verification Anchor

- `npm run build && node scripts/verify-s01-print-surface.mjs`
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-print-surface-contract.test.ts tests/web/printable-presentation-surface.test.ts`

## Key Files

- `scripts/verify-s01-print-surface.mjs`
- `src/bridge/server.mjs`
- `web/src/presentation/render-printable-resume.ts`
- `web/src/presentation/print-surface.ts`
- `tests/bridge/bridge-print-surface-contract.test.ts`
- `tests/web/printable-presentation-surface.test.ts`
