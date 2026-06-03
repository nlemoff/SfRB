---
id: S03
parent: M002
milestone: M002
provides:
  - Fine-grained tile persistence over the canonical resume model, including split provenance, frame groups, lock state, browser tile interactions, and built-runtime proof that grouped tile compositions persist without drift.
requires:
  - S02
affects:
  - S06
  - S07
key_files:
  - src/document/schema.ts
  - src/document/validation.ts
  - src/document/starters.ts
  - src/editor/actions.ts
  - src/bridge/server.mjs
  - web/src/bridge-client.ts
  - web/src/editor/engine.ts
  - web/src/editor/Canvas.tsx
  - web/src/App.tsx
  - tests/document/editor-actions.test.ts
  - tests/document/starter-documents.test.ts
  - tests/bridge/bridge-editor-contract.test.ts
  - tests/web/editor-tile-mode.test.ts
  - tests/web/editor-design-mode.test.ts
  - scripts/verify-s03-tile-engine.mjs
  - schema.json
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M002/M002-ROADMAP.md
key_decisions:
  - Reuse the existing design-backed block+frame model as the first tile primitive instead of inventing a third workspace physics mode or browser-only tile store.
  - Persist grouping/locking canonically at `layout.frameGroups`, and persist split provenance on derived semantic blocks so split/group state survives browser, bridge, and CLI/runtime boundaries.
  - Keep multi-select and drag preview state browser-session-local while persisting locked composition movement only as one canonical `translate_frame_group` action.
patterns_established:
  - Tile behavior should remain one-action pure transforms that validate back through the canonical document boundary before any write reaches disk.
  - Starter assembly, browser tile interactions, and built-runtime proof should all observe the same grouped/split canonical state through `/__sfrb/bootstrap` and `resume.sfrb.json`.
  - Slice-closing runtime proof should execute the real split → group → lock → translate path against the built `dist/cli.js open` runtime and then prove an invalid action causes no bootstrap or disk drift.
observability_surfaces:
  - `layout.frameGroups`
  - semantic block `split` provenance
  - `/__sfrb/editor`
  - `/__sfrb/bootstrap`
  - `resume.sfrb.json`
  - `#tile-toolbar`
  - `#editor-selected-frame-count`
  - `#editor-selected-group`
  - `#editor-selected-group-lock`
  - `#editor-last-action-kind`
  - per-frame split/group badges
  - tests/web/editor-tile-mode.test.ts
  - scripts/verify-s03-tile-engine.mjs
  - .gsd/milestones/M002/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S03/tasks/T03-SUMMARY.md
  - .gsd/milestones/M002/slices/S03/tasks/T04-SUMMARY.md
duration: ~6h
verification_result: passed
completed_at: 2026-03-16 19:00 PDT
blocker_discovered: false
---

# S03: Tile Engine & Group Locking

**Shipped fine-grained tile editing over the canonical resume model: users can split tiles, group and lock them into larger compositions, drag locked groups as one canonical action, and trust the shipped runtime because grouped tile state now round-trips cleanly through `/__sfrb/editor`, `/__sfrb/bootstrap`, and `resume.sfrb.json`.**

## What Happened

S03 made the middle interaction model real without breaking M002’s one-engine promise.

At the document boundary, `src/document/schema.ts` and `src/document/validation.ts` gained the first canonical tile persistence model. Split tiles are still real semantic blocks and design frames, but derived blocks now carry split provenance and grouped tiles now persist as `layout.frameGroups` with explicit membership, page, and lock invariants. That kept tile editing inside the existing canonical resume model instead of introducing a browser-only sidecar or a third workspace physics mode.

On top of that model, `src/editor/actions.ts` expanded the action surface with `split_block`, `create_frame_group`, `remove_frame_group`, `set_frame_group_locked`, and `translate_frame_group`. Splits atomically replace one block/frame pair with ordered derived pairs; groups enforce one-group-per-frame and single-page membership; locked-group translation moves the composition as one canonical action and rejects invalid or unlocked paths with explicit diagnostics.

S03 then connected that model to real product surfaces. `src/document/starters.ts` now opens the design template with pre-assembled locked frame groups so the shipped starter already behaves like a composed resume rather than a loose pile of blocks. `src/bridge/server.mjs` and `web/src/bridge-client.ts` carried the full tile action contract through the shared `/__sfrb/editor` path, preserving the same read → parse → apply → validate → write boundary introduced by S02.

The browser surface completed the loop. `web/src/editor/engine.ts`, `web/src/editor/Canvas.tsx`, and `web/src/App.tsx` now expose a real tile lens in design mode with split, group, lock, and locked-drag affordances. Multi-select and drag previews stay browser-local, but the persisted truth is still one canonical action at a time. The UI also exposes stable state for selected-count, selected-group, lock state, split/group badges, and last action kind so later reconciliation work can inspect tile behavior without guessing.

T04 retired the main tile risk at the shipped runtime boundary. `scripts/verify-s03-tile-engine.mjs` now builds the app, opens a real design workspace through `dist/cli.js open`, drives split → group → lock → translate through `/__sfrb/editor`, confirms `/__sfrb/bootstrap` and `resume.sfrb.json` converge on the same grouped state, and proves an invalid tile action returns `action_invalid` diagnostics without any write drift. That is the fine-grained tile contract S06 later preserves during mode reconciliation.

## Verification

