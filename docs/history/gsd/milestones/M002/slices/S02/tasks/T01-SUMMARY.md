---
id: T01
parent: S02
milestone: M002
provides:
  - Canonical editor action schemas, parser helpers, and a pure apply layer for block-text and frame-box edits.
key_files:
  - src/editor/actions.ts
  - tests/document/editor-actions.test.ts
  - src/document/schema.ts
key_decisions:
  - Keep the initial action union intentionally narrow and discriminated: `replace_block_text` and `set_frame_box`, each targeting canonical stable ids.
patterns_established:
  - Action modules should expose Zod schema + parsed TS types + explicit parse/apply errors with `{path,message}` issues, matching existing config/document boundaries.
observability_surfaces:
  - src/editor/actions.ts
  - tests/document/editor-actions.test.ts
  - EditorActionParseError / EditorActionApplicationError issue arrays
duration: 1h
verification_result: passed
completed_at: 2026-03-16T17:27:00-07:00
blocker_discovered: false
---

# T01: Define the canonical editor action contract and pure apply layer

**Added the first canonical editor action union and a pure document apply layer, with targeted tests proving stable-id parsing, mutation, and failure diagnostics.**

## What Happened

I inspected the existing document schema, LayoutConsultant Zod style, and document/bridge test conventions first so the new boundary matched local patterns.

I then added `src/editor/actions.ts` with:
- a discriminated Zod union for `replace_block_text` and `set_frame_box`
- exported parsed/input TS types
- `parseEditorAction(...)` and `safeParseEditorAction(...)`
- `EditorActionParseError` for schema failures with `{ path, message }` issues
- `EditorActionApplicationError` for unknown canonical target ids with explicit failure codes and issues
- a pure `applyEditorAction(document, action)` implementation that updates only the targeted block text or frame box and preserves unrelated document content

To support shared typing without duplicating box shape definitions, I added a minimal `Box` export in `src/document/schema.ts`.

I added `tests/document/editor-actions.test.ts` covering:
- valid parsing for both action kinds
- invalid payload diagnostics
- successful application for both action kinds
- missing block id failure
- missing frame id failure
- preservation of unrelated content during application

## Verification

Passed:
- `npm test -- --run tests/document/editor-actions.test.ts`
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-document-mode.test.ts`
- `npm test -- --run tests/web/editor-design-mode.test.ts`

Observed during slice-level verification:
- `npm test -- --run tests/web/editor-layout-consultant.test.ts` failed in one existing runtime case with a 30s timeout in the “missing consultant secret” test, while the other consultant tests passed.
- `node scripts/verify-s02-editor-actions.mjs` failed because the script does not exist yet; that work is planned for T04.

## Diagnostics

Future agents can inspect:
- `src/editor/actions.ts` for the canonical action schemas, helper parsers, and apply logic
- `tests/document/editor-actions.test.ts` for executable proof of valid parsing, invalid payload diagnostics, missing-target failures, and preservation of unrelated document content
- `EditorActionParseError.issues` and `EditorActionApplicationError.issues` for localized failure reasons in `{ path, message }` form

## Deviations

None.

## Known Issues

- `tests/web/editor-layout-consultant.test.ts` has one existing timeout in the missing-secret runtime scenario; this task did not modify consultant runtime behavior.
- `scripts/verify-s02-editor-actions.mjs` is still absent and remains to be implemented in T04.

## Files Created/Modified

- `src/editor/actions.ts` — new canonical action schemas, types, parser helpers, and pure apply logic
- `tests/document/editor-actions.test.ts` — focused contract tests for parsing, application, and failure paths
- `src/document/schema.ts` — added the minimal exported `Box` type used by the action layer
