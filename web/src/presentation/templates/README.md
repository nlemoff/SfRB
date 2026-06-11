# Templates

This directory holds the first-party visual templates consumed by the shared `/print` surface (`web/src/presentation/print-surface.ts`). Each template is a typed `Theme` object that the renderer applies to the canonical document.

## What a template is and is not

A template **changes**: typography (font family, color, per-block styles), and the page background color. That's it.

A template **does not change**: page geometry (size, margins), frame boxes, semantic structure, overflow detection, or the export trust contract. Those are owned by the canonical document and the M003 export-marker contract — `data-export-state`, `data-overflow-status`, `data-blocked-reason`, `data-risk-count`, `data-max-overflow-px`. Templates publish `data-template-id` and `data-template-version` additively.

The `Theme` type in `../theme.ts` enforces this at compile time. There is no field for page size, margin, frame position, or any other geometry value. Don't add one — that's the M005+ presentation system, not a template.

## How a template is registered

Two registries must stay aligned:

1. **Canonical (server-side):** `src/document/templates/registry.ts` exports `TEMPLATE_IDS`, `TEMPLATE_VERSIONS`, and the Zod `templateIdSchema` (a `z.enum(TEMPLATE_IDS)`). This is the single source of truth that the bridge mutation route, the CLI, and the schema validator all read.
2. **Web (renderer):** `web/src/presentation/templates/index.ts` keeps `TEMPLATE_REGISTRY` typed as `satisfies Record<TemplateId, Theme>`. If the canonical id list grows without a matching theme, TypeScript fails to compile — that's the parity guard.

To add a template:

1. Add the new id to `TEMPLATE_IDS` in `src/document/templates/registry.ts`.
2. Add the same id and a version string to `TEMPLATE_VERSIONS` (same file).
3. Run `npm run schema:generate` to refresh `schema.json`.
4. Create `web/src/presentation/templates/<id>.ts` exporting a `Theme`. Use `TEMPLATE_VERSIONS.<id>` for the version — never declare a local version constant.
5. Register the theme in `web/src/presentation/templates/index.ts` — add the import and an entry in `TEMPLATE_REGISTRY`. The `satisfies` check will tell you if you missed it.
6. Add a per-template Playwright test under `tests/web/template-<id>.test.ts` mirroring the shape of `template-classic.test.ts`. Cover: typography spot checks, M003 markers preserved, chrome-free in artifact mode.
7. Update `scripts/verify-m004-s02-template-catalog.mjs` `TEMPLATE_EXPECTATIONS` so the built-runtime smoke includes the new template.

## The byte-stability rule for `default`

`default.ts` reproduces the M003 inline rendering values verbatim. The 8 tests in `tests/web/printable-presentation-surface.test.ts` are the regression net — they assert structural and marker behavior on the M003 output, and they must continue to pass for any change to `default.ts` or to the renderer plumbing. If you ever need to evolve `default`, bump `TEMPLATE_VERSIONS.default` and update the M003 byte-stability tests in the same change.

## Per-block style contract

`Theme.typography.blocks` carries one `BlockStyle` per `SemanticBlockKind` (`heading`, `paragraph`, `bullet`, `fact`, `divider`). Each `BlockStyle` requires `fontSize`, `lineHeight`, and `marginBottom`. `fontWeight` and `paddingLeft` are optional (they're applied only when defined, so omitting them won't write inherited browser defaults to the inline style).

`divider` blocks carry no text — the renderer draws a `1px solid currentColor` top border and the `BlockStyle` only contributes spacing. A new template must still provide a `divider` entry (the `Record<SemanticBlockKind, BlockStyle>` type forces it); nominal values like `fontSize: '12px'`, `lineHeight: '1'`, `marginBottom: '8px'` are fine.

## Contrast gate

`tests/presentation/template-contrast.test.ts` asserts every registered theme keeps `typography.rootColor` vs `color.pageBackground` at or above WCAG AA (4.5:1) for normal text. A template with unreadable colors fails the suite — pick your palette accordingly.

## Preview-only diagnostics

The shared print surface renders a small "Template · `<id>`" line inside the existing preview diagnostics panel. This line lives only in `mode=preview`. `mode=artifact` is intentionally chrome-free so the exported PDF carries no editor breadcrumbs. Don't add template-specific UI outside that panel without preserving the artifact-mode invariant.
