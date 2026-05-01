# M004/S02 — Named Templates, CLI, and Browser Picker (shipped)

## Shipped boundary

Builds on S01's typed Theme contract by shipping two named non-default templates, structured CLI parity (`sfrb template list/show/apply`), and a calm browser picker — all routed through the canonical write path so the M003 trust contract stays intact.

## What landed

- Canonical registry expansion: `TEMPLATE_IDS = ['default', 'classic', 'modern']`, `TEMPLATE_VERSIONS` map, `currentTemplateMetadata(id)` helper in `src/document/templates/registry.ts`. Schema regenerated.
- New themes:
  - `web/src/presentation/templates/classic.ts` — Times serif, 20px headings, 11px body, 14px bullet padding.
  - `web/src/presentation/templates/modern.ts` — Helvetica/Arial sans-serif, 16px headings, 11px body, 10px bullet padding.
- Web registry adds the new themes; the existing `satisfies Record<TemplateId, Theme>` constraint forces parity. All three theme files reference `TEMPLATE_VERSIONS.<id>` instead of declaring local version constants.
- `src/commands/template.ts` — `createTemplateCommand` with `list` (id\tversion per template), `show <id>` (canonical metadata as JSON), `apply <id>` (read config + document → set `metadata.template` → run `validateDocumentForPhysics` → `writeDocument`). Unknown ids are rejected before any disk read.
- `src/cli.ts` registers the new command group.
- `web/src/App.tsx` — calm template picker panel with one button per registered id. Click builds a full document with `metadata.template = currentTemplateMetadata(id)` and submits via `submitBridgeDocumentMutation`. `setTemplatePickerNote` propagates success/failure including a `data-error` attribute so a rejected mutation is visible.
- `tests/utils/bridge-browser.ts` — `WorkspaceOptions.template` typed against canonical `TemplateId`.
- Tests: `tests/web/template-classic.test.ts`, `tests/web/template-modern.test.ts`, `tests/cli/template-command.test.ts`, `tests/web/template-picker.test.ts`.
- Verifier: `scripts/verify-m004-s02-template-catalog.mjs` — for each template: CLI apply → bridge restart → `/print?mode=artifact` markers + computed-style assertions.

## Invariants preserved

- The CLI runs the same validation order the bridge runs (schema → physics → atomic write) so a CLI-driven mutation cannot persist invalid state.
- The browser picker never recomputes readiness locally — it triggers the canonical mutation and lets `refreshBridge()` reconcile state.
- `Theme`-level work cannot break geometry: page sizes, margins, and frame boxes remain canonical document fields the renderer reads from `payload.document.layout`.

## Verification

- `tests/web/template-classic.test.ts` (2/2), `tests/web/template-modern.test.ts` (2/2) — per-template typography + M003 markers + chrome-free artifact.
- `tests/cli/template-command.test.ts` (7/7) — list output, show happy + unknown, apply persistence + unknown id, missing config + missing document failure paths.
- `tests/web/template-picker.test.ts` (3/3) — buttons render, click persists through `submitBridgeDocumentMutation`, initial mount reflects workspace state.
- `scripts/verify-m004-s02-template-catalog.mjs` — 24/24 assertions across all three templates.

## Review-driven changes

- HIGH (code-reviewer): added visible error feedback (`setTemplatePickerNote`, `data-error` attribute) for rejected picker mutations.
- MEDIUM (code-reviewer): added missing CLI test for "config exists but document missing" branch.
- /simplify pass: typed `WorkspaceOptions.template.id` as `TemplateId` and dropped a redundant `as TemplateId` cast in `App.tsx`.

## PR

[PR #12](https://github.com/nlemoff/SfRB/pull/12).
