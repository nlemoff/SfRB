# Project

## What This Is

SfRB is a local-first resume builder that keeps one canonical `resume.sfrb.json` document model and lets the user work on it from both the CLI and a browser-based editor. M001 proved the foundation: validated workspace setup, canonical document storage, a live local bridge, mode-aware browser editing, and a safe bridge-owned AI consultant path. The project is now moving into product-shaping work: turning that foundation into a sleek, minimalist resume editor that a non-technical person can use to make a good resume fast, then making the final exported artifact trustworthy.

## Core Value

A user should be able to start from a strong template or a blank canvas, edit their resume through the interaction style that fits them best, and trust that one canonical local model stays coherent across browser editing, CLI control, and export.

## Current State

- M001 is complete and re-verified with a fresh build plus passing S01-S05 smoke scripts.
- `sfrb init` captures provider/env-var configuration and workspace physics into `sfrb.config.json`.
- `resume.sfrb.json` is validated through the canonical Zod-backed schema and workspace physics rules.
- `sfrb open` launches the local bridge, serves `/__sfrb/bootstrap`, and keeps the browser synchronized with workspace changes.
- The browser editor currently supports:
  - document physics: semantic-flow inline text editing with save/refetch-safe reconciliation
  - design physics: canonical frame rendering, frame dragging, linked text editing, and overflow measurement
- Browser writes go through `/__sfrb/editor`, where schema + physics validation happen before persistence.
- The bridge also exposes `/__sfrb/consultant`, but AI is intentionally de-emphasized while the editor engine and product experience take priority.
- M002 established starter workspaces, guided editing lenses, structured action parity, and a calmer product shell for the non-technical primary user.
- M003 shipped the shared `/print` surface, `/print?mode=artifact` chrome-free artifact route, deterministic ready/risk/blocked markers, and PDF export coherence between the browser shell and `dist/cli.js export`.
- M004 shipped the typed Theme contract, three first-party templates (`default`, `classic`, `modern`), a canonical template registry with compile-time parity, the `sfrb template list/show/apply` CLI, a calm browser picker, and an assembled apply→edit→export proof. The exported PDF derives from the same canonical model under the active template; geometry stays canonical so the M003 trust contract is preserved.

## Architecture / Key Patterns

- Node.js CLI with a separate ESM Vite bridge runtime.
- One canonical workspace document boundary: `resume.sfrb.json` + `sfrb.config.json`.
- Browser state is always reconciled from `/__sfrb/bootstrap`; bridge events are invalidation signals, not authoritative state.
- Browser mutations go through `/__sfrb/editor` and are validated before disk writes.
- AI/provider calls and raw provider responses stay inside the bridge via `/__sfrb/consultant`; the browser only sees validated proposal payloads or sanitized consultant failures.
- The editor is DOM-first today, with a shared engine handling selection, drafts, local overrides, and mode-specific behavior.
- CLI parity means model/action parity: every meaningful editor action or export action should be representable as a structured operation and invokable from the CLI even when the browser remains the primary human UX.
- Public contributor guidance should summarize future work, but the internal GSD docs remain the source of truth for requirements, slices, and verification.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Foundation & Physics — Established the canonical local document model, bridge runtime, mode-aware browser editor, and AI layout consultant loop.
- [x] M002: Resume Engine & Guided Editing — Turned the foundation into a real non-technical-user editor with starter workspaces, guided editing lenses, structured actions, and calmer product shell behavior.
- [x] M003: Export & Presentation Depth — Shipped the shared printable presentation surface, one-page PDF export trust contract, and assembled browser/CLI export coherence.
- [x] M004: Template & Presentation System — Shipped the typed Theme contract, three first-party templates, `sfrb template` CLI parity, browser picker, and assembled apply→edit→export proof.
- [ ] M005 (provisional): Distribution, Automation & Ecosystem — Improve packaging, contributor ergonomics, and scripted workflows now that template/export trust is established.

## Contributor On-Ramp

For a streamlined public-facing roadmap, see `OPEN_SOURCE_BUILD_PLAN.md`. For the full planning and verification trail, use the milestone docs in `.gsd/milestones/`.
