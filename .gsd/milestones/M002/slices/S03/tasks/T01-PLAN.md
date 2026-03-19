---
estimated_steps: 4
estimated_files: 4
---

# T01: Add canonical tile/group schema and pure action semantics

**Slice:** S03 — Tile Engine & Group Locking
**Milestone:** M002

## Description

Close the document-boundary risk first by giving tile behavior a canonical home. This task should extend the shared document/action model so splitting, grouping, locking, and locked-group translation are represented as persisted, validated intents over design-backed documents rather than browser-only fragments.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect the current design-physics document schema and S02 action module so the new tile/group shape extends existing conventions instead of inventing a parallel model.
2. Add explicit frame-group persistence to the canonical document schema, plus only the minimal split provenance needed for later inspection and reconciliation work.
3. Extend `src/editor/actions.ts` with shared tile actions for splitting blocks, creating/removing frame groups as needed, toggling group lock state, and translating a locked group as one action while preserving unrelated document state.
4. Add focused contract tests covering valid split/group/lock application, section-order preservation, atomic frame creation for design physics, and invalid payload or missing-target failures.

## Must-Haves

- [ ] The canonical document can represent grouped/locked tiles without adding a third persisted physics mode.
- [ ] Tile actions apply atomically: a split that creates new blocks also creates corresponding frames and leaves design documents valid.
- [ ] Invalid frame membership, duplicate membership, unknown ids, and malformed payloads fail loudly with actionable diagnostics.

## Verification

- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/editor-actions.test.ts`
- Confirm the test covers split, group, lock, and group-translate semantics plus at least one invalid-payload and one missing-target failure path.

## Observability Impact

- Signals added/changed: canonical tile action kinds, frame-group membership, and lock-state failures become explicit and testable.
- How a future agent inspects this: read `src/editor/actions.ts` / `src/document/schema.ts` or run `tests/document/editor-actions.test.ts`.
- Failure state exposed: malformed tile payloads, invalid resulting documents, and missing canonical ids become localizable before bridge/browser integration.

## Inputs

- `src/document/schema.ts` — current canonical block/frame/page model that the tile representation must extend.
- `src/document/validation.ts` — design-physics rule requiring every semantic block to have a frame.
- `src/editor/actions.ts` — S02 action union and pure-apply pattern that tile actions must extend rather than replace.
- `S03-RESEARCH.md` recommendation — keep tile mode as a design-lens extension over the canonical document instead of a new workspace physics mode.

## Expected Output

- `src/document/schema.ts` — persisted frame-group and any minimal split metadata added to the canonical document contract.
- `src/document/validation.ts` — validation rules enforcing the chosen tile/group invariants.
- `src/editor/actions.ts` — shared tile/group action schemas, types, parsers, and pure application logic.
- `tests/document/editor-actions.test.ts` — executable proof that tile/group actions parse and apply correctly.