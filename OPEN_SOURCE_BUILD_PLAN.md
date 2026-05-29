# SfRB Open-Source Build Plan

This document is the contributor-facing version of the GSD roadmap. It is intentionally simpler than the internal planning docs and is meant to help outside contributors understand **what already exists**, **what is being built next**, and **where a contribution can land cleanly**.

If you want the full requirement and slice traceability, read `.gsd/REQUIREMENTS.md` and the milestone docs under `.gsd/milestones/`. If you want to contribute productively without reading the whole planning archive first, start here.

## 1. What SfRB already is

SfRB is a local-first resume builder with one canonical document model:

- `resume.sfrb.json` is the source of truth for resume content and layout.
- `sfrb.config.json` stores workspace configuration and physics mode.
- `sfrb open` launches a local bridge and browser editor against that canonical state.
- `sfrb export` generates a real PDF from the same canonical state.
- `sfrb template list/show/apply` lets users pick from named first-party templates that ship with the build.
- Browser edits and CLI edits stay on the same mutation model rather than drifting into separate implementations.

## 2. Milestones that are already historical

These are done enough that future planning should **build on them, not relitigate them**.

### M001 — Foundation & Physics
Delivered the local workspace contract, canonical document schema, bridge runtime, browser shell, and validated workspace behavior.

### M002 — Resume Engine & Guided Editing
Delivered the actual editing product shape: starter workspaces, browser editing lenses, structured action parity, and calmer product direction for non-technical users.

### M003 — Export & Presentation Depth
Delivered the shared `/print` surface, deterministic ready/risk/blocked markers, and PDF export coherence. Browser export and `dist/cli.js export` derive from the same canonical model and gate on the same readiness policy. The artifact path is chrome-free; the preview path is calm. Multi-page pagination, custom paper sizes, and AI-presentation features remain explicitly deferred.

### M004 — Template & Presentation System
Delivered a typed template system on top of M003. Highlights:

- Three first-party templates ship: `default` (M003-byte-stable), `classic` (Times serif), `modern` (Helvetica sans-serif).
- The `Theme` contract carries typography + page background only; geometry is intentionally absent so future templates cannot silently break the M003 export trust contract.
- Templates are picked from either the CLI (`sfrb template list/show/apply`) or a calm browser picker. Both paths persist `metadata.template` through the same canonical write path with schema + physics validation.
- The shared print surface publishes additive `data-template-id` and `data-template-version` markers; M003 markers are unchanged.
- Preview-only "Template · `<id>`" diagnostics line; artifact mode stays chrome-free.
- Contributor docs at `web/src/presentation/templates/README.md` document the contract for adding a fourth template.

## 3. Current state and next milestone

Active branch lifecycle: M004 has shipped into `DEV`. The repo is in a post-M004 handoff state. The next provisional milestone is **M005 — Distribution, Automation & Ecosystem**: packaging, contributor ergonomics, scripted workflows, and broader ecosystem support now that template + export trust are in place.

## 4. Contribution lanes

These are the most useful ways to break work up for open-source contributors.

### Lane A — Rendering contract
Best for contributors who like layout/rendering work.

Focus areas:
- canonical page rendering
- page margins and geometry (these are canonical document fields, not theme fields)
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

### Lane D — Template / presentation work
Best for contributors who like typography and visual craft.

Focus areas:
- adding a new first-party template (start with `web/src/presentation/templates/README.md`)
- preserving the M003 chrome-free artifact rule
- preserving the byte-stability rule for `default`
- per-template Playwright spot-check coverage

Typical files:
- `src/document/templates/registry.ts`
- `web/src/presentation/templates/*`
- `tests/web/template-*.test.ts`
- `scripts/verify-m004-s02-template-catalog.mjs`

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

- **Do not fork the canonical model.** Export, browser, CLI, and template flows all derive from the same saved document.
- **Do not print the editor DOM directly.** The interactive editor contains affordances that should never leak into the final artifact. The artifact path stays chrome-free; preview-only chrome is acceptable inside the diagnostics panel.
- **Prefer explicit failure visibility over silent degradation.** If content does not fit, the product should say so. If a mutation is rejected, the picker should say so.
- **Templates are typography, not geometry.** `Theme` exposes fonts, colors, and per-block spacing; it does not (and should not) expose page size, margins, or frame boxes.
- **Keep the registries aligned.** A template id added to `src/document/templates/registry.ts` must have a matching theme in `web/src/presentation/templates/index.ts`. The `satisfies` check enforces this at compile time.
- **Keep docs honest.** If a slice is only contract-complete, do not describe it as full end-to-end.
- **Keep historical milestones fixed.** New planning can reinterpret future work, but it should not rewrite the history of shipped foundation milestones.

## 6. What likely comes after M004

These are directional, not locked commitments.

### M005 (provisional) — Distribution, Automation & Ecosystem
Improve packaging, contributor ergonomics, scripted workflows, and broader ecosystem support now that template + export trust are in place. Strong candidate seams: `npm` packaging story, `--help` UX polish, contributor scripts, packaging the runtime for distribution.

Possible follow-on themes after M005, none committed:

- Broader theme catalog or third-party template loaders.
- Multi-page pagination / reflow.
- Custom paper-size and print-control affordances.
- AI-assisted presentation depth.

## 7. How to pick a contribution

If you want a good starting point:

- pick **Lane E** if you want to improve verification or docs
- pick **Lane B** if you want bounded runtime work
- pick **Lane A** if you want to work on the core printable renderer
- pick **Lane C** if you want CLI/PDF generation craft
- pick **Lane D** if you want to add a fourth template — start with `web/src/presentation/templates/README.md`

## 8. Definition of done for a good contribution

A strong contribution in this repo usually has all of the following:

- code change
- automated verification
- real runtime proof when the slice touches the bridge/browser/CLI boundary
- truthful roadmap or summary updates if the contribution closes a meaningful slice or contract

That is how we keep the project understandable for both maintainers and future contributors.
