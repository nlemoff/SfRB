---
id: S05
milestone: M002
status: ready
---

# S05: Freeform Element Editor — Context

## Goal

Deliver a freeform editing surface where users can directly select and manipulate real page elements such as text boxes, bullets, lines, and dividers in a Figma-like way, while keeping risky states visible rather than silently corrected.

## Why this Slice

This slice comes after S02 because freeform editing must be backed by the canonical action model instead of becoming a browser-only design layer. It is the first point where the product proves that direct-manipulation editing of real page objects exists as a true capability, which S06 will later need when reconciling freeform state back against text and tile modes.

## Scope

### In Scope

- A freeform interaction model focused on real page elements, not just coarse section-sized chunks.
- Direct selection and movement that feels immediate, visual, and precise in a Figma/Acrobat-style way.
- Element-level editing expectations for text boxes, bullets, lines, dividers, and similar page objects.
- UI feedback that keeps the currently selected element and its geometry obvious during manipulation.
- A product stance that expressive edits are allowed, but unusual or risky freeform states should be surfaced clearly rather than hidden or auto-corrected away.

### Out of Scope

- Restricting freeform mode to only large text containers or section-level movement.
- A heavily modal or confirmation-heavy interaction style that makes direct manipulation feel slow or cautious by default.
- Silent auto-correction that moves user edits back into safer positions without explanation.
- Final cross-mode reconciliation rules for what happens when freeform layouts re-enter text or tile logic; that belongs to S06.
- Settling the exact low-level implementation of element handles, snapping, or action-schema internals beyond the user-facing behavior and trust expectations.

## Constraints

- Must consume the S02 canonical action contract and application semantics so every meaningful freeform edit remains representable and scriptable.
- Must feel direct and Figma-like rather than dev-facing, laggy, or over-constrained.
- Must operate on real page elements, not just block/frame stand-ins that hide the eventual editing target.
- Should allow expressive edits, but the UI must make selection, geometry, and unusual states obvious instead of silently fixing them.
- Must preserve one canonical resume state that later reconciliation work in S06 can reason about.

## Integration Points

### Consumes

- `.gsd/milestones/M002/slices/S02/S02-CONTEXT.md` outputs — canonical action semantics for element selection and freeform manipulation.
- `web/src/editor/Canvas.tsx` — current design-mode surface with frame selection, drag handles, and linked text editing that provides the starting point for richer freeform interaction.
- `web/src/editor/engine.ts` — current selection and frame-box update/commit logic that will likely expand toward broader element-level geometry operations.
- `src/document/schema.ts` and `src/document/validation.ts` — canonical document boundaries that constrain what element-level freeform state can persist safely.
- Existing design-mode geometry and consultant preview patterns (`web/src/ui/GhostPreview.tsx`, layout consultant flows) — current observability and geometry cues that inform how freeform edits can remain visible and trustworthy.

### Produces

- A freeform element-editing surface for selecting and moving real page objects.
- Element identity and geometry observability surfaces that make freeform edits inspectable and trustworthy.
- Canonical freeform positioning state that later mode-reconciliation work can consume.
- A direct-manipulation UX stance that favors expressive control with visible feedback rather than hidden correction.

## Open Questions

- Which element types should be included in the first truly usable freeform release beyond text boxes? — Current thinking: bullets, lines, dividers, and similar page objects are in scope conceptually, but planning still needs to define the first practical set.
- How much constraint should exist during dragging without making the mode feel over-opinionated? — Current thinking: the editor should stay direct and expressive, but planning may still introduce lightweight guardrails if they remain visible and understandable.
- What is the best way to signal a risky or awkward freeform state to a non-technical user? — Current thinking: the system should make selection and geometry obvious, but the final warning/feedback treatment still needs planning.
