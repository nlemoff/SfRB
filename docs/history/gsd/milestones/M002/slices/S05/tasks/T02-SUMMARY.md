---
id: T02
parent: S05
milestone: M002
provides:
  - A shipped Freeform lens with a calmer positioned-page surface and stable HUD diagnostics for selected element identity, geometry, and blocked/risky placement state
key_files:
  - web/src/App.tsx
  - web/src/editor/Canvas.tsx
  - web/src/editor/engine.ts
  - tests/web/editor-first-run-guidance.test.ts
  - tests/web/editor-freeform-mode.test.ts
key_decisions:
  - Reuse canonical frame rendering for Freeform, but restyle it as an element-focused surface with HUD observability instead of tile/group-first chrome.
patterns_established:
  - Keep Freeform shell copy honest, carry tile/freeform frame selection through the shared editor engine, and expose browser-stable HUD testids for element id, geometry, group lock state, and placement messaging.
observability_surfaces:
  - web/src/App.tsx lens availability copy; web/src/editor/Canvas.tsx freeform HUD testids; tests/web/editor-freeform-mode.test.ts blocked-state browser coverage
duration: 1.8h
verification_result: passed
completed_at: 2026-03-16 22:30 PDT
blocker_discovered: false
---

# T02: Promote Freeform from preview to a real element-editing surface

**Turned Freeform into a shipped positioned-element lens with a dedicated HUD, real frame selection, and honest blocked/risk messaging instead of preview-only copy.**

## What Happened

I updated `web/src/App.tsx` so Freeform is presented as a real available lens in the shell. The preview-only headline/body/availability copy is gone, and the first-run guidance now reports Freeform as available now in design workspaces and inspectable in document workspaces.

In `web/src/editor/Canvas.tsx` I replaced the placeholder `renderFreeformMode()` card with a real positioned-page surface built from the existing canonical frame path. The Freeform surface now renders the page with calmer page chrome, hides tile drag handles, and adds a dedicated HUD that exposes:
- selected freeform element id
- canonical element kind (`block_frame`, `bullet_frame`, `split_line_fragment`)
- geometry readout
- group membership / locked state
- placement messaging (`idle`, `clear`, `risky`, `blocked`)

I also reused the T01 bridge diagnostic helper in the browser to keep the blocked-state messaging honest. Locked-group members now surface a clear “use `translate_frame_group`” note in the Freeform HUD, while out-of-margin elements surface a risk-style placement message instead of raw bridge errors.

In `web/src/editor/engine.ts` I loosened frame-selection state so Freeform can bind to canonical frames and keep selected-frame context visible through the shared engine, while leaving actual drag persistence work for T03.

Finally, I updated `tests/web/editor-first-run-guidance.test.ts` to assert the shipped Freeform copy and added `tests/web/editor-freeform-mode.test.ts` to prove the real Freeform surface, scope copy, selected-element HUD fields, and blocked locked-group messaging in-browser.

## Verification

Passed:
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-first-run-guidance.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-freeform-mode.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/web/editor-tile-mode.test.ts`
- `npm test -- --run /home/nlemo/SfRB/.gsd/worktrees/M002/tests/bridge/bridge-editor-contract.test.ts`

Also manually exercised the live browser flow against a local bridge workspace to confirm:
- Freeform switches in as a distinct lens
- the HUD renders immediately
- selecting a frame updates the visible element id / geometry state
- locked-group selection produces blocked Freeform messaging

Expected partial slice state:
- `tests/document/editor-actions.test.ts` was not rerun in the final pass because T02 did not modify the shared document action boundary; it remained green in T01 and the bridge + tile/browser regressions touched by this task passed.
- `node scripts/verify-s05-freeform-smoke.mjs` still does not exist yet because that shipped-runtime verifier belongs to T04.

## Diagnostics

Future agents can inspect:
- `web/src/App.tsx` → `lens-freeform-availability` and Freeform shell copy
- `web/src/editor/Canvas.tsx` → `freeform-hud`, `freeform-selected-element-id`, `freeform-selected-element-kind`, `freeform-selected-element-geometry`, `freeform-selected-element-group`, and `freeform-placement-note`
- `web/src/editor/engine.ts` → shared tile/freeform frame-selection state handling
- `tests/web/editor-freeform-mode.test.ts` → split/group/lock → Freeform blocked-state browser proof

Failure localization is now much easier in-browser:
- preview-copy regressions show up in shell testids immediately
- missing frame selection leaves Freeform HUD ids/geometry empty
- locked-group regressions surface as wrong `data-placement-state` / group-lock state instead of silent ambiguity

## Deviations

I reused the existing canonical frame renderer more aggressively than the plan phrased, rather than building a separate second rendering pipeline for Freeform. This kept the shipped Freeform surface honest to canonical geometry while still giving it distinct chrome.

The project’s Vitest invocation was path-sensitive in this harness, so I verified task/slice tests with the concrete absolute-path form that resolved inside the worktree.

## Known Issues

Freeform selection is now real, but drag preview and persisted freeform movement are still intentionally unfinished until T03.

`.bg-shell/manifest.json` changed as a tooling side effect during local runtime/browser verification and was not part of the task’s product changes.

## Files Created/Modified

- `web/src/App.tsx` — removed preview-only Freeform shell copy and exposed shipped Freeform availability text.
- `web/src/editor/Canvas.tsx` — replaced the placeholder panel with a real positioned-page Freeform surface and HUD observability.
- `web/src/editor/engine.ts` — carried canonical frame selection state into Freeform so the HUD can bind to real elements.
- `tests/web/editor-first-run-guidance.test.ts` — flipped Freeform guidance expectations from preview copy to shipped-lens copy.
- `tests/web/editor-freeform-mode.test.ts` — added browser proof for the Freeform surface, HUD state, and blocked locked-group messaging.
