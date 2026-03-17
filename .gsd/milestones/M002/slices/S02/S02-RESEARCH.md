# S02: Canonical Editor Action Model — Research

**Date:** 2026-03-16

## Summary

S02 primarily owns **R009**. The codebase already has the right seam for it: the browser editor is not a free-for-all DOM toy, it already centralizes meaningful edit intents in `web/src/editor/engine.ts` (`startEditing`/`updateDraft`/`commitActive`, `updateFrameBox`/`commitFrameMove`) and sends them through one validated bridge route. The missing piece is that the bridge contract still accepts only **whole-document writes** (`{ document }` to `/__sfrb/editor`), so the canonical control surface is the final JSON blob rather than the intent that produced it.

The best path is to add a shared **intent-level action contract** and a pure action-application layer, then widen the existing `/__sfrb/editor` route to accept structured actions without breaking the current whole-document path during migration. That lets S02 retire the action-model risk now, keeps the canonical document boundary intact, and gives S03/S04/S05 a real shared mutation surface instead of each slice inventing its own browser-only rules.

A key finding: the only persisted browser edits that exist today are already narrow and stable — block text replacement, frame box updates, and consultant-accepted frame resize. That means S02 should define the first action union around **current meaningful persisted edits**, not speculative future tile/freeform operations. Downstream slices can extend the union; they should not have to replace it.

## Recommendation

Implement a shared canonical action module and migrate browser commits to it in-place:

1. **Add a discriminated union of editor actions** in a new shared module (likely `src/editor/actions.ts` or `src/document/actions.ts`). Start with the actions the product already truly supports:
   - `set_block_text` / `replace_block_text` — `{ blockId, text }`
   - `set_frame_box` — `{ frameId, box }`
   - optionally a small envelope field like `origin: 'browser' | 'cli' | 'consultant'` if observability is useful, but do not make origin required for correctness.
2. **Add a pure `applyEditorAction(document, action)` function** that returns the next document and uses stable ids already enforced by `src/document/schema.ts`.
3. **Widen `/__sfrb/editor`** in `src/bridge/server.mjs` to accept either legacy `{ document }` or canonical `{ action }`. For actions, the bridge should read the current workspace document, apply the action, run the existing schema + physics validation, and persist through `writeDocument`.
4. **Move browser persistence to actions**, not full-document writes. `web/src/editor/engine.ts` should still keep optimistic draft/drag state locally, but final commits should call `submitBridgeEditorAction(...)` instead of composing and posting an entire document.
5. **Also move consultant accept** in `web/src/App.tsx` to the same action path. The consultant request route stays separate and non-mutating; only preview acceptance becomes a canonical action.

This approach matches the existing code shape and preserves product direction. It keeps the action layer mostly invisible in the normal UI, reuses the current trusted validation boundary, and gives S07 a real shared command target later without forcing S02 to design the final CLI UX now.

## Implementation Landscape

### Key Files

- `web/src/editor/engine.ts` — best existing map of real browser edit intents. It already distinguishes draft text editing, commit timing, selection, and frame-box movement. This is the main browser-side file to migrate from whole-document composition to action dispatch.
- `web/src/bridge-client.ts` — current shared browser contract layer. It defines `BridgeDocument`, bootstrap payloads, save status store, and `submitBridgeDocumentMutation(document)`. S02 should add action types here plus `submitBridgeEditorAction(action)`.
- `src/bridge/server.mjs` — `/__sfrb/editor` currently accepts only `{ document }`, validates it with `validateMutationDocument`, and writes it. This is the canonical route to widen, not replace.
- `src/document/schema.ts` — authoritative stable-id and document invariants. S02 should not add browser session state here; actions should target this document model, then reuse current validation.
- `src/document/store.ts` — trusted read/write boundary. The action route should continue to end here after applying an action.
- `src/document/validation.ts` — workspace physics guard. Action-applied documents must still pass `validateDocumentForPhysics(...)` before persistence.
- `web/src/App.tsx` — consultant preview acceptance currently composes a whole candidate document via `composeFrameResizeCandidate(...)` and posts it. That acceptance path should become an action dispatch.
- `src/agent/LayoutConsultant.ts` — good local pattern for Zod schemas, contract parsing, and action-safe validation. Its `rawLayoutResizeProposalSchema`/`parseLayoutConsultantRequest` structure is the closest existing example of the style S02 should follow.
- `tests/bridge/bridge-editor-contract.test.ts` — current canonical mutation proof for whole-document writes. This should gain action-route coverage and probably keep one legacy whole-document test until migration is complete.
- `tests/web/editor-document-mode.test.ts` — strongest shipped proof for text editing through the real runtime. It should keep passing unchanged from the user’s perspective after action migration.
- `tests/web/editor-design-mode.test.ts` — strongest shipped proof for frame movement + linked text editing. It should remain the browser-level regression test once commits go through actions.
- `tests/web/editor-layout-consultant.test.ts` — verifies accept/reject behavior for consultant previews. Useful for proving that accept now uses the canonical action route without changing product behavior.
- `scripts/verify-s02-document-smoke.mjs` — currently proves physics/document validation only; it does not prove the S02 action-model deliverable despite its name. It should be replaced or supplemented with an actual structured-action smoke check.
- `src/cli.ts` / `src/commands/*` — there are only `init` and `open` commands today. S02 should prepare a reusable action boundary for S07 rather than hand-rolling final CLI editing commands prematurely.

