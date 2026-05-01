# M004/S01 — Theme Contract & Default Template (shipped)

## Shipped boundary

Foundation slice for M004. Introduces a typed `Theme` contract and the `default` theme that reproduces M003's inline rendering values byte-for-byte, plus the canonical template registry on the server side and the additive `data-template-id` / `data-template-version` markers on the shared print surface.

## What landed

- `src/document/templates/registry.ts` — canonical `TEMPLATE_IDS = ['default']`, `templateIdSchema` (`z.enum`), `templateMetadataSchema` (strictObject id+version), `isKnownTemplateId` helper.
- `src/document/schema.ts` — `metadata` strictObject gains `template: templateMetadataSchema.optional()`. Existing M001/M002 workspaces parse unchanged. `SemanticBlockKind` type exported for the renderer to import.
- `schema.json` regenerated.
- `web/src/presentation/theme.ts` — `Theme` type and `applyBlockStyle` helper. Geometry intentionally absent.
- `web/src/presentation/templates/default.ts` — default theme, M003-byte-stable.
- `web/src/presentation/templates/index.ts` — registry typed `satisfies Record<TemplateId, Theme>` for compile-time parity.
- Renderer plumbed for theme: `web/src/presentation/render-printable-resume.ts` consumes the resolved theme; `web/src/presentation/print-surface.ts` publishes `data-template-id` / `data-template-version` additively.
- Tests: `tests/document/template-registry.test.ts`, `tests/document/document-schema-template.test.ts`, `tests/web/print-surface-template-markers.test.ts` plus typography spot checks confirming default-theme byte stability.
- Verifier: `scripts/verify-m004-s01-theme-contract.mjs`.

## Invariants preserved

- M003 byte-stability — the existing 8 tests in `tests/web/printable-presentation-surface.test.ts` continue to pass unchanged.
- M003 marker contract — `data-export-state`, `data-overflow-status`, `data-blocked-reason`, `data-risk-count`, `data-max-overflow-px` are unmodified and never gated on template state.
- Schema back-compat — `metadata.template` is optional; pre-M004 workspaces parse without migration.

## Verification

- `tests/document/template-registry.test.ts` (4/4) — registry membership and Zod enum semantics.
- `tests/document/document-schema-template.test.ts` (6/6) — back-compat, valid template, unknown id, extra key, empty version, missing version.
- `tests/web/print-surface-template-markers.test.ts` (3/3 in S01) — markers + computed-style typography byte stability.
- `tests/web/printable-presentation-surface.test.ts` (8/8 unchanged) — M003 regression net.
- `scripts/verify-m004-s01-theme-contract.mjs` — 16/16 assertions across default-fallback and explicit-template workspaces.

## PR

[PR #11](https://github.com/nlemoff/SfRB/pull/11), merged into `DEV`.
