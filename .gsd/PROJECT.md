# Project

## What This Is

SfRB is a local-first resume builder that keeps one canonical `resume.sfrb.json` document model and lets the user work on it from both the CLI and a browser-based editor. M001 proved the foundation: validated workspace setup, canonical document storage, a live local bridge, mode-aware browser editing, and a safe bridge-owned AI consultant path. The project is now moving into product-shaping work: turning that foundation into a sleek, minimalist resume editor that a non-technical person can use to make a good resume fast.

## Core Value

A user should be able to start from a strong template or a blank canvas, edit their resume through the interaction style that fits them best, and trust that one canonical local model stays coherent across browser editing, CLI control, and eventual export.

## Current State

- M001 is complete and re-verified with a fresh build plus passing S01-S05 smoke scripts.
- `sfrb init` captures provider/env-var configuration and workspace physics into `sfrb.config.json`.
- `resume.sfrb.json` is validated through the canonical Zod-backed schema and workspace physics rules.
- `sfrb open` launches the local bridge, serves `/__sfrb/bootstrap`, and keeps the browser synchronized with workspace changes.
- The browser editor currently supports:
  - document physics: semantic-flow inline text editing with save/refetch-safe reconciliation
  - design physics: canonical frame rendering, frame dragging, linked text editing, and overflow measurement
- Browser writes go through `/__sfrb/editor`, where schema + physics validation happen before persistence.
- The bridge also exposes `/__sfrb/consultant`, but AI is intentionally de-emphasized for the next milestone while the editor engine and product experience take priority.
- M002 is now planned as the first product-shaping milestone: template starts, guided text/tile/freeform editing, structured editor actions for CLI parity, and a sleeker non-technical user experience.

## Architecture / Key Patterns

- Node.js CLI with a separate ESM Vite bridge runtime.
- One canonical workspace document boundary: `resume.sfrb.json` + `sfrb.config.json`.
- Browser state is always reconciled from `/__sfrb/bootstrap`; bridge events are invalidation signals, not authoritative state.
- Browser mutations go through `/__sfrb/editor` and are validated before disk writes.
- AI/provider calls and raw provider responses stay inside the bridge via `/__sfrb/consultant`; the browser only sees validated proposal payloads or sanitized consultant failures.
- The editor is DOM-first today, with a shared engine handling selection, drafts, local overrides, and mode-specific behavior. M002 extends that toward three guided editing lenses over one canonical model rather than creating separate document stores.
- CLI parity for future milestones means model/action parity: every meaningful editor action should be representable as a structured mutation and invokable from the CLI, even when the browser remains the primary human UX.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Foundation & Physics — Established the canonical local document model, bridge runtime, mode-aware browser editor, and AI layout consultant loop.
- [ ] M002: Resume Engine & Guided Editing — Turn the foundation into a real non-technical-user editor with template starts, text/tile/freeform editing, and structured editor actions with CLI parity.
- [ ] M003: Export & Presentation Depth — Make the editor feel finished with reliable PDF export, stronger presentation behavior, and deeper polish on top of the M002 engine.
