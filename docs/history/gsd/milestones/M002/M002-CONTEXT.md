# M002: Resume Engine & Guided Editing — Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

## Project Description

M002 turns the current foundation into the first real product-shaped resume editor. The editor should feel sleek and minimalist, not raw or dev-facing, and it should help a non-technical user make a good resume fast. The product is built around one canonical resume engine that can be viewed and edited through three guided modes: a pure text editing mode, a tile mode, and a freeform mode.

The user’s mental model is that there is a canvas where you can add text sections for different parts of your resume and then have those sections exist as different tiles that can move around and have logic for how they affect different elements on the canvas when they’re moved around. Those tiles are intentionally smaller than whole sections — they can even be split on lines. The user should be able to lock smaller template tiles together into a big resume. There should be both a template resume with tiles already put together to start with and the option for a blank canvas.

The browser remains the primary human UX, but the CLI must be able to control everything the user can do in terms of editing the resume. The right interpretation is action/model parity: every meaningful editor action should be representable and invokable through CLI commands or structured mutations over the canonical document.

## Why This Milestone

M001 proved that the local-first bridge and canonical document loop work. That was necessary, but it is not yet the product the user wants. M002 exists to turn the foundation into something a layman can actually use: open a starter template, replace the content, understand how to use the three modes, and shape the resume without the app feeling like a toy design tool, a dev-facing JSON editor with a UI bolted on, or a brittle WYSIWYG where things jump unexpectedly.

This milestone is also where the editing engine becomes the real center of the product. AI is intentionally de-emphasized for now. The next win is not adding more AI; it is making the editor engine coherent, scriptable, and trustworthy across text, tile, and freeform interactions.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Open a strong starter template or a blank canvas and begin editing immediately.
- Use a pure text editing mode that feels more like a text editor when they want flow and speed.
- Use tile mode to move, split, group, and lock smaller pieces of the resume layout.
- Use a Figma/Acrobat-style freeform editor to move individual elements on the page.
- Switch between modes with clear direction and understandable layout outcomes.
- Drive the same editing operations from the CLI through structured mutations.

### Entry point / environment

- Entry point: `sfrb open` in the browser, plus `sfrb` CLI commands for structured editing operations
- Environment: local dev environment + browser + CLI
- Live dependencies involved: local filesystem, Vite bridge runtime, canonical workspace document model

## Completion Class

- Contract complete means: the canonical action model, template/blank-canvas starts, tile/group/lock behavior, freeform element editing, and guided mode surfaces all exist with tests or verifiers around the shared document boundary.
- Integration complete means: the three modes operate over one canonical document model through the shipped bridge path, and the CLI can invoke the same action layer the browser uses.
- Operational complete means: a non-technical user can open the app and get immediate basic editing value without configuring AI, while the CLI/browser loop remains coherent through real runtime transitions.

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A user can open the starter template, replace the content with their own, switch between text mode, tile mode, and freeform mode, and still keep one coherent resume state.
- A user can split or regroup tiles, lock pieces together into a larger resume composition, and later choose whether freeform edits stay locked or rejoin document logic.
- The same meaningful editing operations exercised in the browser are invokable through the CLI as structured mutations against the canonical document model.

## Risks and Unknowns

- **Three-mode reconciliation** — The hardest risk is keeping text, tile, and freeform modes feeling like one editor instead of a confusing mode machine.
- **Fine-grained tile model complexity** — Letting tiles split down to smaller pieces, even by line, can create a much harder layout/reconciliation problem than section-level movement.
- **Text overflow and pagination behavior** — The user explicitly wants this tested “a few different ways” to see what looks most natural, so some behavior will need empirical product judgment rather than pure upfront specification.
- **CLI action parity** — A scriptable action model is a product requirement now, not a convenience layer, so hidden browser-only edits would invalidate the milestone direction.

## Existing Codebase / Prior Art

- `src/bridge/server.mjs` — current canonical bridge runtime with `/__sfrb/bootstrap`, `/__sfrb/editor`, and the validated write boundary M002 should extend rather than bypass.
- `web/src/App.tsx` — current browser shell and state orchestration surface where mode guidance and editor chrome can evolve.
- `web/src/editor/Canvas.tsx` — existing editing surface that already handles design/document interactions and is the likely base for mode-specific expansion.
- `web/src/editor/engine.ts` — current shared editor engine and the most likely place to extend canonical action/state logic.
- `src/document/schema.ts` and `src/document/validation.ts` — canonical document and physics boundaries that must stay trustworthy as the editor model grows.
- `src/commands/init.ts` / `src/commands/open.ts` — existing CLI entrypoints and patterns that future CLI editing commands should follow.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R007 — M002 must establish the starter template and blank-canvas entry paths.
- R008 — M002 is the first milestone that truly delivers the three-mode guided editing experience.
- R009 — M002 must define the canonical structured action layer so CLI and browser edits share one control surface.
- R010 — M002 is accountable for the “non-technical user can make a good resume fast” outcome.
- R011 — M002 should materially improve the visual/editor feel toward sleek and minimalist.
- R012 — M002 must prove explicit, trustworthy mode reconciliation behavior.
- R014 — M002 must ship real element-level freeform editing, not just coarse section movement.
- R015 — M002 must ship the smaller-tile grouping/locking model.

## Scope

### In Scope

- Starter template and blank-canvas entry paths.
- Guided text mode, tile mode, and freeform mode over one canonical document model.
- Fine-grained tiles that can be split, moved, grouped, and locked into a larger resume.
- Element-level page editing for text boxes, bullets, lines, dividers, and similar page elements.
- Explicit layout policies when switching back from freeform into more structured modes.
- Structured editor actions that are invokable through the CLI.
- Product-level polish and guidance aimed at non-technical users.

### Out of Scope / Non-Goals

- Making AI the center of the product again during this milestone.
- Rich provider/model-management UX.
- Final deep PDF/export quality work beyond what is required to support downstream M003 planning.
- Turning the CLI into the preferred primary UX for normal users.

## Technical Constraints

- Must preserve one canonical `resume.sfrb.json` model and validated bridge write boundary.
- Must preserve local-first behavior and the shipped CLI↔bridge↔browser path.
- Must avoid browser-only hidden state that cannot be represented as a structured action.
- Must stay compatible with the existing Node.js CLI + Vite bridge architecture.

## Integration Points

- `resume.sfrb.json` / `sfrb.config.json` — canonical local workspace boundaries M002 continues to use.
- `/__sfrb/bootstrap` — canonical browser inspection surface.
- `/__sfrb/editor` — canonical mutation surface that M002 should likely widen rather than replace.
- `sfrb` CLI — future structured editing commands should use the same canonical action semantics as the browser.

## Open Questions

- How should the canonical document model represent line-level or sub-section tile decomposition without making text-mode editing fragile? — Current thinking: test a few decomposition strategies against real editing flows rather than locking the shape too early.
- What exact policy should mediate freeform → structured re-entry? — Current thinking: explicit user choice between auto-fit back into document logic and intentional locked placement.
- What overflow/pagination behavior feels most natural across the three modes? — Current thinking: implement and compare a few realistic behaviors during slice execution, then keep the most trustworthy one.
