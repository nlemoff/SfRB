# M004 — Template & Presentation System (shipped)

## What shipped

A typed template system that lets users pick the resume's presentation from both the CLI and the browser, with selection persisted through the same canonical write path the M003 export trust contract depends on. Three first-party templates: `default` (byte-stable with M003), `classic` (Times serif, traditional cadence), `modern` (Helvetica sans-serif, tighter cadence).

## Slice summaries

- **S01 — Theme contract & default template.** Optional `metadata.template` schema field, canonical registry with compile-time parity (`satisfies Record<TemplateId, Theme>`), typed `Theme` shape that forbids geometry, byte-stable `default` theme, additive `data-template-id`/`data-template-version` markers, S01 built-runtime verifier.
- **S02 — Named templates, CLI, browser picker.** Two named themes (`classic`, `modern`), `TEMPLATE_VERSIONS` canonical version map, `sfrb template list/show/apply` CLI parity, calm browser picker with rejection feedback, per-template + CLI + picker tests, S02 built-runtime verifier covering all three templates.
- **S03 — Preview polish, contributor docs, assembled proof.** Preview-only "Template · `<id>`" diagnostics line (artifact mode untouched), contributor README at `web/src/presentation/templates/README.md`, end-to-end assembled test (`tests/web/template-export-assembly.test.ts`), S03 built-runtime verifier proving apply → browser edit → `/print` → `%PDF` for a non-default template.

## Decisions recorded

- D032: document-level `metadata.template` over workspace-config storage.
- D033: single canonical registry source-of-truth with compile-time parity.
- D034: preview-only template chrome; artifact mode stays chrome-free.
- D035: `Theme` forbids geometry to preserve the M003 trust contract.

## Verification

- 6 verifiers green: M003 S01/S02/S03 + M004 S01/S02/S03.
- Vitest: full suite passes except the pre-existing `editor-layout-consultant.test.ts > surfaces a missing consultant secret` timeout (tracked from M003 PR #10, not introduced here).
- Schema check (`npm run schema:check`) green.

## Requirement coverage

- R013 (PDF export matches built resume) — supporting coverage extended through M004/S03.
- R018 (Template & theme system) — newly added; validated by M004/S02 with M004/S01 + M004/S03 supporting.

## Non-goals deferred past M004

- Multi-page pagination or reflow.
- Paper-size or custom print controls.
- AI-assisted presentation.
- Third-party template loaders or runtime template plugins.
