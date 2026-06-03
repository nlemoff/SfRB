---
id: S02
milestone: M002
status: ready
---

# S02: Canonical Editor Action Model — Context

## Goal

Deliver a canonical editor action model where meaningful browser edits are expressed as intent-level structured actions, blocked if they cannot be represented canonically, and kept mostly invisible unless a user intentionally turns on a future "nerd mode" view.

## Why this Slice

This slice happens immediately after S01 because the starter/template entry surfaces and metadata need a stable action contract before the downstream tile, text, and freeform slices can build real editing behavior on top of one trustworthy engine. It is the slice that converts the current direct document-mutation path into a product-level promise: every meaningful edit is representable, inspectable when needed, and shared across browser and CLI control surfaces.

## Scope

### In Scope

- Defining the action model around meaningful user intents such as replacing text, selecting a target, or moving something, rather than around raw keystroke or pointer-event streams.
- Making unsupported or invalid edits fail closed: the canonical document should stay unchanged and the user should get a clear explanation instead of hidden browser-only fallback state.
- Keeping the canonical action layer mostly out of the normal user-facing browser experience so the product still feels sleek and minimalist.
- Preserving a path for an optional future "nerd mode" or fourth editor surface that exposes the underlying JSON model for power users who explicitly want to inspect it.
- Producing an action/validation/apply boundary that later text, tile, freeform, and CLI work can all target consistently.

### Out of Scope

- Making raw low-level event playback or near-keystroke-by-keystroke capture the primary action representation for S02.
- Treating only final save results as the action model while ignoring the smaller meaningful edits that lead to them.
- Exposing the canonical action stream as always-visible chrome in the main editing experience.
- Finalizing the full user-facing design of a future nerd-mode JSON editor; S02 only needs to preserve that direction, not fully deliver it unless planning later chooses to include a lightweight placeholder.
- Settling later slice behaviors such as tile grouping semantics, freeform geometry rules, or mode-reconciliation policy details.

## Constraints

- Must consume the S01 starter-template and blank-canvas metadata/entry contract rather than inventing a separate start path.
- Must preserve one canonical local document boundary with no hidden browser-only state when an edit cannot be represented as a structured action.
- Must optimize for trust: invalid or unsupported edits should be blocked and explained rather than approximated silently.
- Must keep the normal browser experience clean and non-technical even while establishing power-user inspectability for later CLI and nerd-mode workflows.
- Must define actions at the level of user intent, not raw UI event noise.

## Integration Points

### Consumes

- `.gsd/milestones/M002/slices/S01/S01-CONTEXT.md` outputs — starter-workspace entry behavior plus stable starter/blank metadata that S02 actions should target.
- `src/bridge/server.mjs` + `/__sfrb/editor` — existing validated mutation route that currently accepts whole-document mutations and is the likely boundary to widen into structured action handling.
- `web/src/bridge-client.ts` — current browser mutation client that posts canonical document writes and tracks save/error state, forming the baseline for action submission UX.
- `web/src/editor/engine.ts` — current editor engine that models selection, draft text, frame moves, and commit timing, showing which meaningful intents already exist in practice.
- `resume.sfrb.json` / `sfrb.config.json` workspace boundary — canonical local state that action application must continue to preserve.

### Produces

- A canonical structured action contract for meaningful editor intents that later slices can reuse.
- Shared action validation/parsing semantics reusable by both browser and CLI entrypoints.
- An apply/commit boundary that persists canonical state through the existing validated document path.
- A clear fail-closed UX expectation for unsupported actions.
- A preserved hook for optional future power-user inspection via nerd mode / JSON-model viewing.

## Open Questions

- Should S02 include any lightweight visible inspectability now, or only leave room for it later? — Current thinking: keep normal UX clean, but planning may choose a minimal opt-in debug/inspect affordance if it materially improves trust and verification.
- What should the first version of "block and explain" look like in the browser? — Current thinking: the message should be plain-language and actionable, not a raw validation dump, but exact phrasing and placement still need planning.
- How directly should CLI actions mirror browser intent names? — Current thinking: parity should be conceptual and contract-level, but the final command surface can still be shaped later as long as it targets the same canonical actions.
