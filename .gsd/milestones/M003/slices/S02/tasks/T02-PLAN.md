---
estimated_steps: 5
estimated_files: 6
---

# T02: Implement real CLI PDF export on the built runtime

**Slice:** S02 — Shared PDF Export Flows
**Milestone:** M003

## Description

Make the artifact path real. This task should add `dist/cli.js export` by reusing the shipped bridge runtime, waiting on the S01 root markers, and generating a PDF only when the shared print surface reports a trustworthy `ready` state. Overflow-risk and blocked payloads should fail explicitly rather than leaving behind a plausible but untrustworthy artifact.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect `src/cli.ts`, `src/commands/open.ts`, `tests/utils/bridge-browser.ts`, and `scripts/verify-s01-print-surface.mjs` to reuse the existing bridge lifecycle, temp-workspace handling, and built-runtime wait patterns instead of inventing a second server path.
2. Add a new export command module (for example `src/commands/export.ts`) and register it in `src/cli.ts`, reusing `runOpenCommand(..., { awaitShutdown: false })` so the command starts the real bridge, captures the resolved local URL, and always shuts it down after success or failure.
3. Use Playwright Chromium to open the shared artifact-mode print route, wait specifically for `#root[data-export-state]`, and call `page.pdf()` with the project’s preferred options (`printBackground`, `preferCSSPageSize`, and current Letter-focused geometry) only when the surface reports `ready` with clear overflow state.
4. Treat `risk` and `blocked` as hard failures for the CLI path: surface the export state/reason in command output, exit non-zero, and leave no fresh success artifact behind.
5. Extend `tests/utils/bridge-browser.ts`, add `tests/cli/export-command.test.ts`, and add `scripts/verify-s02-export-flows.mjs` so the built runtime proves happy-path PDF generation plus repeat export overwrite/regeneration after the canonical workspace changes.

## Must-Haves

- [ ] `dist/cli.js export` exists and is registered in the shipped CLI.
- [ ] The command reuses the real bridge runtime rather than a duplicate export server.
- [ ] CLI export waits on S01 root markers and generates a non-empty PDF only for the ready/clear path.
- [ ] `risk` and `blocked` fail explicitly with actionable output and no silent success artifact.
- [ ] Tests and a built-runtime smoke script prove repeat export regeneration from canonical state.

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/cli/export-command.test.ts`
- `npm run build && node scripts/verify-s02-export-flows.mjs`
- Manual spot check: export the same workspace twice with a canonical content change in between and confirm the output file timestamp/size changes.

## Observability Impact

- Signals added/changed: CLI export phase/status output, surfaced `risk` / `blocked` reasons, and artifact file regeneration evidence in smoke assertions.
- How a future agent inspects this: run `dist/cli.js export` directly, inspect stderr/stdout, and use `scripts/verify-s02-export-flows.mjs` for built-runtime proof.
- Failure state exposed: bridge startup failure, export wait timeout, Playwright PDF errors, overflow-risk denial, and blocked payload failures become explicit command outcomes.

## Inputs

- `src/cli.ts`, `src/commands/open.ts` — existing CLI registration and reusable bridge-start seam.
- `tests/utils/bridge-browser.ts` — temp workspace, bridge readiness, and browser automation helpers.
- `scripts/verify-s01-print-surface.mjs` — current built-runtime verification pattern to copy for S02.
- `web/src/bridge-client.ts` and the S01 `/print` root markers — trusted export-state vocabulary to consume.
- T01 output — shared artifact-mode print route that excludes preview chrome.

## Expected Output

- `src/commands/export.ts` and `src/cli.ts` — shipped CLI export entrypoint wired to the shared print surface.
- `tests/cli/export-command.test.ts`, `tests/utils/bridge-browser.ts`, and `scripts/verify-s02-export-flows.mjs` — automated proof of happy-path artifact creation, failure-path denial, and repeat export regeneration.
