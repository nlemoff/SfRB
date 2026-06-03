---
id: S07
milestone: M002
status: ready
---

# S07: CLI Editing Parity & Product Polish — Context

## Goal

Deliver a polished end-state where the CLI acts as a precise power-user control surface for the same canonical editor actions as the browser, while the shipped product feels calmer, less raw, and more trustworthy for a non-technical primary user.

## Why this Slice

This slice comes last because true CLI parity depends on the canonical action model and the explicit mode-transition outcomes from earlier slices already being real, not hypothetical. It is also the point where product polish becomes holistic instead of local: S07 should prove both that the browser and CLI are driving the same engine and that the overall experience has shed enough developer-facing clutter to feel like a coherent product rather than an internal tool.

## Scope

### In Scope

- A CLI that serves as a power-user and scriptable control surface for the same meaningful canonical editor actions the browser uses.
- CLI command behavior that emphasizes precise control and automation without trying to replace the browser as the normal user’s everyday interface.
- Default CLI feedback that is concise and clearly states what action happened and what canonical result changed.
- Product polish work that reduces raw, diagnostics-heavy, or developer-facing clutter in the shipped experience.
- A calmer, more cohesive, more minimalist end-state that still preserves trust and inspectability where needed.

### Out of Scope

- Turning the CLI into a near-equal everyday editing interface for non-technical primary users.
- Treating the CLI mainly as a limited diagnostics-only tool with only token editing support.
- Rich, verbose diagnostics as the default output for every successful CLI command.
- Product-polish choices that primarily expose more engine internals or make the UI denser and busier.
- Replacing the browser as the main human UX of the product.

## Constraints

- Must consume the real canonical action and mode-transition outputs from S02 and S06 rather than inventing separate CLI-only behavior.
- The CLI should feel like a power-user control surface, not a second primary product interface for ordinary users.
- Default CLI output should be concise, clear, and outcome-oriented rather than noisy.
- Product polish should bias toward calmer, less raw, less diagnostics-dominated experiences.
- Must preserve one canonical resume state and one action surface across browser and CLI editing.

## Integration Points

### Consumes

- `.gsd/milestones/M002/slices/S02/S02-CONTEXT.md` outputs — canonical structured editor actions and shared validation/application semantics the CLI must invoke.
- `.gsd/milestones/M002/slices/S06/S06-CONTEXT.md` outputs — explicit mode-transition actions, diagnostics, and reconciliation policies that CLI parity must also expose.
- `src/commands/open.ts` and current Commander-based CLI surfaces — existing command patterns and runtime entrypoints that future editing commands should follow.
- `src/bridge/server.mjs`, `/__sfrb/bootstrap`, and `/__sfrb/editor` — canonical runtime and mutation boundaries that keep CLI/browser behavior aligned.
- `web/src/App.tsx` and related browser shell surfaces — current diagnostics-heavy product shell that S07 polish work should simplify and calm down.

### Produces

- CLI editing commands that invoke the same canonical action surface as the browser.
- Concise default CLI result summaries for meaningful editing operations.
- A more polished shipped browser experience that feels sleeker, simpler, and less raw.
- Final proof that browser and CLI parity is real at the action/model boundary, not just aspirational.

## Open Questions

- Which editing actions should be included in the first truly useful CLI parity set by default? — Current thinking: the CLI should cover meaningful canonical actions, but planning still needs to decide the highest-value first command set.
- How much optional detail should the CLI expose beyond the concise default summary? — Current thinking: default output should stay minimal, but planning may still want an opt-in verbose/inspect mode for advanced workflows.
- Which browser-shell elements should be demoted, simplified, or hidden to make the product feel materially less raw? — Current thinking: diagnostics should become secondary to the product experience, but the final polish cuts still need planning.
