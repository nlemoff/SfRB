---
id: S03
milestone: M002
status: ready
---

# S03: Tile Engine & Group Locking — Context

## Goal

Deliver a tile editing surface where resume content can split down to line-level pieces by default, remain visually controlled and calm, and be grouped/locked into larger compositions that move as one unit.

## Why this Slice

This slice happens after S02 because tile behavior must sit on top of the canonical action model rather than inventing browser-only manipulation rules. It is the first slice that proves the user's tile mental model is real: resume content is no longer just sections or frames, but smaller manipulable pieces that can be assembled into larger structures which later reconciliation logic in S06 must preserve.

## Scope

### In Scope

- A tile model where fine-grained decomposition can reach line-level pieces in the first real version.
- Tile interactions that still feel orderly and readable rather than like a chaotic board of fragments.
- Grouping multiple nearby or selected tiles together through an explicit user action such as multi-select plus a group command or contextual action.
- Locked groups that behave as one assembled unit during movement until the user explicitly changes that relationship.
- Persistence/observability of split, group, and lock behavior through the canonical action boundary so downstream slices can trust the result.

### Out of Scope

- Keeping tiles only at whole-section or coarse whole-block granularity for the initial S03 behavior.
- A deliberately noisy, hyper-detailed tile board that prioritizes exposing every fragment over usability.
- Soft-lock behavior where grouped tiles casually drift apart during normal movement.
- Final mode-reconciliation policy details for how grouped/locked tiles re-enter text or freeform flows; that belongs to S06.
- Settling the exact technical implementation of multi-select gestures, command surfaces, or action schema internals beyond preserving the user-facing intent.

## Constraints

- Must consume the S02 canonical action contract and application layer; tile edits cannot become a separate hidden interaction system.
- Must make line-level splitting feel native without making the overall tile canvas visually overwhelming for a non-technical user.
- Grouping should be an explicit user-directed action, not an opaque automatic behavior.
- Locked groups must move as a single unit during normal manipulation.
- The interface should preserve a controlled, calm feel even as tile granularity becomes finer.

## Integration Points

### Consumes

- `.gsd/milestones/M002/slices/S02/S02-CONTEXT.md` outputs — canonical structured editor actions plus shared validation/application semantics that tile operations must target.
- `web/src/editor/Canvas.tsx` — current DOM-first editor surface that already handles selection, editing, and frame movement, and is the likely base for tile-specific UI and selection affordances.
- `web/src/editor/engine.ts` — current editor engine with selection/edit/commit flow that will need to expand from block/frame operations toward tile/group actions.
- `src/document/schema.ts` and `src/document/validation.ts` — canonical document boundaries that currently model sections, blocks, and frames and will constrain how tile/group concepts can persist safely.
- Existing block/frame relationships in `resume.sfrb.json` — current content units that tile decomposition will build from rather than replace with browser-only state.

### Produces

- Fine-grained tile representation that can express line-level decomposition.
- Grouping and locking behavior for assembling multiple tiles into larger resume compositions.
- Persistent observability surfaces for split/group/lock state that later slices can inspect and reconcile.
- A tile interaction model that feels controlled enough for ordinary users while still exposing meaningful granularity.

## Open Questions

- What is the best default visual presentation for many line-level tiles while keeping the canvas calm? — Current thinking: line-level granularity is required, but planning should explore presentation patterns that collapse visual noise without hiding capability.
- How should multi-select and grouping be invoked most naturally? — Current thinking: the user expects an explicit action such as selecting several tiles and then using a contextual/right-click-style or command-based grouping affordance.
- When should users see individual line tiles versus pre-grouped clusters from templates? — Current thinking: the product should support both fine pieces and assembled larger chunks, but the initial balance between raw fragments and starter groupings still needs planning.