### Natural Seams

1. **Shared action contract + pure apply logic**
   - New module for Zod schemas, TS types, parsing, and `applyEditorAction`.
   - Independent of browser UI.
2. **Bridge route widening**
   - Update `/__sfrb/editor` request parsing to support `{ action }` alongside `{ document }`.
   - Reuse existing validation/persistence and error formatting.
3. **Browser migration**
   - Change `engine.ts` commit methods and `App.tsx` consultant accept to dispatch actions.
   - UI behavior should stay the same.
4. **Verification / smoke refresh**
   - Add action-focused tests and replace the misleading S02 smoke script with one that proves action application through the built runtime.

### Build Order

1. **Define and test the action contract first.**
   - This is the slice’s real deliverable and the dependency for every downstream editing mode.
   - Prove parsing and pure application for current persisted edits before touching browser code.
2. **Widen the bridge route with backward compatibility.**
   - This lets the browser migrate incrementally and keeps current tests green while the action path lands.
3. **Switch browser commits to actions.**
   - Migrate `commitActive`, `commitFrameMove`, and consultant accept once the bridge accepts actions.
4. **Refresh verification.**
   - Keep the existing user-observable browser tests, but add direct bridge contract tests for structured actions and a real S02 smoke script.

### Verification Approach

Contract-level:
- Add unit tests for the new action schema and pure application logic.
  - parse valid/invalid actions
  - reject unknown action kinds / missing ids
  - apply `set_block_text`
  - apply `set_frame_box`
  - preserve unrelated document content
- Keep validation after apply: resulting documents should still fail path-safely through existing schema/physics guards when appropriate.

Bridge-level:
- Extend `tests/bridge/bridge-editor-contract.test.ts` to POST `{ action }` to `/__sfrb/editor` and verify:
  - success returns the usual canonical response shape
  - bootstrap shows the updated document
  - disk state matches bootstrap
  - invalid action payloads surface actionable path diagnostics
  - physics-invalid action results still produce `physics_invalid`
- Keep at least one legacy `{ document }` contract test during migration unless the browser is fully switched in the same task.

Browser/runtime:
- Re-run existing high-value browser tests unchanged:
  - `npm test -- --run tests/web/editor-document-mode.test.ts`
  - `npm test -- --run tests/web/editor-design-mode.test.ts`
  - `npm test -- --run tests/web/editor-layout-consultant.test.ts`
- Their continued success proves the UI still feels the same while using the new action path internally.

Operational / smoke:
- Replace or supplement `scripts/verify-s02-document-smoke.mjs` with an action-specific smoke verifier that uses the built runtime to:
  - create/open a workspace
  - send a structured text-edit action
  - send a structured frame-box action in design mode
  - re-read bootstrap/disk state to confirm both persisted canonically

## Constraints

- The canonical document remains `resume.sfrb.json`; S02 must not introduce hidden persisted browser state outside that file.
- `/__sfrb/bootstrap` is already the authoritative browser truth after save/refetch. Do not create a second source of truth for action results.
- `src/document/validation.ts` physics rules must still run after every action application; action support cannot bypass document/document-physics validation.
- The current CLI has no editing commands yet. S02 should create the shared action boundary that S07 can invoke, not prematurely design the final CLI UX.
- The existing browser engine uses optimistic local overrides and debounced commits. The action model should represent **final meaningful commits**, not raw keystroke/pointer streams.

## Common Pitfalls

- **Modeling actions at DOM-event granularity** — `keydown`, `input`, and `pointermove` are too low-level. The engine already tells you the right granularity: committed text replacement and committed frame-box update.
- **Persisting selection into the canonical document** — current selection is UI/session state in `DocumentEditorSnapshot`, not canonical resume content. Do not pollute `resume.sfrb.json` just to make “selection” look parity-friendly.
- **Breaking migration by removing whole-document writes too early** — widen `/__sfrb/editor` first, then migrate browser callers. The current runtime/tests depend on the old path until that migration finishes.
- **Overfitting action names to today’s UI wording** — names like `set_block_text` and `set_frame_box` are future-proof enough for S03/S04/S05. Avoid action names tied to “document mode” or “design mode” because the action surface needs to outlive those specific lenses.
- **Treating consultant accept as special** — the non-mutating consultant request is special; the final persistence step is not. Accepting a preview should become the same canonical frame-box action as a manual drag.

## Open Risks

- The main unresolved modeling question is whether S02 should include a first-class non-persisting “selection” action now or leave selection as browser-local until a downstream slice truly needs cross-surface selection semantics. The current codebase does not persist selection anywhere, so forcing it into S02 may add noise rather than retire risk.
- Future S03/S05 actions will likely add tile/group/freeform element operations. The initial union should stay narrow but must be organized as an extensible discriminated union, not a hard-coded pair of one-off helper functions.
- If action responses need richer observability later (affected ids, normalized values, action echo), add that in the shared result shape rather than leaking debug chrome into `web/src/App.tsx`.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| React | `vercel-labs/agent-skills@vercel-react-best-practices` | available via `npx skills add`; not installed |
| TypeScript / test ergonomics | `github/awesome-copilot@javascript-typescript-jest` | available via `npx skills add`; not installed |
| Advanced TypeScript typing | `wshobson/agents@typescript-advanced-types` | available via `npx skills add`; not installed |

No installed skill in the current catalog directly matched this Node/Vite/React bridge-contract slice closely enough to be worth loading before exploration.
