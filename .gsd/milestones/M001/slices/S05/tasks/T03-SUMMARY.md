---
id: T03
parent: S05
milestone: M001
provides:
  - Built-runtime consultant proof helpers plus happy/failure smoke coverage through `dist/cli.js open`, including canonical no-write/write assertions and durable UI diagnostics.
key_files:
  - tests/utils/bridge-browser.ts
  - tests/web/editor-layout-consultant.test.ts
  - scripts/verify-s05-layout-consultant.mjs
  - .gsd/milestones/M001/slices/S05/S05-PLAN.md
key_decisions:
  - Treat consultant preview visibility, overflow-clear status, payload-preview drift, and on-disk canonical file contents as the durable real-runtime proof signals instead of transient post-accept UI codes.
patterns_established:
  - Real-runtime consultant verification uses a temp design workspace plus deterministic provider fixtures to prove reject/no-write, accept/persist, and missing-secret failure observability through the shipped CLI open path.
observability_surfaces:
  - `#consultant-panel[data-consultant-state][data-consultant-code]`, `#consultant-overflow-status[data-overflow-status]`, `#consultant-preview-state[data-preview-visible]`, `#consultant-measurements[data-overflow-px]`, `#consultant-error`, `#bridge-payload-preview`, `tests/web/editor-layout-consultant.test.ts`, and `scripts/verify-s05-layout-consultant.mjs`
duration: 1h
verification_result: passed
completed_at: 2026-03-14 04:44 PDT
blocker_discovered: false
---

# T03: Prove the consultant loop through the real CLI-opened runtime

**Added consultant-aware built-runtime helpers, a browser-level happy/failure proof, and a standalone `dist/cli.js open` smoke verifier that proves reject/no-write, accept/persist/overflow-clear, and missing-secret failure behavior against a temp design workspace.**

## What Happened

I extended the shared bridge-browser harness with consultant-specific runtime helpers: deterministic OpenAI stub server setup, browser diagnostics reads, design-workspace open/select/request/accept/reject helpers, editor-idle waits, and raw canonical document reads for byte-for-byte no-write assertions. With those helpers in place, I hardened `tests/web/editor-layout-consultant.test.ts` into a full real-runtime proof that now covers the happy path and a missing-secret browser failure path in addition to the existing stale-preview invalidation case.

I then added `scripts/verify-s05-layout-consultant.mjs`, a standalone smoke verifier that launches the shipped `dist/cli.js open` entrypoint against temp workspaces, drives the consultant loop through Playwright, and exits non-zero when diagnostics are missing, reject mutates the canonical file, accept fails to persist the consultant resize, overflow does not clear, or a missing-secret failure does not stay non-mutating.

During verification I found that the original happy-path proof was relying on a transient `accepted` UI code that is immediately superseded by the normal measuring state once the preview clears. I kept the shipped UI behavior and changed the durable proof to assert the stronger signals that matter for the slice contract: preview cleared, canonical payload updated, canonical file written only after accept, and overflow cleared after persistence.

## Verification

- Passed: `npm test -- --run tests/bridge/bridge-layout-consultant-contract.test.ts`
- Passed: `npm test -- --run tests/web/editor-layout-consultant.test.ts`
- Passed: `node scripts/verify-s05-layout-consultant.mjs`
- Confirmed in the real CLI-opened runtime:
  - reject leaves `resume.sfrb.json` byte-identical
  - accept persists the resized frame to the canonical document and clears overflow afterward
  - missing `OPENAI_API_KEY` surfaces an inspectable consultant error while canonical payload/file state remains unchanged

## Diagnostics

Future agents can inspect the consultant proof path through:

- `tests/utils/bridge-browser.ts` for reusable temp-workspace, provider-fixture, and consultant diagnostics helpers
- `tests/web/editor-layout-consultant.test.ts` for browser-level happy/failure/stale-preview proofs
- `scripts/verify-s05-layout-consultant.mjs` for standalone shipped-runtime smoke coverage
- Runtime DOM diagnostics:
  - `#consultant-panel[data-consultant-state][data-consultant-code]`
  - `#consultant-overflow-status[data-overflow-status]`
  - `#consultant-measurements[data-overflow-px]`
  - `#consultant-preview-state[data-preview-visible]`
  - `#consultant-error`
  - `#bridge-payload-preview`

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `tests/utils/bridge-browser.ts` — added consultant-aware runtime/browser helpers, fixture server setup, diagnostics reads, and canonical raw-file helpers.
- `tests/web/editor-layout-consultant.test.ts` — upgraded the real-runtime browser proof to cover happy path, missing-secret failure path, and stale-preview invalidation with reusable helpers.
- `scripts/verify-s05-layout-consultant.mjs` — added standalone built-path smoke verification for consultant happy/failure flows.
- `.gsd/milestones/M001/slices/S05/S05-PLAN.md` — marked T03 complete.
