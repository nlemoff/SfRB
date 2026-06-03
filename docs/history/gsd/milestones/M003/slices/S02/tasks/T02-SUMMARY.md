---
id: T02
parent: S02
milestone: M003
provides:
  - Shipped `dist/cli.js export` on top of the real bridge runtime, with marker-gated PDF generation, explicit risk/blocked denial, and repeat artifact regeneration proof.
key_files:
  - src/commands/export.ts
  - src/cli.ts
  - tests/cli/export-command.test.ts
  - tests/utils/bridge-browser.ts
  - scripts/verify-s02-export-flows.mjs
key_decisions:
  - Reuse `runOpenCommand(..., { awaitShutdown: false })` and write PDFs to a temporary sibling path before renaming so failed exports never replace a prior artifact.
patterns_established:
  - CLI artifact generation must wait for shared `/print?mode=artifact` root markers and treat `risk` / `blocked` as hard failures instead of producing a plausible PDF.
observability_surfaces:
  - `dist/cli.js export` phase/status output, surfaced marker summaries (`render`, `payload`, `support`, `export`, `overflow`, `blockedReason`), and `scripts/verify-s02-export-flows.mjs` artifact timestamp/size assertions.
duration: ~2h15m
verification_result: passed
completed_at: 2026-03-17T10:04:57Z
blocker_discovered: false
---

# T02: Implement real CLI PDF export on the built runtime

**Added a shipped `dist/cli.js export` command that starts the real bridge, waits for the shared artifact print surface to report a trustworthy ready state, generates a PDF only on the clear path, and fails explicitly for risk/blocked payloads without replacing a prior artifact.**

## What Happened

I added `src/commands/export.ts` and registered it from `src/cli.ts`, so the built CLI now exposes `dist/cli.js export <output>`. The command reuses `runOpenCommand(..., { awaitShutdown: false })`, captures the resolved local bridge URL, opens `/print?mode=artifact` in Playwright Chromium, waits for the shared S01 root markers to settle, logs the observed surface status, and calls `page.pdf()` with Letter-focused geometry plus `printBackground` and `preferCSSPageSize` only when the surface is `ready` with `overflow=clear`.

To keep the artifact path trustworthy, the command treats `risk` and `blocked` as hard failures and includes the surfaced marker summary in CLI output. PDF writes go to a temporary sibling file first and only rename into place after a non-empty PDF is confirmed, so risk/blocked/error cases do not leave behind a fresh success-looking artifact or overwrite a previous one.

I extended `tests/utils/bridge-browser.ts` with built-CLI and PDF-inspection helpers, added `tests/cli/export-command.test.ts` to cover discoverability, happy-path generation, repeat overwrite/regeneration, overflow-risk denial, and blocked-payload denial, and added `scripts/verify-s02-export-flows.mjs` to prove the shipped runtime can generate and then regenerate a real PDF after canonical workspace changes.

## Verification

Passed:

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/cli/export-command.test.ts`
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/bridge/bridge-print-surface-contract.test.ts tests/cli/export-command.test.ts tests/web/printable-presentation-surface.test.ts tests/web/browser-export-flow.test.ts`
  - Vitest ran the existing bridge/web/CLI suites present in the workspace and all discovered tests passed.
- `npm run build && node scripts/verify-s02-export-flows.mjs`

Behavior confirmed by tests/smoke:

- `dist/cli.js export` is registered in CLI help.
- Ready/clear workspaces produce a non-empty `%PDF` artifact.
- Re-running export after canonical workspace changes overwrites/regenerates the artifact with changed timestamp and size.
- Overflow-risk workspaces exit non-zero, surface `export=risk`, and leave no artifact behind.
- Blocked payloads exit non-zero, surface `blockedReason=payload-error`, and do not replace a pre-existing artifact.

## Diagnostics

Future agents can inspect this work via:

- `dist/cli.js export <output> --cwd <workspace> --port 0`
  - stdout includes bridge readiness, the artifact print URL, and the settled marker summary.
  - stderr surfaces denial/error messages for timeout, risk, blocked, or PDF-generation failures.
- `scripts/verify-s02-export-flows.mjs`
  - proves built-runtime ready export, overwrite/regeneration, and overflow-risk denial.
- Shared DOM markers on `/print?mode=artifact`:
  - `#root[data-export-state]`
  - `#root[data-overflow-status]`
  - `#root[data-blocked-reason]`
  - `#root[data-risk-count]`
  - `#root[data-max-overflow-px]`

## Deviations

None.

## Known Issues

- The browser export affordance and its dedicated `tests/web/browser-export-flow.test.ts` coverage are still owned by T03; this task only shipped the CLI/runtime path.

## Files Created/Modified

- `src/commands/export.ts` — added the real CLI PDF export flow, marker gating, temp-file safety, and Playwright PDF generation.
- `src/cli.ts` — registered the shipped `export` command.
- `tests/utils/bridge-browser.ts` — added built-CLI execution and PDF inspection helpers for export verification.
- `tests/cli/export-command.test.ts` — added CLI export coverage for help output, success, regeneration, risk denial, and blocked denial.
- `scripts/verify-s02-export-flows.mjs` — added built-runtime smoke verification for export generation/regeneration and risk denial.
