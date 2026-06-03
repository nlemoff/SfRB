---
id: M002
provides:
  - A real product-shaped resume editor with template or blank starts, guided text/tile/freeform lenses over one canonical resume model, explicit mode reconciliation, and direct CLI invocation of the same structured mutation surface.
key_decisions:
  - Keep text, tile, and freeform as guided browser lenses over one canonical engine rather than separate editors or document stores.
  - Represent meaningful edits as canonical structured actions shared by bridge and CLI paths, while keeping transient UI gesture state browser-local.
  - Preserve geometry continuity and require explicit Freeform-exit reconciliation instead of silently auto-reflowing or rewriting layout.
patterns_established:
  - Milestone-closeout proof should re-run the shipped build plus milestone smoke scripts and confirm bootstrap/disk parity after both success and no-write paths.
  - New editing capabilities should land only after they exist simultaneously at the canonical action layer, the bridge/runtime boundary, and a truthful shipped-runtime verifier.
observability_surfaces:
  - `node scripts/verify-s01-first-run.mjs`
  - `node scripts/verify-s02-editor-actions.mjs`
  - `node scripts/verify-s03-tile-engine.mjs`
  - `node scripts/verify-s04-editor-smoke.mjs`
  - `node scripts/verify-s05-freeform-smoke.mjs`
  - `node scripts/verify-s06-mode-reconciliation-smoke.mjs`
  - `node scripts/verify-s07-cli-parity-smoke.mjs`
  - `/__sfrb/bootstrap`
  - `/__sfrb/editor`
  - `resume.sfrb.json`
  - `#editor-last-action-kind`
  - `#workspace-inspector`
requirement_outcomes:
  - id: R007
    from_status: active
    to_status: validated
    proof: S01 proved real template and blank starter workspaces through `node scripts/verify-s01-first-run.mjs`, and S03 completed the “tiles already assembled into a full resume” portion with canonical starter frame groups plus `node scripts/verify-s03-tile-engine.mjs`.
  - id: R008
    from_status: active
    to_status: validated
    proof: `node scripts/verify-s04-editor-smoke.mjs`, `node scripts/verify-s05-freeform-smoke.mjs`, and `node scripts/verify-s06-mode-reconciliation-smoke.mjs` prove Text, Tile, and Freeform as guided lenses over one canonical model with clear runtime observability.
  - id: R009
    from_status: active
    to_status: validated
    proof: S02 established the shared canonical action boundary and S07’s `node scripts/verify-s07-cli-parity-smoke.mjs` proved direct `dist/cli.js edit` parity for text, layout, and reconciliation actions plus a blocked no-write path.
  - id: R010
    from_status: active
    to_status: validated
    proof: S01’s AI-optional init/open flow plus `node scripts/verify-s01-first-run.mjs` proved a non-technical user can replace starter content and get immediate value without configuring AI.
  - id: R012
    from_status: active
    to_status: validated
    proof: `node scripts/verify-s06-mode-reconciliation-smoke.mjs` proved explicit `rejoin_layout` and no-write `keep_locked` Freeform-exit outcomes plus carried overflow continuity without silent layout rewrites.
  - id: R014
    from_status: active
    to_status: validated
    proof: `node scripts/verify-s05-freeform-smoke.mjs` proved element-level Freeform manipulation for canonical frame-backed objects plus a blocked/no-write locked-member path.
  - id: R015
    from_status: active
    to_status: validated
    proof: `node scripts/verify-s03-tile-engine.mjs` proved split → group → lock → locked-group translate persistence through `/__sfrb/editor`, `/__sfrb/bootstrap`, and `resume.sfrb.json` with invalid-action no-write behavior.
duration: ~2 days
verification_result: passed
completed_at: 2026-03-16 17:16 PDT
---

# M002: Resume Engine & Guided Editing

**Turned the M001 foundation into a real guided resume editor: users can start from a strong template or blank canvas, edit through text/tile/freeform lenses over one canonical model, reconcile modes explicitly, and invoke the same meaningful mutations from the browser or the CLI.**

## What Happened

M002 converted SfRB from a promising local-first editing foundation into the first product-shaped resume engine.

S01 established truthful entry points. `sfrb init` now creates a real template or blank starter workspace even when AI is skipped, starter identity lives in canonical document/bootstrap state, and `sfrb open` lands on guidance that explains the three editing lenses in product language instead of dropping the user into developer diagnostics.

S02 then created the milestone’s core seam: a canonical structured action contract shared by browser and bridge persistence. That replaced browser-authored whole-document writes with targeted canonical mutations, widened `/__sfrb/editor` to accept `{ action }`, and gave every later slice a trustworthy parse/apply/validate/write boundary. It also exposed and fixed a real drag-persistence trust bug while the save path was being moved onto actions.

