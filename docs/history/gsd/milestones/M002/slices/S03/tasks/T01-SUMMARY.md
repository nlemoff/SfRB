---
id: T01
parent: S03
milestone: M002
provides:
  - Canonical tile persistence via `layout.frameGroups` and minimal per-block split provenance.
  - Shared pure editor actions for split/group/lock/group-translate semantics with localized failures.
  - Contract tests proving design-valid atomic splits and loud invalid membership/target diagnostics.
key_files:
  - src/document/schema.ts
  - src/document/validation.ts
  - src/editor/actions.ts
  - tests/document/editor-actions.test.ts
  - schema.json
key_decisions:
  - Reused the existing design-backed block+frame model as the tile primitive, storing grouping at `layout.frameGroups` and split provenance on derived semantic blocks instead of adding a third physics mode.
patterns_established:
  - Canonical tile mutations remain one-action pure transforms that validate back through `parseDocument()` before they can leave the action layer.
  - Split actions replace one semantic block/frame pair with ordered derived block/frame pairs while preserving section order and updating any existing frame-group membership in one atomic document rewrite.
observability_surfaces:
  - src/editor/actions.ts
  - src/document/schema.ts
  - tests/document/editor-actions.test.ts
  - schema.json
  - EditorActionParseError / EditorActionApplicationError issue payloads
duration: 1h20m
verification_result: passed
completed_at: 2026-03-16 18:22 PDT
blocker_discovered: false
---

# T01: Add canonical tile/group schema and pure action semantics

**Added canonical persisted tile/group document state and pure split/group/lock/translate actions, with contract tests that prove design-valid atomic splits and loud localized failures.**

## What Happened

I extended the canonical document schema instead of inventing a tile-only side model. `src/document/schema.ts` now supports optional block split provenance (`split.sourceBlockId`, `strategy`, `index`, `count`) and persisted `layout.frameGroups` entries with strict membership/page invariants and one-group-per-frame enforcement.

In `src/document/validation.ts` I kept `workspace.physics` unchanged and made the design/document distinction explicit for the new layout metadata: document physics still forbids layout state, while design physics still requires one frame per semantic block and rejects underspecified groups.

In `src/editor/actions.ts` I expanded the shared action union from text/frame edits to include:
- `split_block`
- `create_frame_group`
- `remove_frame_group`
- `set_frame_group_locked`
- `translate_frame_group`

The split implementation atomically replaces one block+frame pair with ordered derived blocks+frames, rewrites the containing section’s `blockIds` in place, shifts later frame z-order predictably, and updates any existing frame-group membership that referenced the original frame. Group creation enforces existing-frame membership, single-page grouping, and no duplicate/overlapping membership. Locked-group translation moves all member frames by one delta and rejects unlocked groups explicitly. All action results are reparsed through the canonical document schema before returning so malformed result documents fail immediately with actionable diagnostics.

I then rewrote `tests/document/editor-actions.test.ts` to cover parsing and application for split/group/lock/translate semantics, section-order preservation, atomic frame creation for design physics, grouped-split membership rewriting, malformed payloads, missing targets, duplicate frame membership, and unlocked-group translation failures.

Because the canonical schema changed, I regenerated `schema.json` so the checked-in JSON Schema stayed aligned with the runtime contract.

## Verification

Primary task verification:
- `npm test -- --run tests/document/editor-actions.test.ts` ✅

Touched-contract regression checks:
- `npm test -- --run tests/document/document-schema.test.ts` ✅
- `npm run schema:check` ✅
- `npm test -- --run tests/document/starter-documents.test.ts` ✅
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts` ✅
- `npm test -- --run tests/web/editor-design-mode.test.ts` ✅

Slice-level checks tracked at this intermediate task boundary:
- `tests/document/editor-actions.test.ts` ✅
- `tests/document/starter-documents.test.ts` ✅
- `tests/bridge/bridge-editor-contract.test.ts` ✅
- `tests/web/editor-design-mode.test.ts` ✅
- `tests/web/editor-tile-mode.test.ts` ❌ not present yet (expected for later T03 work)
- `node scripts/verify-s03-tile-engine.mjs` ❌ not present yet (expected for later T04 work)

Verification note: the plan’s absolute-path Vitest command did not resolve correctly under `async_bash` in this worktree context, so I re-ran the same checks from the worktree with `bash` using relative `tests/...` filters.

## Diagnostics

Future agents can inspect:
- `src/document/schema.ts` for the canonical persisted tile/group shape and invariants
- `src/editor/actions.ts` for the authoritative tile action kinds and pure application semantics
- `tests/document/editor-actions.test.ts` for executable split/group/lock/translate examples and failure-path expectations
- `schema.json` for the generated external document contract

Failure surfaces now exposed locally:
- `EditorActionParseError.issues` for malformed tile payloads
- `EditorActionApplicationError.code` / `.issues` for missing blocks, missing frames, missing groups, unlocked-group translation, duplicate membership, and invalid result documents

## Deviations

None.

## Known Issues

- `tests/web/editor-tile-mode.test.ts` does not exist yet; that browser proof is planned for T03.
- `scripts/verify-s03-tile-engine.mjs` does not exist yet; the built-runtime tile verifier is planned for T04.

## Files Created/Modified

- `src/document/schema.ts` — added persisted frame-group schema, split provenance, new exported types, and canonical group/member validation.
- `src/document/validation.ts` — extended workspace-physics validation to account for frame groups alongside existing frame requirements.
- `src/editor/actions.ts` — added canonical tile/group action schemas, parse helpers, application logic, and invalid-result enforcement.
- `tests/document/editor-actions.test.ts` — replaced the old narrow action proof with focused split/group/lock/translate contract coverage.
- `schema.json` — regenerated checked-in JSON Schema to match the updated canonical document contract.
- `.gsd/KNOWLEDGE.md` — recorded the worktree-specific Vitest verification gotcha discovered during execution.
