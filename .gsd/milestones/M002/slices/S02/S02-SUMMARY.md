---
id: S02
parent: M002
milestone: M002
provides:
  - A canonical structured editor action contract shared by browser and bridge/runtime persistence, with built-runtime proof that meaningful edits save through `/__sfrb/editor` and invalid actions fail without writing.
requires:
  - S01
affects:
  - S03
  - S04
  - S05
  - S06
  - S07
key_files:
  - src/editor/actions.ts
  - src/document/schema.ts
  - src/bridge/server.mjs
  - web/src/bridge-client.ts
  - web/src/editor/engine.ts
  - web/src/editor/Canvas.tsx
  - web/src/App.tsx
  - tests/document/editor-actions.test.ts
  - tests/bridge/bridge-editor-contract.test.ts
  - tests/web/editor-document-mode.test.ts
  - tests/web/editor-design-mode.test.ts
  - tests/web/editor-layout-consultant.test.ts
  - scripts/verify-s02-editor-actions.mjs
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M002/M002-ROADMAP.md
  - .gsd/KNOWLEDGE.md
key_decisions:
  - Keep the initial canonical action surface narrow and discriminated around meaningful persisted mutations instead of browser-local gesture state.
  - Widen `/__sfrb/editor` incrementally to accept `{ action }` payloads while preserving the legacy `{ document }` path and existing validation boundary.
  - Move browser commits and consultant-accept persistence onto shared action helpers while keeping draft text, drag previews, selection, and ghost state session-local.
  - Keep R009 active after S02 because the shared action/runtime boundary is proven here, but direct CLI invocation parity remains explicitly owned by S07.
patterns_established:
  - Meaningful editor mutations should exist as one canonical action schema + pure apply path + bridge/runtime persistence path before new browser UX is added.
  - Browser save code should emit narrow action payloads (`replace_block_text`, `set_frame_box`) and reconcile from `/__sfrb/bootstrap` rather than recomposing whole documents.
  - Built-runtime slice proof should drive the shipped `dist/cli.js open` loop, post canonical actions to `/__sfrb/editor`, and compare bootstrap plus `resume.sfrb.json` after both success and invalid-action flows.
observability_surfaces:
  - `/__sfrb/editor`
  - `/__sfrb/bootstrap`
  - `resume.sfrb.json`
  - `#editor-save-status`
  - `#bridge-payload-preview`
  - `EditorActionParseError` / `EditorActionApplicationError` issue arrays
  - tests/document/editor-actions.test.ts
  - tests/bridge/bridge-editor-contract.test.ts
  - scripts/verify-s02-editor-actions.mjs
  - .gsd/milestones/M002/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S02/tasks/T03-SUMMARY.md
  - .gsd/milestones/M002/slices/S02/tasks/T04-SUMMARY.md
duration: ~5h
verification_result: passed
completed_at: 2026-03-16 18:03 PDT
blocker_discovered: false
---

# S02: Canonical Editor Action Model

**Shipped the canonical mutation seam for M002: browser and bridge persistence now run through shared structured editor actions instead of browser-authored whole-document writes, and the shipped runtime now proves both saved and no-write action paths through `/__sfrb/editor`, `/__sfrb/bootstrap`, and `resume.sfrb.json`.**

## What Happened

S02 created the durable action boundary that every later M002 slice depends on.

At the contract layer, `src/editor/actions.ts` introduced the first canonical action union with explicit parsing and application semantics for `replace_block_text` and `set_frame_box`. The action layer follows the same discipline as the existing config/document boundary: Zod-backed parsing, localized `{ path, message }` issues, explicit application failures for missing canonical ids, and a pure apply step that only mutates the targeted part of the canonical document.

From there, the bridge runtime in `src/bridge/server.mjs` widened `/__sfrb/editor` to accept `{ action }` alongside the legacy `{ document }` path. Structured actions now flow through the same trusted read → parse → apply → validate → write boundary as every other canonical write, with `action_invalid` added as a distinct failure code so callers can tell malformed or non-applicable actions apart from invalid resulting documents.

The browser then moved onto that shared seam. `web/src/bridge-client.ts`, `web/src/editor/engine.ts`, `web/src/editor/Canvas.tsx`, and `web/src/App.tsx` now commit meaningful text edits, frame moves, and consultant-accepted frame changes as narrow canonical actions rather than recomposed whole documents. Draft text, drag previews, selection, and ghost state remain browser-local, but persisted changes now travel through the same canonical action layer future tile/freeform/CLI work will use.

That migration also surfaced and fixed a real persistence bug: frame drags had been compared against local drag overrides instead of canonical bridge state, which could make a real drag release look like a no-op until a later unrelated save accidentally persisted the geometry. Fixing that inside the new action-route migration made S02 more than a contract slice; it removed a trust leak in the actual runtime.

T04 closed the slice at the shipped runtime boundary. `scripts/verify-s02-editor-actions.mjs` now builds the app, opens a real workspace through `dist/cli.js open`, posts canonical text and frame actions to `/__sfrb/editor`, confirms `/__sfrb/bootstrap` and `resume.sfrb.json` converge on the new state, and proves an invalid action returns actionable `action_invalid` issues without any write drift. That is the seam S03-S07 build on.

## Verification

Passed:
- `npm test -- --run tests/document/editor-actions.test.ts`
- `npm test -- --run tests/bridge/bridge-editor-contract.test.ts`
- `npm test -- --run tests/web/editor-document-mode.test.ts`
- `npm test -- --run tests/web/editor-design-mode.test.ts`
- `npm test -- --run tests/web/editor-layout-consultant.test.ts`
- `node scripts/verify-s02-editor-actions.mjs`

