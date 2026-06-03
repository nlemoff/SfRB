---
estimated_steps: 5
estimated_files: 4
---

# T02: Add assembled browser-edit to shared-preview to CLI-export proof

**Slice:** S03 — Presentation Depth & Final Export Assembly
**Milestone:** M003

## Description

Close M003’s main trust gap with one integrated proof path. This task should show that a real browser edit persists to canonical workspace state, appears on the shared `/print` preview, and still exports through `dist/cli.js export` from the same workspace. The proof must run on the real built runtime and should add a dedicated S03 smoke script instead of overloading earlier open/export verifiers.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect `tests/utils/bridge-browser.ts` plus the existing editor and export tests to identify reusable helpers for temp workspaces, browser editing, popup handling, bridge startup, CLI export invocation, and PDF inspection.
2. Add `tests/web/export-assembly.test.ts` that opens a real workspace, performs a browser edit using existing editor interaction patterns, waits for canonical persistence/reconciliation, opens browser export, and asserts the popup `/print` surface contains the edited text while still exposing the expected root export markers.
3. From that same test flow or a tightly related assertion path, invoke `dist/cli.js export` against the same workspace and assert the produced file exists, is non-empty, and begins with `%PDF`; do not try to parse PDF text content.
4. Add or refine any small helper support in `tests/utils/bridge-browser.ts` and `tests/cli/export-command.test.ts` only as needed to keep the assembled proof readable and to preserve existing S02 ready/risk/blocked policy coverage.
5. Create `scripts/verify-m003-s03-export-assembly.mjs` as a built-runtime smoke verifier for the same assembled flow, resolving repo/worktree paths from `import.meta.url` rather than `process.cwd()`.

## Must-Haves

- [ ] The new test proves browser edit persistence, shared preview reflection, and CLI export coherence on one workspace.
- [ ] The assembled proof reuses the shipped `/print` and CLI export contracts rather than inventing new routes or readiness logic.
- [ ] The new smoke script has an explicit S03/M003 export-assembly name and uses `import.meta.url`-based path resolution.
- [ ] PDF verification stays at artifact existence / non-empty / `%PDF` level instead of brittle text extraction.

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M003 tests/web/export-assembly.test.ts tests/cli/export-command.test.ts`
- `npm run build && node scripts/verify-m003-s03-export-assembly.mjs`

## Observability Impact

- Signals added/changed: assembled proof output should surface popup print state, CLI export exit status, and artifact path/size clearly enough to localize whether a failure came from browser save, print preview, or PDF generation.
- How a future agent inspects this: run the dedicated Vitest file and the new smoke script, then inspect the temporary workspace and artifact file referenced in failures.
- Failure state exposed: browser-to-canonical drift, preview mismatch, CLI export denial, and missing/non-PDF artifacts each fail in distinct assertions instead of collapsing into one generic export error.

## Inputs

- `tests/utils/bridge-browser.ts` — shared bridge/browser/build helpers for real-runtime tests.
- `tests/web/editor-document-mode.test.ts`, `tests/web/editor-design-mode.test.ts`, `tests/web/editor-first-run-guidance.test.ts` — existing browser editing interaction patterns to reuse.
- `tests/web/browser-export-flow.test.ts`, `tests/cli/export-command.test.ts` — shipped S02 export semantics to preserve.
- Project knowledge note — all new smoke/test repo-root resolution must derive from `import.meta.url`, not `process.cwd()`.

## Expected Output

- `tests/web/export-assembly.test.ts` — assembled end-to-end trust proof from browser edit through shared print preview to CLI PDF export.
- `tests/utils/bridge-browser.ts` and optionally `tests/cli/export-command.test.ts` — helper/support updates that keep the new proof concise and aligned with S02 policy.
- `scripts/verify-m003-s03-export-assembly.mjs` — built-runtime smoke verifier for the finished S03 assembly path.