With that seam in place, S03, S04, and S05 made the three editing lenses real rather than aspirational. S03 kept tiles inside the canonical document model by adding split provenance and `layout.frameGroups`, then shipped browser split/group/lock/translate behavior plus a starter template that already opens as an assembled resume composition. S04 added a calm Text lens that works in both document and design workspaces while still committing canonical content and structure edits. S05 shipped Freeform as a real element-editing lens over canonical page frames with blocked locked-member drags surfaced as visible no-write diagnostics instead of silent failure.

S06 closed the three-mode trust contract. Leaving Freeform for Text or Tile is now an explicit reconciliation step whose meaningful outcome is itself canonical: free-moved compositions can rejoin layout logic or intentionally stay locked, and the shell/canvas surfaces make the chosen policy, resulting status, and any carried overflow continuity inspectable. This retired the biggest milestone risk: the editor no longer behaves like three unrelated tools competing over the same resume.

S07 closed the last parity gap and finished the product posture. The same canonical actions are now directly invokable through `dist/cli.js edit` with inline JSON, action-file, or stdin input, and the browser shell defaults to an editing-first posture with bridge/AI/consultant diagnostics demoted behind the collapsed workspace inspector. That completed the milestone’s scriptability goal while materially improving the non-technical-user feel.

As an integrated whole, M002 now delivers one canonical local-first editor that can be entered from a starter template or blank canvas, shaped through three guided lenses, inspected through stable runtime surfaces, and controlled from either the browser or the CLI without forking the product into separate editing models.

## Cross-Slice Verification

Milestone closeout re-checked the shipped runtime from `/home/nlemo/SfRB/.gsd/worktrees/M002` with:

- `npm run build` ✅
- `node scripts/verify-s01-first-run.mjs` ✅
- `node scripts/verify-s02-editor-actions.mjs` ✅
- `node scripts/verify-s03-tile-engine.mjs` ✅
- `node scripts/verify-s04-editor-smoke.mjs` ✅
- `node scripts/verify-s05-freeform-smoke.mjs` ✅
- `node scripts/verify-s06-mode-reconciliation-smoke.mjs` ✅
- `node scripts/verify-s07-cli-parity-smoke.mjs` ✅

Success criteria re-check:

- **A user can open a starter template or blank canvas and begin editing immediately.** Met. `node scripts/verify-s01-first-run.mjs` passed for both template and blank starters and confirmed the guidance-first shell plus canonical save/refetch persistence.
- **A non-technical user can replace template content and get immediate basic value without configuring AI.** Met. The same S01 verifier proved AI-skipped starter workspaces, editable starter content, and canonical persistence without AI configuration.
- **The editor exposes clear, straightforward direction on how to use text mode, tile mode, and freeform mode.** Met. S01 shipped guidance-first shell copy from canonical bootstrap state, and the live runtime continued to expose those lens surfaces while the later smoke scripts for S04-S06 passed.
- **Fine-grained tiles can be split, moved, grouped, and locked into larger resume compositions.** Met. `node scripts/verify-s03-tile-engine.mjs` passed and proved split → group → lock → translate persistence plus invalid-action no-write behavior.
- **Freeform mode supports element-level editing for real page objects, not just coarse section dragging.** Met. `node scripts/verify-s05-freeform-smoke.mjs` passed and proved successful element movement plus blocked locked-member drag diagnostics.
- **Switching between text, tile, and freeform modes uses explicit reconciliation rules that preserve trust.** Met. `node scripts/verify-s06-mode-reconciliation-smoke.mjs` passed and proved explicit `rejoin_layout`, no-write `keep_locked`, and carried overflow continuity behavior.
- **Every meaningful editor action is representable as a structured mutation and invokable from the CLI.** Met. `node scripts/verify-s07-cli-parity-smoke.mjs` passed and proved direct `dist/cli.js edit` parity for representative text, layout, and reconciliation actions plus a blocked no-write path.
- **The shipped editor feels materially sleeker, more minimalist, and less raw than M001.** Met as milestone evidence, while still remaining an ongoing quality attribute. S07’s real-browser/UAT check plus the collapsed-by-default `#workspace-inspector` posture showed the default shell is now editing-first rather than diagnostics-first.

Definition of done re-check:

