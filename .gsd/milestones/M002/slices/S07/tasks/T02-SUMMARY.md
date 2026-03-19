---
id: T02
parent: S07
milestone: M002
provides:
  - A calmer editor-first shell with a collapsed-by-default workspace inspector that still preserves stable diagnostic selectors and text/freeform observability.
key_files:
  - web/src/App.tsx
  - tests/web/editor-first-run-guidance.test.ts
  - tests/web/editor-text-mode.test.ts
  - tests/web/editor-mode-reconciliation.test.ts
  - tests/web/editor-freeform-mode.test.ts
key_decisions:
  - Kept save/reconciliation state in the primary editing column while moving bridge, AI, consultant, and payload diagnostics behind one collapsed inspector so observability stays intact without dominating the default shell.
patterns_established:
  - Secondary technical chrome should remain mounted behind `#workspace-inspector` with existing IDs/testids preserved, while lens-specific `hidden` semantics continue to gate panel visibility inside that inspector.
observability_surfaces:
  - #workspace-inspector
  - #workspace-inspector-toggle
  - #workspace-inspector-summary
  - #bridge-status
  - #diagnostics-panel
  - web browser tests for first-run, text, reconciliation, and freeform flows
duration: ~2h
verification_result: passed
completed_at: 2026-03-17 00:34 PDT
blocker_discovered: false
---

# T02: Demote technical shell chrome behind a calm default inspector model

**Shipped a calmer default editor shell by collapsing bridge/AI/consultant/diagnostic chrome behind a workspace inspector while preserving the existing stable selectors and hidden-state observability.**

## What Happened

I reworked `web/src/App.tsx` so the editing path is now visually primary: first-run guidance, lens selection, the reconciliation strip, the canvas, and save status all stay in the main flow.

The previously prominent technical surfaces moved behind a new collapsed-by-default `<details>` inspector:

- `#workspace-inspector`
- `#workspace-inspector-toggle`
- `#workspace-inspector-summary`
- `#workspace-secondary-panels`

Inside that inspector I kept the existing diagnostic and agent-facing surfaces mounted with their prior selectors:

- `#bridge-status`
- `#workspace-ai-panel`
- `#consultant-panel`
- `#diagnostics-panel`
- `#bridge-payload-preview`
- `#bridge-error-panel`

I also kept save state and freeform reconciliation out of the inspector on purpose, because those are still product-facing feedback rather than purely technical chrome.

To preserve observability, I added inspector state signaling (`data-inspector-state`) and summary copy that changes by lens, but I did not rename or remove the older panels. Lens-specific hidden behavior still applies inside the inspector, so Text remains calm while Freeform continuity and reconciliation signals stay visible in the primary shell and canvas HUDs.

On the test side I updated the existing browser suites to prove the new posture:

- inspector starts collapsed by default
- inspector can be opened to reveal the secondary surfaces
- text mode still hides bridge/consultant/diagnostic chrome even when the inspector is opened
- freeform and reconciliation flows still expose the same continuity and policy signals

I did not need to change `web/src/editor/Canvas.tsx` or `web/src/editor/engine.ts`; the existing hidden-state and continuity semantics already matched the task once the top-level shell hierarchy was demoted.

## Verification

Passed task verification:

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/web/editor-first-run-guidance.test.ts tests/web/editor-text-mode.test.ts tests/web/editor-mode-reconciliation.test.ts tests/web/editor-freeform-mode.test.ts`
- `npm run build`

Passed slice regression checks I ran for this intermediate task:

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/bridge/bridge-editor-contract.test.ts tests/cli/edit-command.test.ts tests/cli/open-command.test.ts tests/cli/init-command.test.ts`

Manual browser/UAT check passed against a real local bridge session:

- loaded the shell in a browser
- confirmed `#workspace-inspector` starts with `open === false` and `data-inspector-state="collapsed"`
- opened `#workspace-inspector-toggle`
- confirmed bridge/AI/diagnostic surfaces become available on demand

## Diagnostics

Future agents can inspect this work through:

- `#workspace-inspector[data-inspector-state]` for collapsed vs expanded shell state
- `#workspace-inspector-summary` for the human-facing disclosure affordance text
- existing panel selectors (`#bridge-status`, `#workspace-ai-panel`, `#consultant-panel`, `#diagnostics-panel`, `#bridge-payload-preview`) which remain mounted behind the inspector
- `#mode-reconciliation-panel` and the canvas transition HUD for continuity/reconciliation signals that still stay visible outside the inspector
- the updated browser suites in `tests/web/*.test.ts` to confirm hidden-but-present panel behavior

## Deviations

- The task plan listed `web/src/editor/Canvas.tsx` and `web/src/editor/engine.ts`, but after implementation and verification no runtime changes were required there; the observability contract in those files already satisfied the task once the shell hierarchy in `web/src/App.tsx` was demoted.

## Known Issues

- The bridge/CLI regression suite initially failed when I launched it concurrently with `npm run build`; rerunning it after the completed build passed cleanly. No product code change was needed.

## Files Created/Modified

- `web/src/App.tsx` — moved technical chrome behind a collapsed workspace inspector and kept save/reconciliation surfaces primary
- `tests/web/editor-first-run-guidance.test.ts` — added assertions for collapsed-by-default inspector posture and discoverable secondary panels
- `tests/web/editor-text-mode.test.ts` — verified inspector calmness plus preserved hidden text-mode chrome semantics
- `tests/web/editor-mode-reconciliation.test.ts` — verified reconciliation and continuity signals still work with the new inspector shell
- `tests/web/editor-freeform-mode.test.ts` — verified freeform remains primary while inspector surfaces stay secondary and discoverable
- `.gsd/milestones/M002/slices/S07/S07-PLAN.md` — marked T02 complete
- `.gsd/STATE.md` — advanced the slice next action to T03
