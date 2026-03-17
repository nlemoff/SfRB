---
id: S06
milestone: M002
status: ready
---

# S06: Mode Reconciliation & Layout Policies — Context

## Goal

Deliver explicit, understandable reconciliation behavior for moving between text, tile, and freeform modes, with lightweight summaries, explicit user choice on freeform re-entry, and overflow/pagination policies chosen for natural continuity rather than hidden magic.

## Why this Slice

This slice comes after S03, S04, and S05 because it depends on real tile/group behavior, real text-mode writing semantics, and real freeform element editing before it can reconcile them honestly. It is the key trust slice of M002: the point where the product proves the three modes are one coherent editor instead of separate tools with hidden state or surprising layout jumps, and it also establishes the explicit mode-transition outcomes that S07 will need for CLI parity.

## Scope

### In Scope

- Explicit reconciliation behavior when moving between text, tile, and freeform editing modes.
- A default product stance that when coming back from freeform into a more structured mode, the user should make an explicit choice about whether edits stay locked or rejoin document logic.
- Lightweight but clear transition summaries that explain what changed, what stayed fixed, or what policy was applied during a mode switch.
- Overflow and pagination policy work that prioritizes the most natural-feeling continuity across modes rather than rigid or hidden behavior.
- Inspectable mode-transition outcomes that preserve trust without turning each switch into a heavy workflow.

### Out of Scope

- Silent or hidden reconciliation that changes layout semantics without surfacing the outcome to the user.
- A default policy that quietly auto-fits freeform changes back into structure without user involvement.
- Overly heavy or always-detailed reconciliation workflows that make every mode switch feel like a formal diff review.
- Re-deciding the core text, tile, or freeform editing semantics already established in S03–S05.
- Treating overflow/pagination as purely a low-level rendering detail instead of a user-facing trust behavior.

## Constraints

- Must consume the real outputs of S03 tile/group locking, S04 text-mode semantics, and S05 freeform positioning state rather than inventing abstract reconciliation rules in isolation.
- Must make freeform re-entry explicit: the product should ask the user whether edits stay locked or rejoin structured document logic.
- Reconciliation outcomes should be surfaced through a clear summary in lightweight UI, not hidden and not excessively heavy.
- Overflow and pagination behavior should bias toward natural continuity and least-surprising editing flow.
- Must preserve one canonical resume state and avoid browser-only hidden transition outcomes.

## Integration Points

### Consumes

- `.gsd/milestones/M002/slices/S03/S03-CONTEXT.md` outputs — fine-grained tile representation plus grouping/locking invariants that reconciliation must preserve.
- `.gsd/milestones/M002/slices/S04/S04-CONTEXT.md` outputs — text-mode editing semantics, text flow expectations, and quiet save/reconciliation trust expectations.
- `.gsd/milestones/M002/slices/S05/S05-CONTEXT.md` outputs — freeform element identity/geometry semantics and the expectation that risky states remain visible.
- `web/src/editor/Canvas.tsx` and `web/src/App.tsx` — current mode-facing shell, design/document affordances, overflow diagnostics, and UI summary surfaces that can evolve into explicit transition feedback.
- `src/document/schema.ts`, `src/document/validation.ts`, and the canonical action/apply boundary from S02 — the underlying document and mutation contracts reconciliation must continue to respect.

### Produces

- Explicit reconciliation policy for text ↔ tile ↔ freeform transitions.
- Lightweight transition summaries that explain applied outcomes clearly enough to preserve trust.
- A chosen overflow/pagination continuity policy based on what feels most natural across modes.
- Canonical mode-transition outcomes and diagnostics that S07 can later expose through the CLI.

## Open Questions

- How often should the explicit freeform re-entry choice be asked before it feels repetitive? — Current thinking: the default should be explicit user choice, but planning may still need to decide when repeat decisions can be safely reused without undermining trust.
- What is the minimum useful summary content for a mode switch? — Current thinking: users should get a concise explanation of what changed or stayed locked, but the exact summary format still needs planning.
- Which overflow/pagination behaviors should be prototyped and compared before choosing the final policy? — Current thinking: the product should test a few realistic options and keep the one that best preserves natural editing continuity.