- **All slice deliverables are complete.** Passed. S01-S07 are marked complete in `.gsd/milestones/M002/M002-ROADMAP.md`.
- **All slice summaries exist.** Passed. `S01-SUMMARY.md` through `S07-SUMMARY.md` now exist under `.gsd/milestones/M002/slices/`.
- **Template and blank-canvas starts are real and exercised through the shipped runtime.** Passed by S01 closeout and the rerun `node scripts/verify-s01-first-run.mjs`.
- **Text mode, tile mode, and freeform mode all operate over one canonical document model.** Passed by the combined S03-S06 runtime verifiers and canonical bootstrap/disk convergence.
- **Mode switches use explicit reconciliation rules that are inspectable and proven through live behavior.** Passed by the rerun S06 verifier.
- **The canonical action model is shared by browser and CLI editing surfaces.** Passed by S02 plus S07 runtime proof.
- **The non-AI editing loop works end-to-end for a non-technical user.** Passed by S01 runtime proof.
- **Success criteria were re-checked against live behavior, not just artifacts.** Passed via the full rerun build + smoke verification stack above.
- **The final integrated acceptance scenarios pass through the shipped runtime.** Passed; the combined milestone smoke stack completed successfully.

Criteria not met: none.

## Requirement Changes

- R007: active → validated — `node scripts/verify-s01-first-run.mjs` proved real template and blank starts through the shipped runtime, and `node scripts/verify-s03-tile-engine.mjs` proved the starter template carries canonical assembled tile/group state.
- R008: active → validated — `node scripts/verify-s04-editor-smoke.mjs`, `node scripts/verify-s05-freeform-smoke.mjs`, and `node scripts/verify-s06-mode-reconciliation-smoke.mjs` jointly proved the three guided lenses over one canonical model.
- R009: active → validated — S02 established the shared action boundary and `node scripts/verify-s07-cli-parity-smoke.mjs` proved direct CLI invocation parity.
- R010: active → validated — `node scripts/verify-s01-first-run.mjs` proved the AI-optional first-run editing loop for a non-technical user.
- R012: active → validated — `node scripts/verify-s06-mode-reconciliation-smoke.mjs` proved explicit, inspectable mode reconciliation and no-write trust paths.
- R014: active → validated — `node scripts/verify-s05-freeform-smoke.mjs` proved element-level Freeform editing and blocked/no-write locked-member behavior.
- R015: active → validated — `node scripts/verify-s03-tile-engine.mjs` proved split/group/lock/translate tile persistence and invalid-action no-write behavior.

## Forward Intelligence

### What the next milestone should know
- The strongest product seam is now the canonical action boundary plus bootstrap reconciliation. M003 export work should consume that one canonical model rather than introducing export-only intermediate representations.
- The shipped runtime smoke stack is now the most trustworthy regression harness for cross-slice behavior. If export or presentation work changes layout, rerun the full S01-S07 verifier chain, not just new export tests.
- Starter templates now carry real grouped layout state, Text/Tile/Freeform are all first-class lenses, and explicit reconciliation decisions can leave a composition either rejoined or intentionally locked. Export logic must respect those states rather than flattening them away.

### What's fragile
- Layout trust still depends on preserving canonical-vs-local boundaries: drag previews, drafting, and transient UI state may stay local, but persisted geometry/content/reconciliation outcomes must continue to round-trip only through canonical actions and `/__sfrb/bootstrap`.
- The current product-polish win in R011 is real but still qualitative. New export or presentation chrome could easily re-clutter the shell if technical diagnostics drift back into the primary surface.

### Authoritative diagnostics
- `node scripts/verify-s07-cli-parity-smoke.mjs` — best single proof that the shipped CLI and canonical action model are still aligned.
- `node scripts/verify-s06-mode-reconciliation-smoke.mjs` — best proof that grouped/freeform continuity and no-write trust behavior still hold after layout-related changes.
- `/__sfrb/bootstrap` and `resume.sfrb.json` — authoritative state pair for checking whether browser/CLI/export behavior is converging on one canonical document or drifting.

### What assumptions changed
- “Three editing modes might need separate persistence logic to feel good” — in practice, one canonical action/document model plus browser-local transient state produced a more trustworthy editor than parallel save paths would have.
- “A non-technical-user-first product and CLI/agent parity pull in opposite directions” — in practice, the milestone succeeded by making the browser calmer while strengthening, not weakening, the structured action surface underneath.

## Files Created/Modified

- `.gsd/milestones/M002/M002-SUMMARY.md` — final milestone closeout record with live verification, requirement outcomes, and forward intelligence.
- `.gsd/milestones/M002/slices/S02/S02-SUMMARY.md` — backfilled slice summary for the canonical action-model slice.
- `.gsd/milestones/M002/slices/S03/S03-SUMMARY.md` — backfilled slice summary for the tile engine/group locking slice.
- `.gsd/REQUIREMENTS.md` — updated R007 to validated based on shipped-runtime proof.
- `.gsd/PROJECT.md` — updated project state to reflect M002 completion and M003 readiness.
- `.gsd/STATE.md` — advanced the GSD state beyond M002 execution and toward M003 planning.
