# S06 Summary — Mode Reconciliation & Layout Policies

S06 closed M002’s three-lens trust contract. The slice keeps the active lens browser-local, but makes the meaningful Freeform-exit outcome canonical, inspectable, and later CLI-invokable. A user can now leave Freeform through an explicit policy choice, see whether the composition stayed locked or rejoined structured layout logic, and inspect the persisted outcome through `#editor-last-action-kind`, `/__sfrb/bootstrap`, and `resume.sfrb.json`.

## What Shipped

- **Canonical reconciliation action:** `reconcile_freeform_exit` persists only the meaningful exit outcome (`keep_locked` vs `rejoin_layout`) and returns structured reconciliation metadata plus actionable no-write diagnostics.
- **Explicit Freeform exit flow:** leaving Freeform for Text or Tile now pauses for an explicit policy choice when grouped content is selected.
- **Visible transition summary:** the shell and canvas mirror pending target lens, chosen policy, target group, summary state, and continuity notes through stable selectors.
- **Honest overflow continuity:** Tile ↔ Freeform switches preserve geometry and keep measured overflow / placement risk visible instead of silently auto-reflowing.
- **Shipped-runtime proof:** `scripts/verify-s06-mode-reconciliation-smoke.mjs` now proves the built `dist/cli.js open` loop for:
  - successful `rejoin_layout` reconciliation
  - no-write `keep_locked` reconciliation with visible diagnostics
  - carried overflow continuity without canonical write drift

## Final Evidence

### Runtime proof passed

Ran from the worktree root:

- `npm run build` ✅
- `node scripts/verify-s04-editor-smoke.mjs` ✅
- `node scripts/verify-s05-freeform-smoke.mjs` ✅
- `node scripts/verify-s06-mode-reconciliation-smoke.mjs` ✅

Observed shipped-runtime proof from the new S06 verifier:

- `success:` explicit Freeform exit through `rejoin_layout` left `#editor-last-action-kind` at `reconcile_freeform_exit` and unlocked `frameGroup1` in both `/__sfrb/bootstrap` and `resume.sfrb.json`
- `no-write:` explicit `keep_locked` exit still surfaced `reconcile_freeform_exit`, showed a no-write summary, and kept bootstrap plus `resume.sfrb.json` byte-stable
- `continuity:` Tile → Freeform kept overflow visible through the shell/canvas continuity surfaces without mutating canonical layout state

### Requirement status after S06

- **R008** validated — the shipped runtime now proves Text, Tile, and Freeform as intentional lenses over one canonical model.
- **R012** validated — mode switches now use explicit, understandable reconciliation with built-runtime proof for success, no-write, and continuity paths.

## Primary Inspection Surfaces

- `src/editor/actions.ts` — canonical reconciliation action, metadata, and `reconciliation_not_needed` diagnostics
- `web/src/bridge-client.ts` — shared browser contract for reconciliation actions/results
- `web/src/App.tsx` — guarded Freeform exit flow and shell summary state
- `web/src/editor/Canvas.tsx` — transition strip and continuity observability
- `web/src/editor/engine.ts` — derived reconciliation/overflow state exposed to the UI
- `#mode-reconciliation-panel` — summary state, pending target, policy, and group
- `#editor-mode-transition-strip` — canvas summary/continuity state
- `#editor-last-action-kind` — canonical action observability at runtime
- `/__sfrb/bootstrap` — persisted bridge payload after each mode-transition outcome
- `resume.sfrb.json` — final canonical disk state
- `scripts/verify-s06-mode-reconciliation-smoke.mjs` — authoritative shipped-runtime smoke verifier for S06

## Verification Caveat

The built-runtime smoke stack now passes, but the rooted worktree Vitest suites that boot temporary design workspaces still fail before bridge readiness with:

- `layout: Unrecognized key: "frameGroups"`

This blocker reproduces across `tests/bridge/bridge-editor-contract.test.ts` and the S06 browser suites when run with `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 ...`. It did **not** block the truthful shipped-runtime proof added in this slice, but it remains an unresolved test-harness/startup mismatch to clear when tightening post-slice verification.

## Files of Record

- `scripts/verify-s06-mode-reconciliation-smoke.mjs`
- `.gsd/REQUIREMENTS.md`
- `.gsd/milestones/M002/M002-ROADMAP.md`
- `.gsd/milestones/M002/slices/S06/tasks/T01-SUMMARY.md`
- `.gsd/milestones/M002/slices/S06/tasks/T02-SUMMARY.md`
- `.gsd/milestones/M002/slices/S06/tasks/T03-SUMMARY.md`
- `.gsd/milestones/M002/slices/S06/tasks/T04-SUMMARY.md`
