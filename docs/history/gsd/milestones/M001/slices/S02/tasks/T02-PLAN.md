---
estimated_steps: 4
estimated_files: 5
---

# T02: Enforce workspace physics through document validation and temp-workspace smoke coverage

**Slice:** S02 — Universal Doc Model
**Milestone:** M001

## Description

Make the universal document model actually respect workspace physics. This task adds physics-aware validation that consumes the S01 config boundary, enforces document-vs-design expectations against the same on-disk document contract from T01, and proves the behavior through temp-workspace tests and a smoke script that exercise both success and failure paths.

## Steps

1. Implement `src/document/validation.ts` to load the workspace config, validate document content against the canonical schema from T01, and apply additional rules for `document` versus `design` physics without duplicating physics state into the document itself.
2. Extend `src/document/store.ts` and any needed `src/config/store.ts` exports so callers can validate a document at the workspace boundary and receive actionable file/path-aware diagnostics.
3. Add `tests/document/document-validation.test.ts` covering matching physics success, mismatched physics rejection, missing-config handling, and at least one failure assertion that checks the surfaced diagnostic text or path context.
4. Add `scripts/verify-s02-document-smoke.mjs` to create temp workspaces with real `sfrb.config.json` and document files, then assert pass/fail behavior through the built code path rather than mocked validators.

## Must-Haves

- [ ] Validation reads `workspace.physics` from `sfrb.config.json` instead of storing a second source of truth in the document.
- [ ] Document and design workspaces produce meaningfully different validation outcomes against real document inputs.
- [ ] Failure output includes enough path/context for a future agent to localize the problem quickly.
- [ ] Smoke coverage proves the contract works from real temp-workspace files, not only from direct function calls.

## Verification

- `npm test -- --run tests/document/document-validation.test.ts`
- `node scripts/verify-s02-document-smoke.mjs`

## Observability Impact

- Signals added/changed: workspace-physics mismatch errors, missing-config diagnostics, and document file path context on validation failures.
- How a future agent inspects this: run the document validation tests or the smoke script and inspect the named config/document paths plus field-level error output.
- Failure state exposed: whether failure came from structural schema rejection, missing workspace config, or a physics-specific rule conflict.

## Inputs

- `src/document/schema.ts` — canonical document structure and shared types from T01.
- `src/document/store.ts` — document file contract and file-boundary helpers from T01.
- `src/config/store.ts` — validated access to `sfrb.config.json` and `workspace.physics` from S01.
- T01 output — generated `schema.json` and strict runtime schema should already be in place before physics-aware validation is layered on.

## Expected Output

- `src/document/validation.ts` — physics-aware validation entrypoints built on the canonical document schema.
- `tests/document/document-validation.test.ts` — regression coverage for physics-sensitive acceptance/rejection and diagnostics.
- `scripts/verify-s02-document-smoke.mjs` — temp-workspace proof that real on-disk inputs satisfy the slice demo.
