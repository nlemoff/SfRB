---
estimated_steps: 4
estimated_files: 5
---

# T02: Widen the bridge mutation route to accept structured actions with validation-safe persistence

**Slice:** S02 — Canonical Editor Action Model
**Milestone:** M002

## Description

Turn the new action contract into a real canonical persistence path. This task should widen `/__sfrb/editor` so structured actions flow through the existing read → apply → validate → persist boundary, while keeping the legacy whole-document write path alive until browser callers are migrated.

Relevant skill to load before implementation: `test`.

## Steps

1. Update the bridge editor-route request parsing to accept either `{ action }` or legacy `{ document }`, keeping the response shape and existing error envelope stable for current callers.
2. For action payloads, read the current workspace document from the normal store, apply the shared action, run the existing schema and physics validation pipeline, and persist only if validation succeeds.
3. Keep failure localization strong: invalid action payloads should surface action-schema diagnostics, and physics-invalid resulting documents should still return the existing `physics_invalid` style signals instead of partially writing state.
4. Extend bridge contract tests to cover successful text and frame actions, bootstrap/disk round-trip after action application, invalid action payload rejection, physics-invalid action rejection, and one retained legacy whole-document mutation case during migration.

## Must-Haves

- [ ] `/__sfrb/editor` accepts structured `{ action }` payloads without creating a second persistence route outside the canonical document store.
- [ ] Existing schema and physics validation still run after action application and block invalid resulting documents from being written.
- [ ] The legacy `{ document }` mutation path remains covered long enough to support incremental browser migration.

## Verification

- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- Manually inspect the updated bridge test to confirm it exercises both success and failure paths for structured actions plus one legacy document-write case.

## Observability Impact

- Signals added/changed: bridge diagnostics can now distinguish invalid action payloads from invalid resulting documents.
- How a future agent inspects this: hit `/__sfrb/editor`, read the error response, or run `tests/bridge/bridge-editor-contract.test.ts`.
- Failure state exposed: action-parse failure, missing target ids, and physics-invalid action results become inspectable without diffing entire documents.

## Inputs

- `src/editor/actions.ts` from T01 — shared parser and pure apply logic the bridge must call.
- `src/bridge/server.mjs` — current `/__sfrb/editor` whole-document route to widen rather than replace.
- `src/document/store.ts` and `src/document/validation.ts` — trusted read/write and physics validation boundaries that must remain authoritative.

## Expected Output

- `src/bridge/server.mjs` — widened editor route supporting both `{ action }` and `{ document }` payloads.
- `tests/bridge/bridge-editor-contract.test.ts` — canonical bridge proof for structured actions, failure diagnostics, and legacy-path compatibility.
- `web/src/bridge-client.ts` — shared request/response typing updated to include the structured action payload shape.