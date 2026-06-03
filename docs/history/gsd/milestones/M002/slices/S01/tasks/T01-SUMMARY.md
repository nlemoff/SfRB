---
id: T01
parent: S01
milestone: M002
provides:
  - Canonical starter document factory plus durable starter metadata for template and blank workspace documents.
key_files:
  - src/document/starters.ts
  - src/document/schema.ts
  - tests/document/starter-documents.test.ts
  - tests/utils/bridge-browser.ts
  - schema.json
key_decisions:
  - Store shipped starter identity as optional document metadata so starter workspaces are inspectable without breaking existing non-starter documents.
  - Reuse one production starter factory in shared test helpers instead of keeping a second handwritten smallest-valid workspace shape.
patterns_established:
  - Starter documents are produced by createStarterDocument(kind, physics) and validated through the normal document/store boundary.
observability_surfaces:
  - resume.sfrb.json metadata.starter
  - tests/document/starter-documents.test.ts
  - schema.json
duration: ~12m
verification_result: passed
completed_at: 2026-03-14 03:13 PDT
blocker_discovered: false
---

# T01: Add canonical starter document factories and starter metadata

**Added one production starter factory for template/blank documents, stored starter identity in canonical document metadata, and moved the shared bridge workspace helper onto that factory.**

## What Happened

Added `src/document/starters.ts` with a single `createStarterDocument(kind, physics)` path plus convenience wrappers for template and blank starters. The blank starter stays intentionally small and preserves the existing `summaryBlock` / `summaryFrame` shape used across current tests, while the template starter now has stable section/block/frame ids and stronger default content for later targeting.

Extended `src/document/schema.ts` with optional `metadata.starter = { id, kind }`, keeping starter provenance inspectable in canonical state without forcing legacy/non-starter documents to adopt new metadata. Regenerated `schema.json` so the published schema stays aligned with runtime validation.

Updated `tests/utils/bridge-browser.ts` to materialize workspace documents from the production starter factory instead of duplicating a handwritten starter JSON shape. Added `tests/document/starter-documents.test.ts` to persist both starter variants through the real document/workspace boundary under both physics modes and assert metadata, schema validity, and physics validity.

## Verification

Passed:
- `npm test -- --run tests/document/starter-documents.test.ts`
- `npm run build`
- `npm run schema:generate`
- `npm test -- --run tests/document/document-schema.test.ts`
- `npm test -- --run tests/document/document-validation.test.ts`
- `npm test -- --run tests/cli/init-command.test.ts`

Slice-level checks not yet present in the repo:
- `npm test -- --run tests/web/editor-first-run-guidance.test.ts` → fails because the file does not exist yet (T03 scope)
- `node scripts/verify-s01-first-run.mjs` → fails because the script does not exist yet (T03 scope)

## Diagnostics

Inspect starter provenance directly in `resume.sfrb.json` under `metadata.starter.id` and `metadata.starter.kind`.

Re-run `tests/document/starter-documents.test.ts` to confirm both starter variants still validate under both `document` and `design` physics modes. If later work drifts starter ids, removes starter metadata, or breaks frame coverage, that test should fail at the document boundary.

## Deviations

None.

## Known Issues

The slice-level first-run browser guidance proof (`tests/web/editor-first-run-guidance.test.ts` and `scripts/verify-s01-first-run.mjs`) is still missing because that work belongs to T03.

## Files Created/Modified

- `src/document/starters.ts` — added the production starter factory and stable starter ids/content for template and blank variants.
- `src/document/schema.ts` — added optional canonical starter metadata to the document model.
- `tests/document/starter-documents.test.ts` — added matrix coverage for starter metadata, schema validity, and physics validity.
- `tests/utils/bridge-browser.ts` — switched shared workspace fixture generation to the production starter factory.
- `schema.json` — regenerated the published schema artifact to match runtime validation.
- `.gsd/DECISIONS.md` — appended the starter metadata placement/factory decision for downstream tasks.
- `.gsd/milestones/M002/slices/S01/S01-PLAN.md` — marked T01 complete.
