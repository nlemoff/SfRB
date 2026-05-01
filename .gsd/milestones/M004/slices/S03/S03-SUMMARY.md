# M004/S03 — Preview Polish, Contributor Docs, and Assembled Proof (shipped)

## Shipped boundary

Final M004 slice. Adds preview-only template chrome inside the existing diagnostics band (artifact mode untouched), the contributor README that documents the Theme contract and registry parity rule, and the assembled apply→edit→export proof that closes the M004 trust contract.

## What landed

- `web/src/presentation/render-printable-resume.ts` — diagnostics panel emits a "Template · `<id>`" sub-line tagged `data-testid="print-diagnostics-template"`. Preview-only by construction (the panel is only mounted in `mode=preview`); artifact mode stays chrome-free.
- `web/src/presentation/templates/README.md` — contributor docs: Theme contract, registry parity rule, byte-stability rule for `default`, per-template test pattern, the geometry-forbidden invariant, and the preview-only chrome rule.
- `tests/web/template-export-assembly.test.ts` — assembled end-to-end: CLI `template apply classic` → browser edit → `/print` reflects edited body + active template id → `dist/cli.js export` produces a non-empty `%PDF`. Confirms `metadata.template` survives the browser-driven mutation.
- `scripts/verify-m004-s03-template-assembly.mjs` — built-runtime smoke: applies `modern`, asserts persistence, probes `/print?mode=artifact` and `/print` (preview line), and exports a `%PDF`.
- Cross-cutting docs:
  - `.gsd/STATE.md` — M004 marked complete; M005 next.
  - `.gsd/PROJECT.md` — milestone sequence updated; current-state narrative reflects M004.
  - `.gsd/REQUIREMENTS.md` — R013 supporting coverage extended; R018 (Template & theme system) added under Validated.
  - `.gsd/DECISIONS.md` — D032/D033/D034/D035 appended.
  - `.gsd/milestones/M004/{M004-ROADMAP.md, M004-SUMMARY.md, slices/S0{1,2,3}/S0{1,2,3}-SUMMARY.md}` created.
  - `OPEN_SOURCE_BUILD_PLAN.md` — M003 + M004 historical sections; M005 framed as next provisional.

## Invariants preserved

- Artifact mode remains chrome-free. A direct test asserts `[data-testid="print-diagnostics-template"]` is absent on `/print?mode=artifact`.
- Marker contract unchanged. `data-export-state` and the four supporting M003 markers continue to drive trust decisions; the new `data-template-id` / `data-template-version` are read-only and additive.
- Browser export still sources truth from the artifact-route iframe probe (`readBridgePrintSurfaceSnapshot`); the picker UI lives in the editor shell, not on the print surface.

## Verification

- `tests/web/print-surface-template-markers.test.ts` (4/4) — preview line present, artifact line absent, plus existing markers + typography spot checks.
- `tests/web/template-export-assembly.test.ts` (1/1) — assembled end-to-end PDF.
- All five M003+M004 verifiers passing: `verify-s01-print-surface`, `verify-s02-export-flows`, `verify-m003-s03-export-assembly`, `verify-m004-s01-theme-contract`, `verify-m004-s02-template-catalog`, plus the new `verify-m004-s03-template-assembly` (10/10 assertions).

## PR

Stacked on `feat/m004-s02-template-catalog`; will retarget to `DEV` once S02 merges.
