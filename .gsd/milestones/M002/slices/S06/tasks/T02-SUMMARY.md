---
id: T02
parent: S06
milestone: M002
provides:
  - Explicit Freeform exit choice UI, canonical reconciliation wiring, and inspectable transition summary surfaces in the shell and canvas
key_files:
  - web/src/App.tsx
  - web/src/editor/Canvas.tsx
  - web/src/editor/engine.ts
  - tests/web/editor-mode-reconciliation.test.ts
  - tests/web/editor-first-run-guidance.test.ts
key_decisions:
  - Treat canonical `reconciliation_not_needed` responses as a no-write transition outcome that still completes the browser-local lens switch while surfacing the rejection explicitly
patterns_established:
  - Guard browser-local Freeform exits in `App`, post the canonical `reconcile_freeform_exit` action before completing Text/Tile switches, and mirror the pending/summary state into `Canvas` so agents can inspect it without logs
observability_surfaces:
  - `#mode-reconciliation-panel`
  - `#mode-reconciliation-pending-target`
  - `#mode-reconciliation-selected-policy`
  - `#mode-reconciliation-group`
  - `#editor-mode-transition-strip`
  - `#editor-pending-target-lens`
  - `#editor-selected-reconciliation-policy`
  - `#editor-transition-group-id`
  - `#editor-transition-summary`
  - `#editor-last-action-kind`
duration: ~2.5h
verification_result: partial
completed_at: 2026-03-16 23:27 PDT
blocker_discovered: false
---

# T02: Add an explicit Freeform exit flow and transition summary UI

**Added a guarded Freeform exit flow that forces an explicit stay-locked vs rejoin choice before leaving Freeform, then records the outcome in inspectable shell/canvas summary UI using the canonical reconciliation action from T01.**

## What Happened

I updated `web/src/App.tsx` so Text/Tile lens requests no longer silently leave Freeform when the selected Freeform element belongs to a frame group. Instead, the shell now pauses the lens switch, records the pending target lens, and presents explicit `Stay locked` and `Rejoin layout` choices. Those buttons call `submitBridgeReconcileFreeformExitAction()` from the shared bridge client, so the browser flow reuses the canonical T01 contract rather than inventing browser-only state.

The shell also now keeps a small reconciliation state machine in product language: pending target lens, chosen policy, target group, and a human-readable last transition summary. Successful canonical writes produce a “completed” summary, while canonical `reconciliation_not_needed` responses are treated as a visible **no-write** outcome that still completes the browser-local lens switch. Hard rejections keep the user in Freeform and surface the rejection instead of silently flipping lenses.

I extended `web/src/editor/engine.ts` with explicit snapshot fields for Freeform-exit relevance (`freeformExitGroupId`, `freeformExitGroupLocked`, `freeformExitRequired`) so the App shell can guard exits without peeking into DOM-only state.

I also updated `web/src/editor/Canvas.tsx` to expose the same transition telemetry inside the canvas chrome. The canvas now shows stable, agent-usable testids for pending target lens, selected policy, transition group id, and the last transition summary, so future browser checks can inspect S06 outcomes without reading developer logs.

For browser coverage, I added a focused `tests/web/editor-mode-reconciliation.test.ts` suite for:
- explicit Freeform exit interception
- successful `rejoin_layout` reconciliation
- rejected/no-write `keep_locked` reconciliation that still completes the lens switch

I also updated `tests/web/editor-first-run-guidance.test.ts` to preserve regression coverage for the new summary panel on first load.

## Verification

Passed:

