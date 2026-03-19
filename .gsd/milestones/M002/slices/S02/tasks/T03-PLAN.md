---
estimated_steps: 4
estimated_files: 6
---

# T03: Move browser commit paths and consultant acceptance onto the shared action route

**Slice:** S02 — Canonical Editor Action Model
**Milestone:** M002

## Description

Finish the slice’s user-visible integration by switching the browser from whole-document persistence to canonical actions. This task should preserve current editor behavior while routing committed text edits, committed frame moves, and consultant-accepted frame resize through the shared action boundary.

Relevant skill to load before implementation: `test`.

## Steps

1. Add or update browser bridge helpers so the web app can submit structured editor actions and keep current save-status/error handling intact.
2. Update the editor engine’s commit paths so optimistic draft text and drag state remain browser-local, but final text commits and frame-box commits dispatch the canonical action payloads instead of posting recomposed documents.
3. Rework consultant preview acceptance to persist through the same frame-box action route used by manual design edits, while leaving the consultant request path itself non-mutating.
4. Re-run and adjust the shipped browser regression tests only where necessary so they prove user-visible behavior stays the same even though persistence now flows through actions.

## Must-Haves

- [ ] Browser text commits persist via `set_block_text`/equivalent canonical action semantics without changing the existing editing UX.
- [ ] Browser frame movement and consultant-accepted resize both persist via the shared frame-box action path.
- [ ] No browser-only state such as selection, draft text, or drag intermediates is written into the canonical document during the migration.

## Verification

- `npm test -- --run tests/web/editor-document-mode.test.ts`
- `npm test -- --run tests/web/editor-design-mode.test.ts`
- `npm test -- --run tests/web/editor-layout-consultant.test.ts`

## Observability Impact

- Signals added/changed: browser save-status transitions and bridge mutation payloads now reflect structured action commits instead of whole-document writes.
- How a future agent inspects this: use the existing browser tests, inspect `/__sfrb/bootstrap` after saves, or watch network calls to `/__sfrb/editor` while editing.
- Failure state exposed: remaining full-document callers, consultant-accept drift, or save/refetch mismatches become visible at the real browser runtime boundary.

## Inputs

- `src/editor/actions.ts` from T01 — canonical action types and semantics the browser must target.
- `src/bridge/server.mjs` and `web/src/bridge-client.ts` from T02 — action-capable bridge route and client helper surface.
- `web/src/editor/engine.ts` and `web/src/App.tsx` — current commit points for text, frame movement, and consultant acceptance.

## Expected Output

- `web/src/bridge-client.ts` — browser helper for posting structured editor actions.
- `web/src/editor/engine.ts` — action-based commit logic for text and frame edits.
- `web/src/App.tsx` — consultant accept path switched to the same canonical action route.
- `tests/web/editor-document-mode.test.ts`, `tests/web/editor-design-mode.test.ts`, `tests/web/editor-layout-consultant.test.ts` — regression proof that the runtime behavior still holds after migration.