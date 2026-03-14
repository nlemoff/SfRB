# M001: Foundation & Physics — Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

## Project Description

SfRB is a local-first resume editor with a hybrid interaction model (Canvas, Selection, Properties). It aims to be the highest-quality resume tool by combining design-tool precision with document-style semantic intelligence.

## Why This Milestone

This milestone establishes the core architectural bridge between the local CLI and the web-based visual editor. It retires the primary risk: whether we can build a document model that handles both fluid text flow and fixed spatial layout ("configurable physics") while syncing seamlessly across a local server.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Run `sfrb init` to configure their workspace (physics choice, AI keys).
- Run `sfrb open` to see their local resume document in a browser.
- Double-click text on the browser canvas to edit it directly.
- Toggle between "Doc" and "Design" modes and see the document's layout logic change.
- See AI-powered layout suggestions when a fixed box overflows.

### Entry point / environment

- Entry point: CLI (`sfrb` binary)
- Environment: Local dev environment + Browser (Chrome/Safari/Firefox)
- Live dependencies involved: Node.js, Vite, OpenAI/Anthropic API (for suggestions)

## Completion Class

- Contract complete means: `sfrb` CLI exists, document schema is defined in JSON, and Vite server serves the editor.
- Integration complete means: CLI correctly spawns the server, and browser UI reflects real-time changes to the local `.sfrb` file.
- Operational complete means: `sfrb init` correctly persists workspace configuration.

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A user can create a new resume via CLI, open it in the browser, type a long string into a fixed-box header, see an overflow indicator, and accept an AI suggestion to resize the box.
- The resulting document state is persisted back to the local filesystem correctly.

## Risks and Unknowns

- **Configurable Physics Complexity** — Maintaining a single document model that behaves differently depending on a mode flag (flow vs fixed) is technically non-trivial.
- **CLI/Browser Sync Fidelity** — Ensuring that changes from the CLI and the GUI don't clobber each other in a race condition.
- **Canvas Rich Text Editing** — Implementing "double-click to edit" on a canvas element with high fidelity (cursor position, wrapping, etc.) is notoriously difficult.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R001 — Hybrid Interaction Model (Canvas editing foundation)
- R002 — CLI-First Architecture (Initialization and project management)
- R003 — Local Web Editor (Live bridge foundation)
- R004 — Configurable Workspace Physics (Behavioral implementation)
- R005 — BYOK AI Agent Integration (Secure key configuration)
- R006 — Layout Consultant (Detection and preview logic)

## Scope

### In Scope

- CLI scaffold (`init`, `open`, `version`).
- Universal Document Model (JSON schema).
- Local Vite/Express server for the browser UI.
- Direct canvas text editing (basic).
- AI layout consultant detection (overflow detection).
- AI layout suggestions (prompting and structured output).

### Out of Scope / Non-Goals

- PDF Export (M002).
- Advanced styling (M003).
- Multi-page support (M002).
- Community preset packs (M004).

## Technical Constraints

- Must run as a standard Node.js CLI tool.
- Must avoid heavy native dependencies (No Electron/Tauri).
- Must use standard web technologies for the editor (React, TypeScript).

## Integration Points

- **OpenAI/Anthropic API** — For layout suggestions and content rewriting.
- **Vite** — As the local dev server and HMR engine for the editor.

## Open Questions

- **Canvas vs. SVG vs. DOM for rendering?** — Current thinking is a hybrid: SVG or absolute-positioned DOM for spatial control, using Tiptap/ProseMirror for the text editing blocks.
- **How to handle "Ghost" states for AI previews?** — Current thinking is a separate "preview" layer in the Redux/State store that can render a second, translucent document model over the current one.