- `npm test -- --run tests/web/editor-first-run-guidance.test.ts` ✅ (repo-root run; 2/2 passed)
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/document/editor-actions.test.ts` ✅
- `npm run build` ✅
- `node scripts/verify-s04-editor-smoke.mjs` ✅

Browser-verified on a live document workspace started from the built app:
- `http://127.0.0.1:4174` loaded successfully
- `mode-reconciliation-panel` rendered with idle product copy
- canvas transition strip rendered with idle pending-target / policy / summary surfaces
- direct DOM inspection confirmed:
  - `data-summary-state="idle"` on `#mode-reconciliation-panel`
  - `data-summary-state="idle"` on `#editor-transition-summary`
  - pending target text showed `Pending target · none`

Blocked / failed for pre-existing reasons outside this task’s UI wiring:

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-editor-contract.test.ts` ❌
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/web/editor-first-run-guidance.test.ts` ❌
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/web/editor-freeform-mode.test.ts` ❌
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/web/editor-layout-consultant.test.ts` ❌
- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/web/editor-mode-reconciliation.test.ts` ❌

All rooted bridge/web failures stopped before app readiness with the same pre-existing startup error:
- `resume.sfrb.json failed validation: - layout: Unrecognized key: "frameGroups"`

Slice verification extras:
- `node scripts/verify-s05-freeform-smoke.mjs` ❌ missing from repo/worktree
- `node scripts/verify-s06-mode-reconciliation-smoke.mjs` ❌ not created yet in this slice

## Diagnostics

Future agents can inspect this task through:

- `web/src/App.tsx` — guarded Freeform exit flow, policy buttons, no-write handling, and shell summary state
- `web/src/editor/engine.ts` — explicit Freeform-exit snapshot signals used by the shell
- `web/src/editor/Canvas.tsx` — canvas-level transition telemetry strip
- `#mode-reconciliation-panel` — shell summary state (`data-summary-state`, `data-pending-target-lens`, `data-selected-policy`)
- `#mode-reconciliation-pending-target` — pending Text/Tile target lens
- `#mode-reconciliation-selected-policy` — chosen reconciliation policy
- `#mode-reconciliation-group` — active reconciliation group id
- `#editor-mode-transition-strip` — canvas summary container
- `#editor-pending-target-lens`, `#editor-selected-reconciliation-policy`, `#editor-transition-group-id`, `#editor-transition-summary` — canvas observability surfaces
- `#editor-last-action-kind` — confirms canonical `reconcile_freeform_exit` submissions when the bridge can boot design workspaces again
- `tests/web/editor-mode-reconciliation.test.ts` — intended browser proof for success and no-write transitions once the startup blocker is removed

## Deviations

- I added the canvas transition strip in `Canvas.tsx` instead of limiting all observability to the shell, because the task plan explicitly called for shell/canvas inspection surfaces and future browser tests benefit from having the same signals inside the editor chrome.
- Because the worktree-local Vitest config still excludes `**/.gsd/**`, web and bridge verification had to be run with `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 ...` to target this worktree’s files.

## Known Issues

- Worktree-local bridge and browser tests still fail before startup because the runtime rejects generated temp workspace documents with `layout: Unrecognized key: "frameGroups"`. This is the same readiness blocker observed during T01 and prevents truthful end-to-end proof of the grouped Freeform exit flow in rooted tests.
- `scripts/verify-s05-freeform-smoke.mjs` does not exist in this repo/worktree.
- `scripts/verify-s06-mode-reconciliation-smoke.mjs` is not part of T02 yet; it is expected later in S06.

## Files Created/Modified

- `web/src/App.tsx` — added guarded Freeform exit interception, canonical reconciliation submission, no-write handling, and shell summary UI/testids
- `web/src/editor/engine.ts` — added explicit snapshot signals describing whether a selected Freeform composition requires reconciliation before exit
- `web/src/editor/Canvas.tsx` — added canvas-level pending target / policy / summary observability surfaces and controller wiring
- `tests/web/editor-mode-reconciliation.test.ts` — added focused browser coverage for explicit choice, successful rejoin, and no-write lens completion paths
- `tests/web/editor-first-run-guidance.test.ts` — preserved regression coverage for the new reconciliation summary panel on first load
