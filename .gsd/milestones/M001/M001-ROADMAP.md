# M001: Foundation & Physics

**Vision:** Establish the CLI-to-Browser bridge and the configurable document model that enables both design-style and document-style resume editing.

## Success Criteria

- [ ] `sfrb init` successfully captures AI keys and workspace physics preference.
- [ ] `sfrb open` launches a local server and opens a browser showing the current document.
- [ ] Direct text editing on the canvas updates the underlying local JSON model.
- [ ] The editor respects "Design Mode" (fixed boxes) and "Doc Mode" (reflow) constraints.
- [ ] AI correctly detects a layout overflow and displays a suggested resolution as a visual overlay.

## Key Risks / Unknowns

- **Canvas/DOM Hybrid Performance** — Combining high-precision spatial layout with fluid text editing can lead to "jank" if not optimized early.
- **Structured AI Layout Mutations** — Ensuring the LLM returns valid document model changes (x, y, w, h) rather than just prose suggestions.

## Proof Strategy

- **Canvas/DOM Hybrid Performance** → retire in S04 by proving 60fps interaction during text reflow in both Doc and Design modes.
- **Structured AI Layout Mutations** → retire in S05 by proving the AI agent can successfully resize a box to resolve an overflow without human intervention.

## Verification Classes

- Contract verification: JSON Schema validation for the `.sfrb` document format.
- Integration verification: End-to-end flow from CLI command to Browser UI update.
- UAT / human verification: User judges the "feel" of text editing and the usefulness of AI layout suggestions.

## Milestone Definition of Done

This milestone is complete only when all are true:

- All slice deliverables are complete.
- CLI and Web UI are fully synchronized (no state drift).
- The "Layout Consultant" can successfully resolve an overflow in a fixed-box layout.
- Success criteria are re-checked against live behavior, not just artifacts.

## Requirement Coverage

- Covers: R002, R003, R004, R005
- Partially covers: R001, R006
- Leaves for later: R008, R009, R007, R010

## Slices

- [x] **S01: CLI & Config Agent** `risk:low` `depends:[]`
  > After this: User can initialize a project and configure BYOK and physics via a terminal chat agent.

- [x] **S02: Universal Doc Model** `risk:high` `depends:[S01]`
  > After this: A validated JSON schema for resumes that supports both semantic content and spatial layout metadata.

- [ ] **S03: Local Web Bridge** `risk:medium` `depends:[S02]`
  > After this: `sfrb open` successfully spawns a Vite server and opens a browser that live-syncs with the local `.sfrb` file.

- [ ] **S04: Canvas Editor Foundation** `risk:high` `depends:[S03]`
  > After this: A basic browser editor where you can click-to-edit text and move boxes with "Physics" (flow vs fixed) enforced.

- [ ] **S05: AI Layout Consultant** `risk:high` `depends:[S04]`
  > After this: AI detects a layout overflow and presents a "Ghost Preview" of a suggested fix that the user can accept or reject.

## Boundary Map

### S01 → S02
Produces:
- `sfrb.config.json` → Workspace configuration (physics preference, AI provider).
- `sfrb init` command → Environment setup.
Consumes: nothing

### S02 → S03
Produces:
- `schema.json` → The SfRB document format specification.
- `validation.ts` → Logic for ensuring a document matches the schema.
Consumes from S01:
- `sfrb.config.json` → To determine which "physics" to enforce during validation.

### S03 → S04
Produces:
- `bridge/server.ts` → Express/Vite server that watches local files.
- `bridge/client.ts` → WebSocket client that listens for updates.
Consumes from S02:
- `schema.json` → To ensure the data being synced is valid.

### S04 → S05
Produces:
- `editor/Canvas.tsx` → The primary interactive editing surface.
- `editor/engine.ts` → The layout engine that handles reflow vs fixed logic.
Consumes from S03:
- Live bridge for real-time state synchronization.

### S05 → M002
Produces:
- `agent/LayoutConsultant.ts` → Detection and structured mutation logic.
- `ui/GhostPreview.tsx` → Component for rendering proposed layout fixes.
Consumes from S04:
- The canvas surface and layout engine to perform detections and apply preview transforms.
