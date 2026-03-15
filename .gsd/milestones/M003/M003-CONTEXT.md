# M003: Export & Presentation Depth — Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

## Project Description

M003 follows the editor-engine work of M002 and makes the product feel finished in the ways that matter to someone using it for a real resume outcome. The milestone centers on export and presentation depth: reliable PDF export that matches what the user built, stronger pagination/presentation behavior, and deeper polish or template depth on top of the canonical three-mode editor engine.

The milestone should build on the exact product posture established during discussion: sleek and minimalist, useful for a non-technical user, and trustworthy rather than brittle. If M002 makes the editor real, M003 makes the produced artifact and finished-user confidence real.

## Why This Milestone

The user’s acceptance story ends with “export a PDF that looks like what you built.” That cannot be an afterthought. It also depends on whatever M002 learns about text overflow, tile grouping, freeform locking, and mode reconciliation. That is why M003 exists as a downstream milestone rather than being over-planned into M002: the codebase and the right product tradeoffs will be clearer after the editor engine is real.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Export a clean PDF that matches what they built in the editor.
- Trust the common one-page resume path to render well at export time.
- Benefit from stronger presentation and pagination behavior on top of the M002 editing engine.
- Use a more finished-feeling resume product rather than only an editing prototype.

### Entry point / environment

- Entry point: browser editor export flow and any supporting CLI export command
- Environment: local dev environment + browser + CLI + PDF generation/runtime path
- Live dependencies involved: local filesystem, browser print/PDF path or export renderer, canonical document model, shipped bridge/runtime surfaces from M002

## Completion Class

- Contract complete means: export contract, pagination/presentation rules, and output artifacts are explicit and testable.
- Integration complete means: the exported PDF matches the state built through the real editor/CLI path rather than a separate export-only representation.
- Operational complete means: the common “build resume → export resume” flow works reliably in a real local environment.

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A user can start with the editor engine produced by M002, finish a resume, and export a PDF that matches what they built.
- The one-page resume path remains trustworthy through real export output, not just DOM screenshots.
- Export behavior stays coherent with the canonical model and any structured CLI editing operations that changed it.

## Risks and Unknowns

- **PDF fidelity** — Matching editor presentation and PDF output can break trust if layout diverges.
- **Pagination policy** — The right line/page-break behavior may depend on lessons learned while building and testing M002.
- **Export architecture choice** — Browser-print, server-side rendering, or another path each have different fidelity and maintenance tradeoffs.

## Existing Codebase / Prior Art

- `web/src/editor/*` — M003 will depend directly on the editor engine and mode behavior shipped in M002.
- `src/document/schema.ts` — canonical model that export must read from or derive from without forking representation.
- `src/bridge/server.mjs` and CLI commands — likely integration points if export becomes scriptable from the CLI.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R013 — M003 is the primary milestone for reliable PDF export that matches what the user built.
- R011 — M003 likely deepens the sleek/minimal product feel after the core engine exists.
- R012 — Export and presentation behavior must respect whatever explicit mode-reconciliation rules M002 establishes.

## Scope

### In Scope

- Reliable PDF export for the common resume path.
- Presentation and pagination depth on top of the M002 engine.
- Any additional polish or template depth required to make the exported artifact feel real.

### Out of Scope / Non-Goals

- Re-deciding the canonical editor architecture solved in M002.
- Re-centering AI before export trust exists.
- Prematurely freezing advanced export controls before the core output path is proven.

## Technical Constraints

- Must preserve one canonical document model.
- Must not create an export-only representation that drifts from the real editor state.
- Should build on the product and reconciliation lessons from M002 rather than guessing too early.

## Integration Points

- Canonical resume model from M002.
- Browser editor/export UI.
- CLI export surface if added.
- Local PDF generation/runtime path.

## Open Questions

- Which export path produces the best fidelity-to-maintenance ratio? — Current thinking: defer until M002 clarifies the actual editor rendering model.
- How much pagination control should be explicit in the first export milestone? — Current thinking: prioritize trustworthy default behavior before advanced controls.
