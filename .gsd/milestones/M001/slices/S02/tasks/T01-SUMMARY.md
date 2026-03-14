---
id: T01
parent: S02
milestone: M001
provides:
  - Canonical strict document schema, workspace document store boundary, and checked-in schema artifact generation/checking.
key_files:
  - src/document/schema.ts
  - src/document/store.ts
  - schema.json
  - tests/document/document-schema.test.ts
  - package.json
key_decisions:
  - Reused the existing config-store error style for document validation via path-aware document parse/validation error messages.
  - Kept semantic content and layout placement separate in one strict schema, linked through stable IDs instead of embedding layout state into semantic blocks.
patterns_established:
  - Derive runtime validation, exported TypeScript types, and checked-in schema.json from the same Zod source of truth.
  - Reserve resume.sfrb.json as the shared workspace document filename for later CLI/web slices.
observability_surfaces:
  - schema.json, npm run schema:check, tests/document/document-schema.test.ts, and document-path error messages from src/document/store.ts
duration: ~15m
verification_result: passed
completed_at: 2026-03-13T23:46:00-07:00
blocker_discovered: false
---

# T01: Define the strict document contract and exported schema artifact

**Added the canonical strict SfRB document contract, the shared `resume.sfrb.json` file boundary, and generated `schema.json` from the same Zod source.**

## What Happened

Implemented `src/document/schema.ts` as the canonical strict document model using `z.strictObject(...)` throughout so unknown keys are rejected at runtime instead of stripped. The model keeps semantic content (`semantic.sections`, `semantic.blocks`) separate from spatial layout (`layout.pages`, `layout.frames`) and links them through stable identifiers with root-level cross-reference checks for missing/duplicate links.

Added `src/document/store.ts` to centralize the document boundary around `resume.sfrb.json`, including `getDocumentPath`, `readDocument`, `writeDocument`, `validateDocument`, plus path-aware `DocumentParseError` and `DocumentValidationError` surfaces patterned after `src/config/store.ts`.

Extended `package.json` with `schema:generate` and `schema:check`, then added `scripts/generate-schema.mjs` and `scripts/check-schema.mjs` so the checked-in `schema.json` is emitted from compiled canonical schema code instead of hand-editing.

Added `tests/document/document-schema.test.ts` to exercise the real file boundary for strict unknown-key rejection, semantic/layout link validation, invalid JSON path context, stable serialization to `resume.sfrb.json`, and `schema.json` parity via `npm run schema:check`.

Per the execution contract’s first-task rule, I also created explicit T02 placeholders (`tests/document/document-validation.test.ts` and `scripts/verify-s02-document-smoke.mjs`) so slice-level verification reports a concrete not-yet-implemented failure instead of missing files.

## Verification

Passed:
- `npm test -- --run tests/document/document-schema.test.ts`
- `npm run schema:check`
- `npm run build >/dev/null && node -e "import('./dist/document/store.js').then(async ({ readDocument }) => { try { await readDocument(process.cwd()) } catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(0) } process.exit(1) })"` → surfaced the expected `resume.sfrb.json` path on failure

Slice-level verification status after T01:
- ✅ `npm test -- --run tests/document/document-schema.test.ts`
- ❌ `npm test -- --run tests/document/document-validation.test.ts` (intentional T02 placeholder failure: `T02 not implemented yet`)
- ❌ `node scripts/verify-s02-document-smoke.mjs` (intentional T02 placeholder failure)
- ✅ `npm run schema:check`

## Diagnostics

Inspect the checked-in contract in `schema.json`.
Run `npm run schema:check` to detect runtime/schema drift.
Run `npm test -- --run tests/document/document-schema.test.ts` to inspect real file-boundary failures for unknown keys, invalid JSON, and broken semantic/layout references.
Document boundary errors surface the file path and field path via `DocumentParseError` / `DocumentValidationError` in `src/document/store.ts`.

## Deviations

Added explicit T02 placeholder verification files early so slice-level checks fail in a controlled, inspectable way instead of erroring due to missing files.
Added one extra regression for invalid JSON path-aware failure because the task required parse-failure behavior at the real document boundary.

## Known Issues

Physics-aware document validation is not implemented yet; the T02 placeholder test and smoke script intentionally fail until `src/document/validation.ts` and the workspace-physics integration are added.
The added slice-plan failure-path command currently demonstrates missing-file path context (`ENOENT`) rather than schema-validation formatting; richer physics/document diagnostics arrive in T02.

## Files Created/Modified

- `src/document/schema.ts` — canonical strict document schema, exported types, stable-ID/link checks, and JSON Schema helper.
- `src/document/store.ts` — `resume.sfrb.json` boundary constants plus read/write/validate helpers and path-aware errors.
- `schema.json` — checked-in JSON Schema artifact generated from the canonical Zod schema.
- `scripts/generate-schema.mjs` — emits `schema.json` from built document schema code.
- `scripts/check-schema.mjs` — verifies `schema.json` parity with the canonical runtime schema.
- `tests/document/document-schema.test.ts` — real document-boundary regression coverage for strictness, linking, serialization, and schema parity.
- `tests/document/document-validation.test.ts` — intentional T02 placeholder so slice verification exposes the next missing behavior explicitly.
- `scripts/verify-s02-document-smoke.mjs` — intentional T02 placeholder smoke entrypoint.
- `package.json` — added schema generation/check scripts.
- `.gsd/milestones/M001/slices/S02/S02-PLAN.md` — marked T01 complete and added an explicit failure-path verification step during pre-flight.