Built-runtime proof confirmed:
- canonical `replace_block_text` persists through the shipped `/__sfrb/editor` path
- canonical `set_frame_box` persists through the shipped `/__sfrb/editor` path
- browser commits now emit action payloads instead of whole-document writes
- `/__sfrb/bootstrap` and `resume.sfrb.json` converge after successful action writes
- invalid action payloads return actionable `action_invalid` diagnostics and do not mutate bootstrap or disk state

## Requirements Advanced

- R009 — materially advanced by retiring the shared browser/runtime action-boundary portion of CLI/browser parity; direct CLI invocation remained intentionally open for S07.
- R008 — materially advanced by giving later text/tile/freeform lenses one canonical persisted mutation surface instead of separate browser-specific save paths.
- R012 — materially advanced because later reconciliation work can now persist meaningful mode-transition outcomes as inspectable structured actions rather than browser-only state.

## Requirements Validated

- None. S02 proves the canonical action boundary inside the bridge/browser runtime, but direct CLI invocation parity is still explicitly left to S07.

## New Requirements Surfaced

- None.

## Requirements Invalidated or Re-scoped

- None.

## Deviations

- Added `action_invalid` as a distinct bridge mutation code rather than overloading existing validation failures, so structured-action callers can tell action-shape/application failures apart from invalid resulting documents.
- Added `scripts/verify-s02-editor-actions.mjs` as a new focused runtime verifier instead of rewriting an older document-smoke script, so the new action proof stays explicit and inspectable.

## Known Limitations

- The shipped action surface is intentionally still narrow at this point; tile, freeform, and reconciliation actions arrive in later slices.
- Direct CLI invocation parity is not yet proven here and remains the explicit closeout work for S07.

## Follow-ups

- S03 should extend the same action/parser/apply/bridge pattern for tile split/group/lock behavior instead of inventing tile-only persistence seams.
- S04 and S05 should preserve the browser-local-vs-canonical boundary established here: session-local UI state may stay local, but every meaningful write should route through the shared action contract.
- S07 should reuse the same success/no-write shipped-runtime proof pattern at the direct `dist/cli.js edit` boundary.

## Files Created/Modified

- `src/editor/actions.ts` — defined the first canonical editor action schemas, parser helpers, and pure apply logic.
- `src/document/schema.ts` — exported shared `Box` typing used by the action layer.
- `src/bridge/server.mjs` — widened `/__sfrb/editor` to accept structured actions and return `action_invalid` diagnostics.
- `web/src/bridge-client.ts` — added shared structured-action typing and browser submit helpers.
- `web/src/editor/engine.ts` — moved browser persistence onto action commits and fixed canonical-vs-local drag no-op detection.
- `web/src/editor/Canvas.tsx` — tightened drag-settle commit wiring for canonical frame saves.
- `web/src/App.tsx` — routed consultant accept through the shared action seam and preserved explicit consultant request failures.
- `tests/document/editor-actions.test.ts` — proved parsing, application, and failure paths for the canonical action layer.
- `tests/bridge/bridge-editor-contract.test.ts` — proved structured bridge persistence and invalid-action no-write behavior.
- `tests/web/editor-document-mode.test.ts` — proved document-mode saves now post canonical action payloads.
- `tests/web/editor-design-mode.test.ts` — proved design-mode text/frame commits now post canonical action payloads.
- `tests/web/editor-layout-consultant.test.ts` — proved consultant accept now uses the shared frame action route.
- `scripts/verify-s02-editor-actions.mjs` — added built-runtime proof for successful text/frame actions plus invalid-action no-write behavior.
- `.gsd/REQUIREMENTS.md` — recorded S02 runtime evidence for R009 while keeping direct CLI parity open for S07.
- `.gsd/milestones/M002/M002-ROADMAP.md` — marked S02 complete.
- `.gsd/KNOWLEDGE.md` — recorded the worktree Vitest path gotcha and canonical-vs-local drag comparison bug.

## Forward Intelligence

### What the next slice should know
- The highest-value seam in M002 is now in place: every meaningful persisted edit should enter through one canonical action contract before any slice adds richer UX.
- The safest browser pattern is narrow action helpers over `/__sfrb/editor` plus bootstrap reconciliation, not browser-authored whole-document rewrites.
- The built-runtime proof pattern is already established: mutate through the shipped bridge, then compare `/__sfrb/bootstrap` and `resume.sfrb.json` after both success and invalid-action flows.

### What's fragile
- Frame-commit code must compare pending geometry against canonical bridge payload state, not local drag overrides — otherwise real drags can be misclassified as no-ops and only persist accidentally on later saves.
- Browser-local drafting/selection/preview state is intentionally separate from canonical state; future slices can easily blur that line and reintroduce hidden browser-only mutations if they are not disciplined.

### Authoritative diagnostics
- `tests/bridge/bridge-editor-contract.test.ts` — strongest in-process proof that structured action persistence and invalid-action no-write behavior work at the bridge boundary.
- `node scripts/verify-s02-editor-actions.mjs` — fastest truthful shipped-runtime confirmation that canonical text/frame actions persist without bootstrap/disk drift.
- `/__sfrb/editor` response `code`, `actionKind`, `name`, and `issues` — authoritative live signal for action success vs no-write failure.

### What assumptions changed
- “Browser saves can keep using whole-document writes while the action layer lands later” — in practice, meaningful browser commits had to migrate immediately or the product would keep a hidden second persistence model.
- “The action-contract slice is mostly schema work” — in practice, it also exposed a real runtime drag-persistence bug that only became obvious once commits went through narrow canonical actions.
