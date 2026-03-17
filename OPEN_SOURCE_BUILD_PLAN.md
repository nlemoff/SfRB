# SfRB Open-Source Build Plan

This document is the contributor-facing version of the GSD roadmap. It is intentionally simpler than the internal planning docs and is meant to help outside contributors understand **what already exists**, **what is being built next**, and **where a contribution can land cleanly**.

If you want the full requirement and slice traceability, read `.gsd/REQUIREMENTS.md` and the milestone docs under `.gsd/milestones/`. If you want to contribute productively without reading the whole planning archive first, start here.

## 1. What SfRB already is

SfRB is a local-first resume builder with one canonical document model:

- `resume.sfrb.json` is the source of truth for resume content and layout.
- `sfrb.config.json` stores workspace configuration and physics mode.
- `sfrb open` launches a local bridge and browser editor against that canonical state.
- Browser edits and CLI edits are meant to stay on the same mutation model rather than drifting into separate implementations.

## 2. Milestones that are already historical

These are done enough that future planning should **build on them, not relitigate them**.

### M001 — Foundation & Physics
Delivered the local workspace contract, canonical document schema, bridge runtime, browser shell, and validated workspace behavior.

### M002 — Resume Engine & Guided Editing
Delivered the actual editing product shape: starter workspaces, browser editing lenses, structured action parity, and calmer product direction for non-technical users.

## 3. Current milestone: M003 — Export & Presentation Depth

### Goal
Make the exported result trustworthy. A user should be able to build a resume in the real runtime and export a clean PDF that matches it.

### What must be true by the end of M003
- Export comes from the same canonical model as the editor.
- The one-page path is trustworthy.
- Editor chrome does not leak into exported output.
- Overflow/clipping is explicit instead of silent.
- Browser export and CLI export share the same printable presentation surface.

### M003 slices

#### S01 — Printable Presentation Surface
Create a dedicated bridge-served print/export surface that renders canonical resume content without editor chrome and exposes stable readiness / overflow state.

#### S02 — Shared PDF Export Flows
Generate actual PDFs from that shared surface in both browser and CLI flows, with explicit blocked/warned behavior for overflow cases.

#### S03 — Presentation Depth & Final Export Assembly
Polish the export experience and verify the real end-to-end loop across browser edit, CLI edit, export preview, and final artifact output.

## 4. Contribution lanes

These are the most useful ways to break work up for open-source contributors.

### Lane A — Rendering contract
Best for contributors who like layout/rendering work.

Focus areas:
- canonical page rendering
- page margins and geometry
- design vs document presentation behavior
- keeping printable DOM separate from editing DOM

Typical files:
- `web/src/presentation/*`
- `web/src/editor/Canvas.tsx`
- `web/src/bridge-client.ts`

### Lane B — Bridge and route contracts
Best for contributors who like runtime wiring and integration boundaries.

Focus areas:
- bridge-served print route
- canonical payload loading
- route-level failure handling
- readiness / overflow state contracts

Typical files:
- `src/bridge/server.mjs`
- `src/document/*`
- `web/src/bridge-client.ts`
- `tests/bridge/*`

### Lane C — Export transport and artifacts
Best for contributors who like CLI/runtime automation and file generation.

Focus areas:
- browser export actions
- CLI `export` command
- Playwright PDF generation
- repeat export / overwrite semantics

Typical files:
- `src/cli.ts`
- `src/commands/*`
- `scripts/verify-*.mjs`
- `tests/cli/*`

### Lane D — Product polish and presentation depth
Best for contributors who like UI craft and product feel.

Focus areas:
- calmer print/export preview
- presentation polish
- final export review UX
- preserving minimalist feel while adding trust signals

Typical files:
- `web/src/App.tsx`
- `web/src/presentation/*`
- `tests/web/*`

### Lane E — Proof, docs, and handoff
Best for contributors who like making the project easier for the next person.

Focus areas:
- smoke verifiers
- slice summaries
- contributor docs
- roadmap updates after features land

Typical files:
- `scripts/verify-*.mjs`
- `.gsd/milestones/*`
- `README.md`
- `OPEN_SOURCE_BUILD_PLAN.md`

## 5. Rules for future work

When contributing, try to preserve these project-level rules:

- **Do not fork the canonical model.** Export, browser, and CLI flows should continue to derive from the same saved document.
- **Do not print the editor DOM directly.** The interactive editor contains affordances that should never leak into the final artifact.
- **Prefer explicit failure visibility over silent degradation.** If content does not fit, the product should say so.
- **Keep docs honest.** If a slice is only contract-complete, do not describe it as full end-to-end export.
- **Keep M001/M002 fixed.** New planning can reinterpret future work, but it should not rewrite the history of the shipped foundation.

## 6. What likely comes after M003

These are directional, not locked commitments.

### M004 (provisional) — Template & Presentation System
Deepen theme/template quality, presentation variation, and reusable visual systems without introducing a second document model.

### M005 (provisional) — Distribution, Automation & Ecosystem
Improve packaging, contributor ergonomics, scripted workflows, and broader ecosystem support once export trust is in place.

## 7. How to pick a contribution

If you want a good starting point:

- pick **Lane E** if you want to improve verification or docs
- pick **Lane B** if you want bounded runtime work
- pick **Lane A** if you want to work on the core printable renderer
- pick **Lane C** once S01 is complete and the print route exists
- pick **Lane D** once the underlying export path is stable enough to polish

## 8. Definition of done for a good contribution

A strong contribution in this repo usually has all of the following:

- code change
- automated verification
- real runtime proof when the slice touches the bridge/browser/CLI boundary
- truthful roadmap or summary updates if the contribution closes a meaningful slice or contract

That is how we keep the project understandable for both maintainers and future contributors.
