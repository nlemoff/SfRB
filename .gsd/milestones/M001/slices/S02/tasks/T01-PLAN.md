---
estimated_steps: 4
estimated_files: 5
---

# T01: Define the strict document contract and exported schema artifact

**Slice:** S02 — Universal Doc Model
**Milestone:** M001

## Description

Establish the canonical SfRB document boundary before physics-specific rules are layered on top. This task defines the universal JSON shape in one strict Zod schema, exports TS types from that same source, names the on-disk document file contract for later slices, and checks in a generated `schema.json` artifact so runtime validation and published schema stay aligned.

## Steps

1. Define `src/document/schema.ts` with a strict root document model that keeps semantic content and spatial layout separate but linked through stable identifiers, and export the inferred TS types plus any schema helpers needed by downstream code.
2. Add `src/document/store.ts` to centralize the document file boundary: default document filename/path constant, read/write helpers, and path-aware parse failures that match the project’s existing config-store style.
3. Add generation/check wiring in `package.json` so `schema.json` is derived from the canonical Zod schema rather than hand-edited.
4. Add `tests/document/document-schema.test.ts` to assert strict unknown-key rejection, semantic-to-layout linking expectations, stable file-boundary serialization, and `schema.json` parity via the new check command.

## Must-Haves

- [ ] The document contract uses strict object semantics so runtime parsing does not silently drop unknown keys.
- [ ] The default workspace document file contract is explicit and reusable by later slices.
- [ ] `schema.json` is generated from the canonical schema source and has an executable alignment check.
- [ ] Tests exercise the real document file boundary, not only isolated in-memory schema snippets.

## Verification

- `npm test -- --run tests/document/document-schema.test.ts`
- `npm run schema:check`

## Inputs

- `src/config/store.ts` — reuse its path-aware file-boundary validation/error style.
- `package.json` — extend the existing script/test surface instead of adding a separate toolchain.
- S02 research — the contract must avoid `z.object()` stripping behavior and keep semantic content separate from spatial layout.

## Expected Output

- `src/document/schema.ts` — canonical strict document schema and exported types.
- `src/document/store.ts` — explicit document file contract plus read/write helpers.
- `schema.json` — checked-in JSON Schema artifact emitted from the canonical schema.
- `tests/document/document-schema.test.ts` — regression coverage for contract strictness and schema-artifact alignment.
