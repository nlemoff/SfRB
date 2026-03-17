---
estimated_steps: 5
estimated_files: 6
---

# T03: Rework the browser shell for first-run guidance and prove the shipped loop

**Slice:** S01 — Template Starts & First-Run Guidance
**Milestone:** M002

## Description

Finish the slice where the user actually feels it: the `sfrb open` browser path. This task should make the first screen guidance-first instead of diagnostics-first, expose the chosen starter and AI availability from canonical workspace state, and prove through the real runtime that template/blank workspaces open cleanly and remain editable through the existing bridge/editor loop.

## Steps

1. Extend the bridge/bootstrap payload only as needed so the browser can read starter identity and AI availability from canonical workspace/config state instead of inventing client-local onboarding state.
2. Recompose the browser shell so starter identity, replacement guidance, and the text/tile/freeform explanation are primary while dev diagnostics and consultant surfaces become secondary.
3. Keep the guidance copy honest: explain what each editing lens is for, note what is available now, and avoid coupling these product modes to the current physics label.
4. Add a browser test that opens both starter variants through the bridge, verifies the first-run guidance surface, and confirms a simple content replacement still persists through canonical save/refetch behavior.
5. Add a built-path smoke script that creates a temp starter workspace, runs the shipped `dist/cli.js open` loop, and checks the non-AI first-run path plus inspectable degraded AI state.

## Must-Haves

- [ ] The browser shell reflects starter choice and AI availability from canonical state, not from transient UI memory.
- [ ] Text/tile/freeform guidance is visually primary and does not overpromise unshipped behavior.
- [ ] A basic starter-content replacement still persists through `/__sfrb/editor` and bootstrap reconciliation in the real runtime.

## Verification

- `npm test -- --run tests/web/editor-first-run-guidance.test.ts`
- `node scripts/verify-s01-first-run.mjs`
- Confirm the smoke proof covers a workspace with AI intentionally skipped and verifies that AI-dependent surfaces degrade inspectably instead of crashing.

## Observability Impact

- Signals added/changed: bootstrap/UI starter identity, AI availability state, guidance-surface test ids, and existing editor save/error state remain inspectable.
- How a future agent inspects this: `/__sfrb/bootstrap`, `tests/web/editor-first-run-guidance.test.ts`, `scripts/verify-s01-first-run.mjs`, and stable browser text/testids in the first-run shell.
- Failure state exposed: mismatched starter copy, missing guidance panel, broken AI-skipped rendering, or canonical save/refetch drift becomes visible in browser assertions and smoke output.

## Inputs

- `src/bridge/server.mjs` — canonical bootstrap path the browser must continue to trust.
- `web/src/App.tsx` — current diagnostics-heavy shell to rebalance.
- `tests/utils/bridge-browser.ts` — existing built-runtime browser helpers to extend for first-run proof.
- T02 output — init-created starter workspaces that the browser/runtime proof should open.

## Expected Output

- `src/bridge/server.mjs` — bootstrap payload updated only as needed for first-run state.
- `web/src/App.tsx` — guidance-first shell with demoted diagnostics.
- `tests/web/editor-first-run-guidance.test.ts` — browser proof covering both starter variants and canonical persistence.
- `scripts/verify-s01-first-run.mjs` — built-path smoke verification for the shipped first-run loop.
