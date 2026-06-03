---
id: T02
parent: S02
milestone: M002
provides:
  - Widened `/__sfrb/editor` to accept canonical `{ action }` mutations and persist them through the existing read → apply → validate → write boundary while preserving the legacy `{ document }` path.
key_files:
  - src/bridge/server.mjs
  - tests/bridge/bridge-editor-contract.test.ts
  - web/src/bridge-client.ts
  - tests/utils/bridge-browser.ts
key_decisions:
  - Added a distinct `action_invalid` bridge mutation code so callers can differentiate malformed or non-applicable structured actions from invalid resulting documents without changing the overall error envelope.
patterns_established:
  - Bridge mutation routes can widen incrementally by resolving request variants into one canonical candidate document, then reusing the shared validation and persistence boundary before any disk write.
observability_surfaces:
  - `/__sfrb/editor` mutation responses now distinguish `action_invalid`, `document_invalid`, and `physics_invalid`; `tests/bridge/bridge-editor-contract.test.ts` exercises both success and failure paths.
duration: 1h
verification_result: passed
completed_at: 2026-03-16T17:33:00-07:00
blocker_discovered: false
---

# T02: Widen the bridge mutation route to accept structured actions with validation-safe persistence

**Shipped structured bridge mutations through the canonical document store while keeping the legacy whole-document save path alive.**

## What Happened

I widened `src/bridge/server.mjs` so `/__sfrb/editor` now accepts either `{ action }` or `{ document }`. For `{ action }` payloads, the bridge now reads the current workspace document from the normal store, parses the shared editor action, applies it with `applyEditorAction(...)`, then runs the same schema + physics validation boundary before calling `writeDocument(...)`.

To keep diagnostics agent-usable, I treated action parse failures and missing-target application failures as first-class bridge mutation failures and surfaced them with the existing error envelope plus a new `code: 'action_invalid'`. That preserves the current response shape while making invalid structured actions distinguishable from invalid resulting documents and physics failures.

I also updated the shared web bridge typings in `web/src/bridge-client.ts` to describe structured editor actions and added a `submitBridgeEditorAction(...)` helper for the browser migration work in T03. The bridge test helper now posts either `{ action }` or `{ document }` payloads, and the bridge contract test was expanded to cover successful text/frame actions, invalid action payload rejection, missing-target rejection, bootstrap/disk round-trip, and one retained legacy whole-document `physics_invalid` case.

## Verification

Task-level verification passed:

- `npx vitest run tests/bridge/bridge-editor-contract.test.ts` ✅
- `npx vitest run tests/document/editor-actions.test.ts` ✅

Slice-level verification run during this task:

- `npx vitest run tests/web/editor-document-mode.test.ts` ✅
- `npx vitest run tests/web/editor-design-mode.test.ts` ✅
- `npx vitest run tests/web/editor-layout-consultant.test.ts` ⚠️ 2/3 tests passed; the existing “missing consultant secret” scenario timed out after 30s
- `node scripts/verify-s02-editor-actions.mjs` ⚠️ not present yet in this worktree (expected later under T04)

Behavior confirmed by the updated bridge contract:

- structured `replace_block_text` actions persist and round-trip through `/__sfrb/bootstrap`
- structured `set_frame_box` actions persist and round-trip through disk
- invalid action payloads return localized action-schema issues
- missing target ids return localized action-application issues
- legacy whole-document writes still work and still return `physics_invalid` without partial persistence

## Diagnostics

Future agents can inspect this work by:

- posting to `/__sfrb/editor` with `{ action }` or `{ document }`
- checking the mutation `code` field for `action_invalid`, `document_invalid`, or `physics_invalid`
- reading `tests/bridge/bridge-editor-contract.test.ts` for executable success/failure examples
- reading `web/src/bridge-client.ts` for the shared bridge mutation payload/result typing

## Deviations

- The task plan asked for a structured-action `physics_invalid` rejection case, but the current T01 action union (`replace_block_text`, `set_frame_box`) cannot create a physics-invalid topology: it can only edit block text or move an already-valid frame box. I therefore preserved explicit `physics_invalid` coverage on the retained legacy `{ document }` path and added structured-action failure coverage for the two new actionable failure modes that are currently possible: action-schema rejection and missing-target rejection.

## Known Issues

- `tests/web/editor-layout-consultant.test.ts` still has one timed-out “missing consultant secret” scenario during slice verification; I did not change consultant behavior in this task.
- `scripts/verify-s02-editor-actions.mjs` does not exist yet in this worktree; T04 is the planned smoke-proof task for that gap.

## Files Created/Modified

- `src/bridge/server.mjs` — widened `/__sfrb/editor` to resolve `{ action }` and legacy `{ document }` mutations through one canonical validation/persistence path.
- `tests/bridge/bridge-editor-contract.test.ts` — expanded the bridge contract to cover structured action success/failure cases plus retained legacy behavior.
- `web/src/bridge-client.ts` — added structured editor action types and a bridge action submit helper.
- `tests/utils/bridge-browser.ts` — widened the mutation test helper to post either action or document payloads.
