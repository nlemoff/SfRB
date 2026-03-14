# Project

## What This Is

SfRB is a local-first resume builder that keeps one canonical `resume.sfrb.json` document model and lets the user work on it from both the CLI and a browser-based editor. Right now the project supports workspace setup, schema-validated document storage, a live local web bridge, document-mode inline text editing, and design-mode frame dragging/editing.

## Core Value

A user should be able to open a local resume workspace, edit it directly against one canonical JSON model, and trust the system to preserve validation and physics rules while the CLI and browser stay in sync.

## Current State

- `sfrb init` captures provider/env-var configuration and workspace physics into `sfrb.config.json`.
- `resume.sfrb.json` is validated through the canonical Zod-backed schema and workspace physics rules.
- `sfrb open` launches the local bridge, serves `/__sfrb/bootstrap`, and pushes invalidation events to the browser.
- The browser editor now supports:
  - document physics: semantic-flow inline text editing with save/refetch-safe reconciliation
  - design physics: canonical frame rendering, frame dragging, and linked text editing
- Browser writes go through `/__sfrb/editor`, where schema + physics validation happen before persistence.
- S05 is next: overflow detection, ghost-preview proposals, and accept/reject AI layout mutations are not built yet.

## Architecture / Key Patterns

- Node.js CLI with a separate ESM Vite bridge runtime.
- One canonical workspace document boundary: `resume.sfrb.json` + `sfrb.config.json`.
- Browser state is always reconciled from `/__sfrb/bootstrap`; bridge events are invalidation signals, not authoritative state.
- Browser mutations go through `/__sfrb/editor` and are validated before disk writes.
- The editor is DOM-first, with a shared engine handling selection, drafts, local overrides, and mode-specific document/design behavior.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [ ] M001: Foundation & Physics — Establish the canonical local document model, bridge runtime, and mode-aware browser editor.
- [ ] M002: TBD — Downstream milestone not planned yet.
