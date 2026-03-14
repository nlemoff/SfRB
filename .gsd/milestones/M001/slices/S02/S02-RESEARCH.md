# Research Slice S02 ("Universal Doc Model") — Research

**Date:** 2026-03-13

## Summary

S02 primarily owns **R004 — Configurable Workspace Physics** and directly supports later delivery of **R001** (hybrid interaction model), **R003** (local web editor), and **R009** (agent-accessible workspace API). The codebase is still almost entirely S01-sized: there is a solid CLI/config boundary, but there is **no document model module, no document file contract, no schema artifact, and no physics-aware document validation path yet**. That means S02 is not a refinement slice; it is the first slice that defines the project’s real data model.

The strongest implementation path is to keep **Zod as the canonical source of truth** for the document contract, then emit the milestone-required `schema.json` from that Zod schema. Two research surprises materially affect the approach. First, **Zod 4 already has first-party `z.toJSONSchema()` support**, so S02 likely does **not** need an extra schema-generation dependency just to produce `schema.json`. Second, the current codebase uses `z.object(...)`, and in Zod 4 that **silently strips unknown keys at parse time** even though `z.toJSONSchema()` emits `additionalProperties: false`. For the universal document model, that mismatch is dangerous: runtime validation could quietly drop agent-authored fields while the published schema claims they are invalid. S02 should therefore prefer **`z.strictObject(...)`** for document contracts so runtime behavior and exported JSON Schema agree.

## Recommendation

Implement S02 as a **two-layer validation system**:

1. **Structural contract** in `src/document/schema.ts`
   - Define the universal document model in Zod.
   - Export inferred TS types from the same module.
   - Generate a checked-in `schema.json` artifact from the same schema.

2. **Physics-aware validation** in `src/document/validation.ts`
   - Read `workspace.physics` from `sfrb.config.json` via the existing config store.
   - Enforce contextual rules there instead of encoding workspace policy into the document itself.
   - Keep the document format capable of carrying both semantic and spatial data, while letting validation decide what is required/forbidden in `document` vs `design` workspaces.

Recommended model direction: keep **semantic content** and **layout placement** as separate but linked concerns in one JSON document. A good S02 boundary is a document that contains semantic blocks/sections plus optional or required spatial frames depending on physics. That separation keeps later ATS/PDF work viable and avoids coupling content meaning to one specific rendered layout.

## Don’t Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Runtime validation + TS inference | `zod` | Already established in S01, keeps one canonical contract for CLI, tests, and later browser/server work. |
| JSON Schema export | `z.toJSONSchema()` (Zod 4) | First-party support already exists; avoids adding a separate schema generator unless a later limitation appears. |
| File-boundary validation/error shaping | Pattern in `src/config/store.ts` | Already provides the project’s standard for path-aware validation errors and stable persisted JSON formatting. |
| Integration-grade regression tests | `vitest` + real temp-file boundaries | Matches S01’s successful pattern and catches actual on-disk contract drift. |

## Existing Code and Patterns

- `src/config/schema.ts` — current source of truth for validated project-local config. Reuse its pattern: exported schema, exported inferred types, small helper guards, and one parse function.
- `src/config/store.ts` — current file boundary pattern. Reuse its approach for document read/write/validate helpers and stable human-readable validation errors.
- `src/commands/init.ts` — proves the command layer should consume typed validated data, not manually inspect raw JSON.
- `src/prompts/init-wizard.ts` — demonstrates the project preference for real execution paths plus an automation harness rather than mock-heavy tests.
- `tests/config/sfrb-config.test.ts` — strongest existing example of contract tests through the real persisted file boundary.
- `tests/cli/init-command.test.ts` — shows how the repo currently treats integration verification: temp workspace, real writes, real validation failures, redaction-safe assertions.
- `package.json` — confirms the runtime stack is intentionally small: `commander`, `enquirer`, `zod`. No existing JSON-schema toolchain or web/server dependency is present yet.
- `tsconfig.json` — only `src/**/*.ts` is compiled to `dist`. This matters for `schema.json`: if runtime code needs it later, S02 must either keep it as a checked-in artifact outside the TS build path or add an explicit copy/generation step.
- `REQUIREMENTS.md` — R004 is S02’s owning requirement. It explicitly says physics affects how the document model handles content growth.
- `.gsd/DECISIONS.md` — D005 already locks the document format direction: **JSON-based semantic + spatial**. D007 already locks workspace physics as config-owned state.

## Constraints