Passed:
- `npm test -- --run tests/document/editor-actions.test.ts`
- `npm test -- --run tests/document/starter-documents.test.ts`
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-design-mode.test.ts`
- `npm test -- --run tests/web/editor-tile-mode.test.ts`
- `node scripts/verify-s03-tile-engine.mjs`

Built-runtime proof confirmed:
- the shipped design template carries canonical assembled frame-group state
- `split_block`, `create_frame_group`, `set_frame_group_locked`, and `translate_frame_group` persist through the real `/__sfrb/editor` path
- locked-group movement saves as one canonical translate action rather than per-frame drift
- `/__sfrb/bootstrap` and `resume.sfrb.json` converge after grouped tile mutations
- invalid tile actions return actionable `action_invalid` diagnostics and do not mutate bootstrap or disk state

## Requirements Advanced

- R007 — materially advanced by making the shipped template an actually assembled tile composition rather than just starter text.
- R012 — materially advanced by establishing tile grouping/locking invariants and observability surfaces that later reconciliation logic must preserve.
- R009 — materially advanced by widening the canonical action surface to cover tile split/group/lock/translate semantics.

## Requirements Validated

- R015 — validated. S03 now proves fine-grained tile split, grouping, locking, and locked-composition movement through document tests, bridge persistence checks, browser tile interaction tests, and the shipped `node scripts/verify-s03-tile-engine.mjs` runtime proof.

## New Requirements Surfaced

- None.

## Requirements Invalidated or Re-scoped

- None.

## Deviations

- The slice plan referenced `scripts/verify-s03-tile-engine.mjs` before it existed; T03 documented the mismatch and T04 closed it by adding the verifier rather than treating the earlier absence as an implementation regression.

## Known Limitations

- The first shipped tile primitive is still the existing block+frame model; richer decomposition strategies can be explored later, but the current shipped path is intentionally conservative and canonical.
- Cross-lens reconciliation behavior for grouped/locked compositions remains for S06; S03 establishes the grouped state and invariants, not the final freeform-exit policy.

## Follow-ups

- S06 should treat `layout.frameGroups`, split provenance, and locked-group translate semantics as canonical invariants to preserve during text/tile/freeform reconciliation.
- S07 should reuse the same canonical tile action shapes when proving direct CLI parity instead of introducing tile-specific command semantics.

## Files Created/Modified

- `src/document/schema.ts` — added canonical frame-group schema, split provenance, and related exported types.
- `src/document/validation.ts` — extended physics-aware validation for grouped design layout state.
- `src/document/starters.ts` — added pre-assembled canonical frame groups to the design template starter.
- `src/editor/actions.ts` — added split/group/lock/translate action schemas and apply logic.
- `src/bridge/server.mjs` — persisted tile actions through the shared bridge mutation path and exposed `actionKind` observability.
- `web/src/bridge-client.ts` — mirrored the tile action contract and grouped/split document typing.
- `web/src/editor/engine.ts` — added browser-local multi-select, selected-group state, and locked-group drag preview/commit behavior.
- `web/src/editor/Canvas.tsx` — added tile toolbar, split/group/lock badges, and grouped drag behavior.
- `web/src/App.tsx` — updated tile-lens product copy and added `#editor-last-action-kind` observability.
- `tests/document/editor-actions.test.ts` — proved canonical split/group/lock/translate semantics and failure paths.
- `tests/document/starter-documents.test.ts` — proved starter assembly and grouped template output.
- `tests/bridge/bridge-editor-contract.test.ts` — proved tile action persistence and invalid-action no-write behavior.
- `tests/web/editor-tile-mode.test.ts` — proved the browser split → group → lock → locked-drag flow through canonical action payloads.
- `tests/web/editor-design-mode.test.ts` — preserved broader design-mode regression coverage while the tile surface expanded.
- `scripts/verify-s03-tile-engine.mjs` — added built-runtime proof for successful grouped tile mutations plus invalid-action no-write behavior.
- `schema.json` — regenerated the JSON Schema for the updated canonical document model.
- `.gsd/REQUIREMENTS.md` — marked R015 validated and recorded the shipped runtime proof.
- `.gsd/milestones/M002/M002-ROADMAP.md` — marked S03 complete.

## Forward Intelligence

### What the next slice should know
- The safest tile model was the conservative one: reuse the canonical block+frame document shape and extend it with split provenance and frame groups, rather than inventing a parallel tile store.
- The real product proof for tile work is not just browser interaction; it is grouped state surviving bridge bootstrap and disk round-trip through the built runtime.
- The design template now already contains canonical starter groups, so later mode-reconciliation work can reason about real grouped compositions from first-run state.

### What's fragile
- Group invariants matter: one-group-per-frame, single-page grouping, and locked-group translation as one action are what keep tile state coherent. Loosening any of those casually will create downstream reconciliation ambiguity.
- Browser multi-select and drag preview are intentionally session-local. Persisting gesture noise instead of only final grouped actions would undermine the clean canonical model S03 established.

### Authoritative diagnostics
- `tests/web/editor-tile-mode.test.ts` — best browser-level proof that the shipped tile UX really emits canonical split/group/lock/translate actions.
- `node scripts/verify-s03-tile-engine.mjs` — fastest truthful end-to-end proof that grouped tile state survives the shipped runtime without bootstrap/disk drift.
- `/__sfrb/editor` `actionKind` plus `/__sfrb/bootstrap` `layout.frameGroups` — authoritative live signals for what tile action just persisted and what canonical grouped state now exists.

### What assumptions changed
- “Tiles may need a separate persistence model to feel real” — in practice, the existing design block+frame model could carry the first shipped tile engine cleanly once split provenance and frame groups were added.
- “Starter templates can stay text-first until later” — in practice, the template needed real assembled grouped state to satisfy the milestone’s immediate-value promise and give later slices truthful grouped compositions to work from.
