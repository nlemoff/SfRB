---
estimated_steps: 4
estimated_files: 5
---

# T01: Add canonical text-structure actions for writing-first edits

**Slice:** S04 — Text Mode as Real Writing Surface
**Milestone:** M002

## Description

Close the action-boundary gap first. This task should extend the shared editor action contract so text mode can do the first genuinely useful writing-structure operations—add, remove, and reorder content—without inventing browser-only mutations or breaking design-workspace validation.

Relevant skill to load before implementation: `test`.

## Steps

1. Inspect the current S02 action contract and the semantic block/section model so the new text-structure action set stays minimal and consistent with existing canonical edit patterns.
2. Add a writing-first structure action set in `src/editor/actions.ts` for the minimum useful text operations: inserting a block near the active block, removing a supported block, and reordering blocks or sections where the current model can represent that change cleanly.
3. Preserve workspace invariants while applying those actions, especially design-workspace frame linkage, so structure edits still validate before persistence.
4. Thread the new actions through `web/src/bridge-client.ts` and add document/bridge tests covering successful apply paths plus invalid-action no-write behavior.

## Must-Haves

- [ ] The new text-mode structure operations are canonical editor actions, not browser-only document rewrites.
- [ ] Applying those actions leaves both document and design workspaces validation-safe, including linked-frame requirements for design physics.
- [ ] Invalid ids, malformed payloads, and unsupported remove/reorder targets fail with actionable diagnostics and no disk write.

## Verification

- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/document/editor-actions.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`

## Observability Impact

- Signals added/changed: canonical text action kinds, structure-target ids, and validation failures for unsupported text restructuring.
- How a future agent inspects this: read `src/editor/actions.ts`, inspect `web/src/bridge-client.ts`, or run the document/bridge tests.
- Failure state exposed: malformed structure payloads, missing targets, and design-frame invariant regressions become localizable at the shared action boundary.

## Inputs

- `src/editor/actions.ts` — current S02 action parser/apply contract that text-structure actions must extend.
- `src/document/validation.ts` — workspace-physics constraints that structure edits must continue to satisfy.
- `web/src/bridge-client.ts` — browser helper layer that mirrors the shared action contract.
- `S04-RESEARCH.md` and decision D033 — guidance to keep text lens local while making meaningful writing transforms canonical.

## Expected Output

- `src/editor/actions.ts` — minimal canonical text-structure action schemas, parsers, and apply logic.
- `web/src/bridge-client.ts` — client helpers/types for the new text actions.
- `src/document/validation.ts` — any validation updates required to keep structure edits safe.
- `tests/document/editor-actions.test.ts` and `tests/bridge/bridge-editor-contract.test.ts` — executable proof for successful apply paths and invalid-action no-write behavior.
