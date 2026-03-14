---
estimated_steps: 4
estimated_files: 5
---

# T03: Prove the consultant loop through the real CLI-opened runtime

**Slice:** S05 — AI Layout Consultant
**Milestone:** M001

## Description

Close the slice with the same proof standard S04 used: the built `dist/cli.js open` runtime against a temp workspace. This task should make the consultant workflow durable outside isolated unit coverage by codifying a full happy-path and failure-path smoke run that proves the canonical authoring loop remains intact.

## Steps

1. Extend the shared bridge-browser helpers with consultant-specific fixture setup, UI diagnostics reads, and canonical file assertions needed for overflow/proposal workflows.
2. Finish the browser-level end-to-end test so it drives a temp design workspace from visible overflow to proposal preview, reject/no-write, accept/persist, and overflow-cleared assertions through the real runtime.
3. Add a standalone smoke script that launches `dist/cli.js open`, exercises the consultant loop with deterministic provider fixtures, and exits non-zero on either canonical drift or missing diagnostics.
4. Include one provider-error or missing-secret scenario in the built-path proof so future agents can localize consultant failures without manually reproducing them.

## Must-Haves

- [ ] Real-runtime proof uses the shipped CLI entrypoint, not an in-process server shortcut.
- [ ] Happy-path proof asserts canonical file mutation only after accept and overflow cleared afterward.
- [ ] Failure-path proof asserts consult errors are visible while the canonical document remains unchanged.

## Verification

- `npm test -- --run tests/web/editor-layout-consultant.test.ts`
- `node scripts/verify-s05-layout-consultant.mjs`

## Observability Impact

- Signals added/changed: durable smoke assertions around overflow status, consultant state, proposal visibility, and canonical file writes.
- How a future agent inspects this: `tests/web/editor-layout-consultant.test.ts`, `scripts/verify-s05-layout-consultant.mjs`, and helper diagnostics in `tests/utils/bridge-browser.ts`.
- Failure state exposed: whether the break is in overflow detection, bridge consultant request, preview rendering, accept persistence, or provider configuration.

## Inputs

- `tests/utils/bridge-browser.ts` — existing built-runtime harness from S04.
- `tests/web/editor-layout-consultant.test.ts` — browser workflow coverage to extend and harden.
- T01/T02 outputs — consultant bridge route, diagnostics, and accept/reject UI behavior.

## Expected Output

- `tests/utils/bridge-browser.ts` — reusable consultant-aware runtime helpers.
- `tests/web/editor-layout-consultant.test.ts` — end-to-end consultant workflow proof.
- `scripts/verify-s05-layout-consultant.mjs` — standalone built-path smoke verifier for the slice.
