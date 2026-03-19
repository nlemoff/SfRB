---
estimated_steps: 4
estimated_files: 4
---

# T01: Define the canonical editor action contract and pure apply layer

**Slice:** S02 — Canonical Editor Action Model
**Milestone:** M002

## Description

Create the action boundary that the rest of the slice depends on. This task should define the first narrow but extensible canonical editor action union, back it with shared parsing/typing, and prove a pure action-application function can mutate the canonical resume document by stable ids without touching browser-only state.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect the current document schema and any existing Zod contract style used by validated boundaries so the new action module matches project conventions and future slices can extend it cleanly.
2. Add a shared action module that exports Zod schemas, parsed TS types, helper parsers, and a pure `applyEditorAction(document, action)` implementation for the two meaningful persisted edits that exist today: committed block-text replacement and committed frame-box updates.
3. Keep the contract intentionally narrow and canonical: target stable ids already enforced by the document model, preserve unrelated document content, and do not add session-only state such as selection or raw keystroke/pointer streams.
4. Add focused document-level tests covering valid parsing, invalid parsing, successful application, unknown target ids, and preservation of unrelated content so later bridge/browser work can trust this module.

## Must-Haves

- [ ] The shared action module defines a discriminated union that can be extended by later slices instead of being hard-coded to one-off helpers.
- [ ] `applyEditorAction` mutates canonical document state only for the targeted block or frame and leaves unrelated content untouched.
- [ ] Invalid action kinds, missing required fields, and missing target ids fail with actionable diagnostics rather than silent no-ops.

## Verification

- `npm test -- --run tests/document/editor-actions.test.ts`
- Confirm the test file covers both action kinds plus at least one invalid-payload and one missing-target failure path.

## Observability Impact

- Signals added/changed: structured action kind parsing and action-application failure reasons become explicit and testable.
- How a future agent inspects this: read `src/editor/actions.ts` or run `tests/document/editor-actions.test.ts`.
- Failure state exposed: malformed action payloads and missing canonical ids become localizable before bridge/browser integration.

## Inputs

- `src/document/schema.ts` — canonical document ids and structure the new action targets must rely on.
- `src/agent/LayoutConsultant.ts` — existing Zod parsing style to mirror for path-aware contracts.
- `S02-RESEARCH.md` summary — action scope is intentionally limited to current meaningful persisted edits, not speculative future tile/freeform operations.

## Expected Output

- `src/editor/actions.ts` — shared action schemas, types, parser helpers, and pure apply logic.
- `tests/document/editor-actions.test.ts` — executable proof that canonical actions parse and apply correctly.
- `src/document/schema.ts` or related shared types — only the minimal exports needed to support stable action targeting.