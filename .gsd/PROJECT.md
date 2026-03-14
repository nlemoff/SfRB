# Project

## What This Is

SfRB is a local-first resume builder that keeps one canonical `resume.sfrb.json` document model and lets the user work on it from both the CLI and a browser-based editor. The project now supports workspace setup, schema-validated document storage, a live local web bridge, mode-aware browser editing, and a bridge-backed AI layout consultant for design-mode overflow fixes.

## Core Value

A user should be able to open a local resume workspace, edit it directly against one canonical JSON model, and trust the system to preserve validation and physics rules while the CLI and browser stay in sync — including when AI proposes layout repairs.

## Current State

- `sfrb init` captures provider/env-var configuration and workspace physics into `sfrb.config.json`.
- `resume.sfrb.json` is validated through the canonical Zod-backed schema and workspace physics rules.
- `sfrb open` launches the local bridge, serves `/__sfrb/bootstrap`, and pushes invalidation events to the browser.
- The browser editor supports:
  - document physics: semantic-flow inline text editing with save/refetch-safe reconciliation
  - design physics: canonical frame rendering, frame dragging, linked text editing, and overflow measurement
- Browser writes go through `/__sfrb/editor`, where schema + physics validation happen before persistence.
- The bridge now also exposes `/__sfrb/consultant`, which resolves workspace BYOK config + env-backed secrets, returns only validated resize proposals or sanitized failures, and never exposes raw secrets to the browser.
- In design mode, overflowing frames can request an AI proposal, show a translucent ghost preview with rationale, reject without writing, and accept through the canonical editor path so overflow clears in the persisted document.
- M001 is complete and all currently tracked requirements are validated.

## Architecture / Key Patterns

- Node.js CLI with a separate ESM Vite bridge runtime.
- One canonical workspace document boundary: `resume.sfrb.json` + `sfrb.config.json`.
- Browser state is always reconciled from `/__sfrb/bootstrap`; bridge events are invalidation signals, not authoritative state.
- Browser mutations go through `/__sfrb/editor` and are validated before disk writes.
- AI/provider calls and raw provider responses stay inside the bridge via `/__sfrb/consultant`; the browser only sees validated proposal payloads or sanitized consultant failures.
- The editor is DOM-first, with a shared engine handling selection, drafts, local overrides, and mode-specific document/design behavior; consultant preview geometry stays separate from canonical frame overrides until explicit accept.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Foundation & Physics — Established the canonical local document model, bridge runtime, mode-aware browser editor, and AI layout consultant loop.
- [ ] M002: TBD — Downstream milestone not planned yet.
