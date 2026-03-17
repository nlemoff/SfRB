---
id: S04
milestone: M002
status: ready
---

# S04: Text Mode as Real Writing Surface — Context

## Goal

Deliver a true text mode that feels like a calm document editor, lets users write and perform basic restructuring quickly, and keeps auto-save/reconciliation quiet and trustworthy while preserving one canonical resume state.

## Why this Slice

This slice comes after S02 because text mode must reuse the canonical action model instead of inventing browser-only writing state, and it helps prove that one of the three guided editing lenses can already feel genuinely useful to a non-technical user. It also establishes the writing-first semantics and observability that S06 will need when reconciling text mode with tile and freeform behavior.

## Scope

### In Scope

- A text-mode experience centered on focused writing, natural text flow, and low-friction editing rather than visual layout manipulation.
- Fast content editing that feels closer to a calm document editor than a design tool or raw JSON surface.
- Basic restructuring operations directly in text mode, such as obvious add/remove/reorder style changes that support real writing workflows.
- Quiet background save behavior with subtle status feedback so the user can trust persistence without losing flow.
- Preservation of focus/caret continuity and non-jumpy reconciliation during save and refetch cycles.

### Out of Scope

- Making text mode carry nearly every advanced editing responsibility across the product from the start.
- Turning text mode into a rich layout- or design-aware surface with heavy visual positioning controls.
- Requiring explicit/manual save as the primary interaction model for ordinary writing.
- Final reconciliation rules for how text mode interacts with tile/freeform changes after complex edits; those belong to S06.
- Settling the exact technical implementation of text-mode action schemas or DOM architecture beyond the user-facing behavior and expectations.

## Constraints

- Must consume the S02 canonical action contract and shared application semantics rather than storing separate browser-only text state.
- Must feel calm, focused, and trustworthy for non-technical users, not raw or developer-facing.
- Must support basic restructuring in text mode, not just simple text replacement.
- Save/reconciliation should happen quietly in the background with subtle feedback, without stealing focus or making the surface feel jumpy.
- Must preserve one canonical resume state that later mode-switching logic can build on.

## Integration Points

### Consumes

- `.gsd/milestones/M002/slices/S02/S02-CONTEXT.md` outputs — canonical action semantics for text edits, selection, and structural changes that S04 must reuse.
- `web/src/editor/Canvas.tsx` — current inline textarea-based editing surface that already preserves focus/caret during save/refetch and provides the baseline behavior to evolve into a true text mode.
- `web/src/editor/engine.ts` — current draft/edit/commit model with selection, draft text, and quiet commit timing that informs text-mode expectations.
- `/__sfrb/bootstrap` and `/__sfrb/editor` — canonical read/write boundaries that text mode must continue to use.
- Existing semantic blocks/sections in `resume.sfrb.json` — current canonical writing structure that text mode should make feel fluid rather than technical.

### Produces

- A real writing-oriented text-mode surface over the canonical resume document.
- Text-mode semantics for content editing plus basic restructuring operations.
- Quiet save/reconciliation expectations and observability that preserve trust during writing.
- Text-flow behavior that downstream mode-reconciliation work in S06 can consume.

## Open Questions

- Which restructuring operations are the minimum useful set for the first real text mode? — Current thinking: users should get obvious add/remove/reorder basics, but the exact first-cut list still needs planning.
- How much structural context should stay visible while keeping the mode calm? — Current thinking: the experience should feel document-like first, but some lightweight structure cues may still be needed so users do not get lost.
- What is the best subtle save signal for non-technical users? — Current thinking: status should reassure without interrupting flow, but the final presentation and wording still need planning.
