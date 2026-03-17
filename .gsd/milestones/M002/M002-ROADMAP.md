# M002: Resume Engine & Guided Editing

**Vision:** Turn the M001 foundation into the first real product-shaped resume editor: a sleek, minimalist local-first experience where a non-technical user can start from a template or blank canvas, edit through text/tile/freeform modes, and trust one canonical engine that is equally controllable from the browser and the CLI.

## Success Criteria

- A user can open a starter template or blank canvas and begin editing immediately.
- A non-technical user can replace template content and get immediate basic value without configuring AI.
- The editor exposes clear, straightforward direction on how to use text mode, tile mode, and freeform mode.
- Fine-grained tiles can be split, moved, grouped, and locked into larger resume compositions.
- Freeform mode supports element-level editing for real page objects, not just coarse section dragging.
- Switching between text, tile, and freeform modes uses explicit reconciliation rules that preserve trust.
- Every meaningful editor action is representable as a structured mutation and invokable from the CLI.
- The shipped editor feels materially sleeker, more minimalist, and less raw than M001.

## Key Risks / Unknowns

- **Three-mode coherence** — Text, tile, and freeform interactions can easily turn into a confusing mode machine if the same resume behaves inconsistently across modes.
- **Fine-grained tile decomposition** — Allowing tiles to split to smaller pieces, even by line, may complicate layout and grouping logic enough to invalidate downstream UX assumptions.
- **Structured action completeness** — If any meaningful browser edit escapes the canonical action model, CLI parity and future agent-readiness both break.
- **Natural overflow / pagination behavior** — The user explicitly wants this tested a few different ways and chosen based on what feels most natural, so product judgment is part of the engineering risk.

## Proof Strategy

- **Three-mode coherence** → retire in S06 by proving the same resume can move across text, tile, and freeform modes with explicit, inspectable reconciliation outcomes and no hidden browser-only state.
- **Fine-grained tile decomposition** → retire in S03 by proving tiles can be split, moved, grouped, and locked into larger compositions without breaking canonical persistence.
- **Structured action completeness** → retire in S02 by proving a stable canonical action contract exists and in S07 by proving the CLI can invoke the same action surface the browser uses.
- **Natural overflow / pagination behavior** → retire in S06 by proving at least one tested policy feels trustworthy enough to preserve editing continuity across mode switches.

## Verification Classes

- Contract verification: shared action-schema checks, canonical document/action validation, and file-boundary tests around template starts, tile/group models, and mode-reconciliation payloads.
- Integration verification: real `dist/cli.js open` runtime checks that exercise browser editing, bridge reconciliation, and CLI-invoked structured mutations against the same canonical workspace.
- Operational verification: local-first workflow proof that a non-technical-user path works without AI setup and that CLI/browser actions remain coherent over real workspace files.
- UAT / human verification: judgment of whether the editor feels sleek and minimalist, whether the mode guidance is straightforward, and whether the tested reconciliation behavior feels natural.

## Milestone Definition of Done

This milestone is complete only when all are true:

- All slice deliverables are complete.
- Template and blank-canvas starts are real and exercised through the shipped runtime.
- Text mode, tile mode, and freeform mode all operate over one canonical document model.
- Mode switches use explicit reconciliation rules that are inspectable and proven through live behavior.
- The canonical action model is shared by browser and CLI editing surfaces.
- The non-AI editing loop works end-to-end for a non-technical user.
- Success criteria are re-checked against live behavior, not just artifacts.
- The final integrated acceptance scenarios pass through the shipped runtime.

## Requirement Coverage

- Covers: R007, R008, R009, R010, R011, R012, R014, R015
- Partially covers: none
- Leaves for later: R013, R016, R017
- Orphan risks: none

## Slices

- [x] **S01: Template Starts & First-Run Guidance** `risk:medium` `depends:[]`
  > After this: User can open either a strong starter resume or a blank canvas and gets clear guidance on the three editing modes.

- [ ] **S02: Canonical Editor Action Model** `risk:high` `depends:[S01]`
  > After this: Every meaningful editor edit can be described as a canonical structured action shape instead of ad hoc browser-only state.

- [ ] **S03: Tile Engine & Group Locking** `risk:high` `depends:[S02]`
  > After this: User can split, move, group, and lock fine-grained tiles into larger resume compositions that persist through the canonical document boundary.

- [ ] **S04: Text Mode as Real Writing Surface** `risk:high` `depends:[S02]`
  > After this: User can switch into a pure text editing mode that feels more like a text editor while preserving the same canonical resume state.

- [ ] **S05: Freeform Element Editor** `risk:high` `depends:[S02]`
  > After this: User can select and move individual page elements such as text boxes, bullets, lines, and dividers in a Figma/Acrobat-style surface.

- [ ] **S06: Mode Reconciliation & Layout Policies** `risk:high` `depends:[S03,S04,S05]`
  > After this: User can move between text, tile, and freeform modes with explicit, understandable layout outcomes, including whether free-moved pieces stay locked or rejoin document logic.

- [ ] **S07: CLI Editing Parity & Product Polish** `risk:medium` `depends:[S06]`
  > After this: The same canonical actions are invokable from the CLI, and the editor feels sleeker, simpler, and less raw for the non-technical primary user.

## Boundary Map

### S01 → S02

Produces:
- Starter-workspace contract for opening a default template or blank canvas through the existing canonical workspace/document boundary.
- Browser guidance surface that explains text mode, tile mode, and freeform mode in product language instead of developer diagnostics.
- Stable template/blank-canvas identifiers or metadata that downstream action logic can target.

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- Canonical structured editor action contract covering meaningful browser edits as explicit mutation shapes.
- Shared action validation/parsing boundary reusable by both browser and CLI paths.
- Action application layer that persists canonical state through the existing validated bridge/document boundary.

Consumes:
- Template/blank-canvas entry surfaces and metadata from S01.

### S02 → S04

Produces:
- Canonical action contract for text-mode edits, selection, and structural transformations.
- Shared action application semantics that text-mode UI can reuse without inventing browser-only mutations.

Consumes:
- Template/blank-canvas entry surfaces and metadata from S01.

### S02 → S05

Produces:
- Canonical action contract for element selection and freeform manipulation.
- Shared mutation semantics for moving page objects while staying inside the canonical document boundary.

Consumes:
- Template/blank-canvas entry surfaces and metadata from S01.

### S03 → S06

Produces:
- Fine-grained tile representation plus grouping/locking invariants that reconciliation logic must preserve.
- Tile-level persistence and observability surfaces for split/group/lock behavior.

Consumes from S02:
- Canonical structured action contract and application layer.

### S04 → S06

Produces:
- Text-mode editing surface and text-flow expectations over the canonical document.
- Text-mode observability around focus, structure, and save/reconcile behavior.

Consumes from S02:
- Canonical structured action contract and application layer.

### S05 → S06

Produces:
- Element-level freeform interaction surface and freeform positioning state.
- Freeform observability surfaces for selected element identity and direct-manipulation geometry.

Consumes from S02:
- Canonical structured action contract and application layer.

### S06 → S07

Produces:
- Explicit reconciliation policy for text ↔ tile ↔ freeform transitions, including locked-vs-auto-fit outcomes.
- Canonical mode-transition actions and diagnostics that the CLI can also invoke.
- Chosen overflow/pagination continuity policy based on tested behaviors.

Consumes from S03:
- Tile grouping/locking invariants.

Consumes from S04:
- Text-mode semantics and flow expectations.

Consumes from S05:
- Freeform element-editing semantics.
