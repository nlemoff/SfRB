# SfRB Roadmap

This is the current contributor-facing roadmap for SfRB. The repo has moved off the old `.gsd` planning workflow; historical notes now live under `docs/history/gsd/` for reference only.

Use this file for active roadmap context, GitHub issues for scoped work, and PR descriptions for implementation notes and verification evidence.

## 1. What SfRB already is

SfRB is a local-first resume builder with one canonical document model:

- `resume.sfrb.json` is the source of truth for resume content and layout.
- `sfrb.config.json` stores workspace configuration, provider metadata, and physics mode.
- `sfrb init` creates starter workspaces.
- `sfrb open` launches a local bridge and browser editor against canonical state.
- `sfrb export` generates a PDF from the same presentation surface used by browser preview/export.
- `sfrb template list/show/apply` lets users pick from named first-party templates that ship with the build.
- Browser edits and CLI edits stay on the same mutation model rather than drifting into separate implementations.
- AI layout suggestions are optional, local/BYOK, and accepted through the same validated write path as manual edits.

## 2. Shipped foundation

These are done enough that future planning should build on them, not relitigate them.

### Foundation & physics

Delivered the local workspace contract, canonical document schema, generated `schema.json`, workspace physics validation, bridge runtime, and browser shell.

### Resume engine & guided editing

Delivered starter workspaces, browser editing lenses, document/design mode behavior, structured mutation paths, and the AI layout consultant proposal/preview/accept loop.

### Export & presentation depth

Delivered the shared `/print` surface, deterministic ready/risk/blocked export markers, browser export, and CLI PDF export. Browser export and `dist/cli.js export` derive from the same canonical model and gate on the same readiness policy. The artifact path is chrome-free; the preview path can expose diagnostics.

### Template & presentation system

Delivered a typed template system on top of the export surface:

- Three first-party templates ship: `default`, `classic`, and `modern`.
- Templates are picked from either the CLI (`sfrb template list/show/apply`) or browser picker.
- Both paths persist `metadata.template` through the same canonical write path with schema + physics validation.
- The shared print surface publishes additive `data-template-id` and `data-template-version` markers.
- Contributor docs at `web/src/presentation/templates/README.md` document the contract for adding another template.

### Open-source maintenance baseline

Delivered a main-only branch workflow and CI quality gate:

- every PR targets `main`
- `main` should stay usable
- GitHub Actions runs build, schema check, and tests
- branch protection requires the `build-test` CI check

## 3. Current focus

The next practical milestone is **Distribution, Automation & Ecosystem**: make SfRB easier to install, verify, extend, and maintain as an open-source project now that the core document/edit/export/template loop exists.

Strong candidate seams:

- packaging metadata and install smoke coverage (`npm run verify:package`)
- `--help` UX polish and better command examples
- contributor scripts and local verification shortcuts
- fewer flaky browser/bridge tests
- template accessibility and visual checks
- docs that accurately describe the product without relying on historical planning archives

## 4. Contribution lanes

### Lane A — Rendering contract

Best for contributors who like layout/rendering work.

Focus areas:

- canonical page rendering
- page margins and geometry as document fields, not theme fields
- design vs document presentation behavior
- keeping printable DOM separate from editing DOM

Typical files:

- `web/src/presentation/*`
- `web/src/editor/Canvas.tsx`
- `web/src/bridge-client.ts`
- `tests/web/*`

### Lane B — Bridge and route contracts

Best for contributors who like runtime wiring and integration boundaries.

Focus areas:

- bridge-served editor and print routes
- canonical payload loading
- route-level failure handling
- readiness / overflow state contracts
- sanitized AI consultant failures

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
- export failure messages

Typical files:

- `src/cli.ts`
- `src/commands/export.ts`
- `scripts/verify-*.mjs`
- `tests/cli/*`
- `tests/web/browser-export-flow.test.ts`

### Lane D — Template / presentation work

Best for contributors who like typography and visual craft.

Focus areas:

- adding a new first-party template
- preserving the chrome-free artifact rule
- preserving `default` as a stable baseline
- per-template Playwright spot-check coverage

Typical files:

- `src/document/templates/registry.ts`
- `web/src/presentation/templates/*`
- `web/src/presentation/templates/README.md`
- `tests/web/template-*.test.ts`
- `scripts/verify-m004-*.mjs`

### Lane E — Proof, docs, and handoff

Best for contributors who like making the project easier for the next person.

Focus areas:

- smoke verifiers
- roadmap updates after features land
- contributor docs
- branch/CI ergonomics
- pruning stale references to old planning systems

Typical files:

- `scripts/verify-*.mjs`
- `README.md`
- `ROADMAP.md`
- `.github/workflows/ci.yml`

## 5. Rules for future work

When contributing, preserve these project-level rules:

- **Do not fork the canonical model.** Export, browser, CLI, and template flows all derive from the same saved document.
- **Do not print the editor DOM directly.** The interactive editor contains affordances that should never leak into the final artifact. The artifact path stays chrome-free; preview-only chrome is acceptable.
- **Prefer explicit failure visibility over silent degradation.** If content does not fit, the product should say so. If a mutation is rejected, the picker should say so.
- **Templates are typography, not geometry.** `Theme` exposes fonts, colors, and per-block spacing; it does not expose page size, margins, or frame boxes.
- **Keep the registries aligned.** A template id added to `src/document/templates/registry.ts` must have a matching theme in `web/src/presentation/templates/index.ts`. The `satisfies` check enforces this at compile time.
- **Keep docs honest.** If a slice is only contract-complete, do not describe it as full end-to-end.
- **Keep history archived, not active.** `docs/history/gsd/` is for historical reference; new planning should happen in this roadmap, GitHub issues, or PRs.

## 6. Definition of done for a strong contribution

A strong contribution usually has all of the following:

- code or docs change scoped to one clear problem
- automated verification where practical
- real runtime proof when the change touches the bridge/browser/CLI/export boundary
- truthful roadmap or README updates if the contribution changes current project state

That is how we keep the project understandable for both maintainers and future contributors.
