---
estimated_steps: 4
estimated_files: 7
---

# T02: Demote technical shell chrome behind a calm default inspector model

**Slice:** S07 — CLI Editing Parity & Product Polish
**Milestone:** M002

## Description

Use the product-feel seam the research identified. This task should simplify the browser shell hierarchy so the editing surface feels deliberate and minimalist by default, while keeping every important diagnostic and agent-inspection selector present behind a secondary inspector/disclosure instead of deleting them.

Relevant skills to load before implementation: `frontend-design`, `test`.

## Steps

1. Inspect `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, and `web/src/editor/engine.ts` to map which panels are currently too prominent (`Diagnostics`, bridge status, payload preview, consultant details, AI/workspace technical chrome) and which IDs/testids must survive hidden or collapsed.
2. Rework the shell hierarchy so editing controls, first-run guidance, and the active canvas/writing surface are primary, while technical panels move into a secondary inspector/disclosure that starts collapsed or otherwise visibly de-emphasized.
3. Preserve S04/S06 observability by keeping the same stable IDs/testids and hidden-state semantics, especially for text mode calmness, mode-reconciliation visibility, and freeform continuity signals.
4. Update the existing browser suites to assert the new default posture: editing-first by default, inspector panels still discoverable/present, and no regression in text or reconciliation visibility.

## Must-Haves

- [ ] The default shell feels editing-first rather than diagnostics-first.
- [ ] Existing IDs/testids and hidden-state observability survive so browser automation and future agents can still inspect the secondary surfaces.
- [ ] Text mode remains especially calm without hiding the reconciliation or continuity state S06 added.

## Verification

- `npx vitest run --root /home/nlemo/SfRB/.gsd/worktrees/M002 tests/web/editor-first-run-guidance.test.ts tests/web/editor-text-mode.test.ts tests/web/editor-mode-reconciliation.test.ts tests/web/editor-freeform-mode.test.ts`
- Open the browser shell locally after implementation and verify the inspector/disclosure is secondary by default but can still reveal diagnostics when requested.

## Observability Impact

- Signals added/changed: default inspector visibility state and any new shell summary/disclosure affordance used to reveal secondary panels.
- How a future agent inspects this: read the stable selectors in `web/src/App.tsx` and use the updated browser tests to confirm hidden-but-present panels remain queryable.
- Failure state exposed: regressions where diagnostic panels disappear entirely, remain too prominent, or hide required reconciliation status become detectable in the updated browser suites.

## Inputs

- `web/src/App.tsx` — current diagnostics-heavy shell and the main polish seam called out in S07 research.
- `web/src/editor/Canvas.tsx` and `web/src/editor/engine.ts` — existing hidden-state observability and transition-summary surfaces that must survive.
- `tests/web/editor-first-run-guidance.test.ts`, `tests/web/editor-text-mode.test.ts`, `tests/web/editor-mode-reconciliation.test.ts`, `tests/web/editor-freeform-mode.test.ts` — current browser expectations that need to move from raw-default to calm-default without losing inspectability.
- Decisions D023, D034, D038, and D040 — non-technical user emphasis, hidden testids in text mode, continuity honesty, and secondary-by-default shell chrome.

## Expected Output

- `web/src/App.tsx`, `web/src/editor/Canvas.tsx`, `web/src/editor/engine.ts` — calmer default shell hierarchy with preserved observability.
- `tests/web/editor-first-run-guidance.test.ts`, `tests/web/editor-text-mode.test.ts`, `tests/web/editor-mode-reconciliation.test.ts`, `tests/web/editor-freeform-mode.test.ts` — coverage that proves the new shell posture without regressing S04–S06 behavior.