- **Workspace physics is already a validated config contract** in `sfrb.config.json` (`workspace.physics` with default `document`). S02 should consume that source of truth rather than duplicating physics into document payloads.
- **The document format must support both flow and fixed-box editing** because R004 feeds S04/S05 behavior, and R001’s notes explicitly require support for both text flow and absolute positioning.
- **The codebase is CLI-first and local-first.** The document model must be usable without a browser and should remain friendly to future CLI/API access.
- **The repo currently has no document filename/extension contract.** S02 must decide this clearly or S03’s file watching / open flow will remain ambiguous.
- **`tsconfig.json` only compiles TypeScript under `src/`.** A generated/imported JSON artifact will not magically appear in `dist`.
- **Default `z.object()` behavior is not strict enough for this slice.** It strips unknown keys at parse time, which is risky for agent-authored documents and can diverge from the exported JSON Schema.
- **No heavy native dependencies** are allowed; the solution should stay plain TypeScript/JSON.

## Common Pitfalls

- **Schema/runtime mismatch** — `z.object()` strips extra keys, while exported JSON Schema can advertise `additionalProperties: false`. **Avoidance:** define document objects with `z.strictObject(...)` so runtime validation and published schema align.
- **Duplicating workspace physics into each document** — this invites drift between `sfrb.config.json` and document files. **Avoidance:** keep physics as workspace context and pass it into document validation.
- **Mixing semantic meaning directly into rendered coordinates** — later ATS export and agent mutation become brittle if “experience” only exists as arbitrary positioned boxes. **Avoidance:** keep semantic blocks/sections addressable independent of layout frames.
- **Leaving the document path/extension implicit** — S03 cannot watch/open an undefined file contract. **Avoidance:** add constants and store helpers in S02, even if the initial CLI surface is minimal.
- **Putting `schema.json` somewhere runtime code cannot find it** — TypeScript will not copy JSON artifacts by default. **Avoidance:** either treat `schema.json` as a checked-in non-runtime contract artifact or add a deliberate generation/copy step.

## Open Risks

- **Document shape granularity is still unsettled.** If S02 chooses a box-only model, later ATS/export work will suffer; if it chooses a semantic-only model, design-mode editing will be underpowered.
- **Single-page vs future multi-page pressure.** Multi-page support is deferred, but a root shape that assumes exactly one page may create avoidable churn in M002.
- **Contextual validation boundaries may sprawl.** If too many physics rules are baked into the schema instead of `validation.ts`, the model will become hard to evolve.
- **No current CLI document command exists.** If S02 ships only library code with no executable verification surface, later slices may have weaker integration confidence.
- **Agent-authored mutations may require stable IDs from day one.** If blocks/layout nodes lack durable identifiers now, later CLI/API and AI mutation workflows will be fragile.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Zod | `pproenca/dot-skills@zod` | available (not installed) |
| Zod | `bobmatnyc/claude-mpm-skills@zod` | available (not installed) |
| JSON Schema | `dkyazzentwatwa/chatgpt-skills@json-schema-validator` | available (not installed) |
| JSON Schema | `zaggino/z-schema@writing-json-schemas` | available (not installed) |
| SfRB core techs in installed skills | none directly relevant in `<available_skills>` | none installed |

Install commands if the user wants them later:
- `npx skills add pproenca/dot-skills@zod`
- `npx skills add dkyazzentwatwa/chatgpt-skills@json-schema-validator`

## Sources

- R004 is S02’s primary owned requirement; R001/R003/R009 depend on the document model being stable (source: `REQUIREMENTS.md`).
- The project has already committed to a JSON-based semantic + spatial document format and workspace-level physics (source: `.gsd/DECISIONS.md`).
- The current reusable validation/store pattern lives in `src/config/schema.ts` and `src/config/store.ts` (source: local codebase).
- Only `init` exists today; there is no document-facing module or CLI surface yet (source: `src/cli.ts`, `src/commands/init.ts`).
- The milestone boundary explicitly expects S02 to produce `schema.json` and `validation.ts` for S03 to consume (source: `.gsd/milestones/M001/M001-ROADMAP.md`).
- Zod 4 provides first-party JSON Schema conversion through `z.toJSONSchema()` (source: https://zod.dev/v4).
- JSON Schema object contracts should use explicit required properties and careful `additionalProperties` control for strict model boundaries (source: https://json-schema.org/understanding-json-schema/reference/object).
- Local runtime check: in this repo’s installed Zod 4, `z.object({...}).parse()` strips unknown keys, while `z.toJSONSchema(z.object(...))` emits `additionalProperties: false`; `z.strictObject(...)` rejects unknown keys. This is the most important contract-alignment surprise for S02 (source: local Node REPL using installed dependency).
