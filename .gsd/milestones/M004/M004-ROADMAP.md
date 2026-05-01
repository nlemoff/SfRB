# M004: Template & Presentation System

**Vision:** Make the exported artifact feel like a deliberate product instead of a printed editor prototype, by routing presentation through a typed template contract while keeping the M003 export trust contract intact. The user picks a template, the canonical document carries the selection, and every surface — `/print`, `/print?mode=artifact`, browser export, CLI export — reflects it without forking the renderer or the geometry contract.

## Why this milestone matters now

M003 made the artifact trustworthy: one shared `/print` surface, deterministic ready/risk/blocked markers, browser and CLI exports that gate on the same readiness policy. What M003 did *not* do is let the artifact look distinct from "a serif resume on letter paper." That's the gap M004 closes.

M004 is the first milestone that introduces variation on top of the canonical model. The product test is: can a non-technical user pick a template that feels different, see the difference reflected on `/print`, and export a PDF that matches — all without ever touching the document JSON? And can a CI/automation user do the same from the CLI?

## Success Criteria

- A typed `Theme` contract exists that templates implement, and geometry is intentionally absent from the type so future templates cannot silently break M003 page geometry.
- At least three first-party templates ship: `default` (M003-byte-stable), plus two named templates with distinct typography/color/spacing.
- The active template is persisted as `document.metadata.template = { id, version }` through the canonical write path that browser writes and CLI writes share.
- The shared `/print` surface publishes additive `data-template-id` and `data-template-version` markers that never gate `data-export-state`.
- `sfrb template list/show/apply` exposes structured CLI parity for template selection.
- The browser editor shell exposes a calm template picker that uses the same canonical write path.
- An assembled smoke proves apply → browser edit → `/print` reflects → `dist/cli.js export` produces a real `%PDF` for at least one non-default template.
- A fresh contributor can add a fourth template by editing two registry files and writing one theme module, with the contributor README in `web/src/presentation/templates/README.md` as the entry point.

## Key Risks / Unknowns

- **Schema drift** — a new optional field on the canonical document could break M001/M002 workspaces if it is not opt-in. *Retired in S01* by making `metadata.template` optional and asserting back-compat parsing.
- **Renderer fork** — a "templated path" that silently bypasses the M003 marker contract. *Retired in S01* by having every render go through the same `renderPrintableResume` and emit the M003 markers; theme work is constrained to typography + colour.
- **Registry parity drift** — server side and web side disagreeing about which template ids exist. *Retired in S01/S02* via `satisfies Record<TemplateId, Theme>` plus a single canonical `TEMPLATE_VERSIONS` source the web themes import.
- **CLI/browser parity drift** — the CLI persists differently than the browser. *Retired in S02* by routing both through schema + physics validation and the canonical `writeDocument` path.
- **Editor chrome leakage** — preview-only template UI accidentally appearing in `mode=artifact`. *Retired in S03* by keeping the "Template · `<id>`" line inside the preview-only diagnostics panel and asserting absence in artifact mode tests.

## Proof Strategy

- **S01** introduces the typed Theme + the additive markers, with byte-stability and back-compat coverage.
- **S02** adds the named templates, the CLI command, and the picker, with end-to-end persistence assertions and per-template typography spot checks.
- **S03** adds preview-only chrome, the contributor README, and the assembled apply→edit→export proof, plus updates the cross-cutting docs.
- Five built-runtime verifiers form the regression net: the three M003 verifiers (still passing), plus `verify-m004-s01-theme-contract.mjs`, `verify-m004-s02-template-catalog.mjs`, `verify-m004-s03-template-assembly.mjs`.

## Verification Classes

- Contract: Zod schema tests (`tests/document/template-registry.test.ts`, `tests/document/document-schema-template.test.ts`), per-template renderer tests (`tests/web/template-{classic,modern}.test.ts`), CLI tests (`tests/cli/template-command.test.ts`).
- Integration: browser picker (`tests/web/template-picker.test.ts`), shared print surface markers (`tests/web/print-surface-template-markers.test.ts`).
- Operational: built-runtime verifiers under `scripts/verify-m004-*.mjs`.
- Assembled: `tests/web/template-export-assembly.test.ts` plus `scripts/verify-m004-s03-template-assembly.mjs`.

## Milestone Definition of Done

- All slice deliverables are complete.
- The Theme contract exists, three templates ship, the CLI is wired, the picker is wired, and the assembled flow exports a `%PDF` for a non-default template.
- All five M003+M004 verifiers pass.
- `.gsd/STATE.md`, `.gsd/PROJECT.md`, `.gsd/REQUIREMENTS.md`, `.gsd/DECISIONS.md`, and `OPEN_SOURCE_BUILD_PLAN.md` reflect M004 as shipped.
- Contributor README exists at `web/src/presentation/templates/README.md`.

## Slices

- [x] **S01: Theme contract & default template** `risk:high` `depends:[]`
  > Shipped boundary: typed `Theme` (no geometry), `default` template byte-stable with M003, optional `metadata.template` schema field, canonical registry with compile-time parity, additive `data-template-id`/`data-template-version` markers, built-runtime verifier `scripts/verify-m004-s01-theme-contract.mjs`.

- [x] **S02: Named templates, CLI, browser picker** `risk:medium` `depends:[S01]`
  > Shipped boundary: `classic` and `modern` themes; `TEMPLATE_VERSIONS` as canonical version map; `sfrb template list/show/apply` running through the canonical write path with schema + physics validation; calm browser picker that mutates via `submitBridgeDocumentMutation` and surfaces rejection feedback; per-template Playwright coverage; built-runtime verifier `scripts/verify-m004-s02-template-catalog.mjs`.

- [x] **S03: Preview polish, contributor docs, assembled proof** `risk:medium` `depends:[S01,S02]`
  > Shipped boundary: preview-only "Template · `<id>`" line in the diagnostics panel (artifact mode untouched); `web/src/presentation/templates/README.md` documents the Theme contract, registry parity rule, byte-stability rule, and per-template test pattern; `tests/web/template-export-assembly.test.ts` plus `scripts/verify-m004-s03-template-assembly.mjs` prove apply → browser edit → `/print` → `%PDF` end to end; cross-cutting GSD and `OPEN_SOURCE_BUILD_PLAN.md` updates landed.

## Current Handoff After S03

M004 is complete. Future contributors should treat the template system as a shipped trust extension on top of M003 rather than an active discovery area.

Downstream contributors can rely on these invariants:

- The canonical `metadata.template` field is the only durable place template selection lives. The bridge mutation route revalidates on every write.
- `Theme` forbids geometry overrides; presentation depth beyond typography belongs in a future milestone, not in a fourth template.
- `data-template-id` / `data-template-version` are additive markers; downstream automation can read them but must not gate `data-export-state` on them.
- Browser and CLI use the same write path. Adding a new template means updating `src/document/templates/registry.ts` AND `web/src/presentation/templates/index.ts`; the `satisfies` check enforces it.
- The contributor README at `web/src/presentation/templates/README.md` is the entry point for adding a fourth template.

Explicit non-goals still deferred beyond M004:

- true multi-page pagination or reflow
- deeper paper-size or custom print controls
- AI-assisted presentation
- third-party template loading from outside the repo

## Forward Milestone Alignment

After M004, the next provisional milestone is **M005: Distribution, Automation & Ecosystem** — packaging, contributor ergonomics, scripted workflows, ecosystem support. Template depth (more named themes, third-party loaders, paper-size controls) should be reopened only when the distribution story makes contribution friction visibly limit growth.
