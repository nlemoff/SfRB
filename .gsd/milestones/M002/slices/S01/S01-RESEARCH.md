# M002/S01 — Research

**Date:** 2026-03-15

## Summary

S01 owns **R007 (template and blank-canvas start)**, **R008 (three-mode guided editing)**, and **R010 (non-technical first-run value)**, and it supports **R011 (sleek minimalist presentation)**. The current codebase has a strong canonical bridge seam to build on, but almost none of the actual starter-workspace or first-run product surface exists yet. `sfrb open` assumes a fully valid workspace already exists, and the browser shell is still M001-shaped: bridge diagnostics, payload previews, and the AI consultant dominate the screen instead of helping a new user start a resume quickly.

The biggest surprise is that **AI setup is still mandatory at init time**. Today `sfrb init` requires `provider`, `apiKey`, and `physics`, and the config schema makes `ai.provider` plus `ai.apiKeyEnvVar` required. That directly conflicts with R010’s requirement that a non-technical user get immediate value **without configuring AI**. S01 therefore is not just “add template JSON”; it likely has to decouple workspace creation from AI configuration or make AI optional in the config contract before the first-run path is honest.

The second hard constraint is that **blank canvas cannot literally be empty** under the current schema. A valid `resume.sfrb.json` must contain at least one page, one section, and one block, and design physics additionally requires a linked frame for every semantic block. That means “blank” needs to be a deliberately minimal valid starter document, not a zero-state document. The existing test helper already encodes the smallest useful valid document shape for both physics modes and is the best evidence for how to build the real starter factory.

## Recommendation

Take S01 as a **starter-workspace + first-run shell** slice, not an editor-engine slice.

1. **Create one production starter-document factory** that can generate two starter variants:
   - `template`: one strong, preassembled starter resume with realistic content and stable ids/metadata.
   - `blank`: a deliberately sparse but schema-valid resume seed that still has a page, a section, and at least one editable block.

2. **Make workspace creation independent from AI setup.** The current init flow forces provider selection and API key capture before a user can even start editing. For S01 to satisfy R010, either:
   - `sfrb init` must allow an AI-skipped path, or
   - workspace/document creation must move to a separate command/path that does not require AI configuration.

3. **Keep the canonical seam exactly where it is.** Starter creation should materialize a normal `resume.sfrb.json` + `sfrb.config.json` that the existing `/__sfrb/bootstrap` and `/__sfrb/editor` routes can consume. Do not invent browser-only starter state.

4. **Treat three-mode guidance as product copy/chrome, not engine state yet.** S01 can explain text mode, tile mode, and freeform mode in the browser shell, but it should not bind those labels to the current `physics` field or pretend the later modes already exist. The current engine’s `interactionMode` is literally `payload.physics`; reusing that field for future product modes would create cleanup debt for S04–S06.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Canonical workspace read path | `/__sfrb/bootstrap` via `readBridgePayload()` in `src/bridge/server.mjs` | Keeps one authoritative browser inspection surface and preserves D017/D015. |
| Canonical browser write path | `/__sfrb/editor` via `submitBridgeDocumentMutation()` in `web/src/bridge-client.ts` | Prevents a second persistence path and preserves server-side schema/physics validation. |
| Minimal valid starter document shape | `writeWorkspaceFiles()` in `tests/utils/bridge-browser.ts` | Already proves the smallest valid document for both physics modes; use it as the basis for production starter factories instead of re-deriving the shape. |
| Workspace config persistence | `writeConfig()` / `readConfig()` in `src/config/store.ts` | Reuses validated file IO and keeps config errors path-aware. |
| Physics validation | `validateDocumentForPhysics()` in `src/document/validation.ts` | Ensures starter documents stay valid in document vs design workspaces without duplicating rules. |
| Browser live reconciliation | `subscribeToBridgeSignals()` + bootstrap refetch in `web/src/App.tsx` | Preserves the canonical refetch-on-invalidation pattern instead of pushing state directly through events. |

## Existing Code and Patterns

- `src/commands/init.ts` — current first-run entrypoint. Right now it only writes `sfrb.config.json`, and it always requires provider + API key + physics. This is the main product mismatch against R010.
- `src/prompts/init-wizard.ts` — existing wizard flow. It is configuration-first and AI-first, not “start from a template or blank canvas.” Reuse the prompt structure, not the question set.
- `src/config/schema.ts` — current config schema makes `ai` required. Any non-AI first-run path must either loosen this contract or move starter creation outside of it.
- `src/document/schema.ts` — hard validity floor for any starter document. “Blank” still needs at least one page, one section, and one block.
- `src/document/validation.ts` — physics-specific guardrails. Document workspaces must have no frames; design workspaces must frame every block.
- `src/commands/open.ts` — current browser entry assumes a valid workspace already exists and fails fast otherwise. Useful as-is once S01 materializes starter workspaces correctly.
- `src/bridge/server.mjs` — bridge startup reads the workspace before reporting readiness. This means there is no true in-browser onboarding unless the startup contract changes.
- `web/src/App.tsx` — current shell is diagnostic-heavy and centered on bridge state plus consultant tooling. Reuse its bootstrap/status wiring, but not its first-screen information hierarchy.
- `web/src/editor/Canvas.tsx` — current empty state and editor subtitles are physics-centric (“document mode” vs “design mode”), not the future text/tile/freeform product language.
- `web/src/editor/engine.ts` — `interactionMode` currently resolves to `payload.physics ?? 'unavailable'`. Do not couple future mode guidance to this field.
- `tests/utils/bridge-browser.ts` — strongest prior art for real starter-workspace generation. It already produces a minimal valid blank-ish document and the design-physics framed variant.
- `tests/cli/open-command.test.ts` — proves `open` is path-safe on missing config and assumes pre-materialized workspace files.
- `tests/web/editor-document-mode.test.ts` / `tests/web/editor-design-mode.test.ts` — prove the current shipped user loop is still document-physics/design-physics oriented, not three guided editing modes.

## Constraints

- A “blank canvas” cannot be empty under the current document schema; it must include at least one page, one section, and one block.
- In `document` physics, starter documents must have `layout.frames: []`.
- In `design` physics, every semantic block must have a linked layout frame.
- `sfrb open` cannot currently serve a first-run browser experience without valid workspace files because bridge startup exits before readiness if config or document loading fails.
- The current config contract requires AI provider metadata, which blocks a truthful non-AI first-run path.
- The browser shell currently exposes dev-facing diagnostics (`/__sfrb/bootstrap`, payload preview, consultant controls) far more prominently than user guidance.
- The existing editor snapshot names the active interaction mode from `physics`, not from future text/tile/freeform product modes.
- D024 and D025 rule out separate hidden editors: S01 must feed one canonical engine and future CLI parity, not invent browser-only starter state.

## Common Pitfalls

- **Treating “blank” as empty JSON** — The schema rejects that. Ship a sparse valid seed instead: one page, one starter section, one editable block, and frames only when physics requires them.
- **Keeping AI mandatory in first-run setup** — That would fail R010 even if the starter template looks good. The user cannot be asked to configure a provider before they can replace template content.
- **Coupling product modes to `physics`** — Today the UI says “document” and “design.” S01 guidance for text/tile/freeform should be explanatory chrome, not a rename of the existing runtime field.
- **Creating browser-only starter state** — Any starter/template flow that exists only in App state would undermine D015/D017 and complicate S02 CLI parity.
- **Reworking the bridge seam unnecessarily** — The current bootstrap/editor contract is already the right persistence boundary. The missing piece is starter materialization and a calmer shell, not a new transport.
- **Letting consultant UI dominate first-run** — For S01’s audience, consultant tooling is secondary. Guidance and starting choices should be visually primary.

## Open Risks

- If S01 changes config semantics to make AI optional, later consultant paths may need careful degradation rules so M001’s consultant contract still behaves cleanly when AI is absent.
- If the slice adds three-mode guidance before actual mode switching exists, the copy can overpromise and create trust debt unless it is explicit about what each mode is for and when it becomes available.
- If stable template/blank metadata lives only in UI copy, S02 will lack durable identifiers for action targeting and workspace introspection.
- If first-run onboarding is pushed into `open` instead of starter creation, the bridge startup contract and current tests will need broader changes than this slice likely wants.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Frontend UI / product shell | `frontend-design` | installed/available via built-in GSD skill |
| React | `vercel-labs/agent-skills@vercel-react-best-practices` | available — install with `npx skills add vercel-labs/agent-skills@vercel-react-best-practices` |
| Vite | `antfu/skills@vite` | available — install with `npx skills add antfu/skills@vite` |
| Zod | `pproenca/dot-skills@zod` | available — install with `npx skills add pproenca/dot-skills@zod` |

## Sources

- Current init flow requires provider, API key, and physics; it only writes config, not a starter document. (source: [src/commands/init.ts](src/commands/init.ts))
- Current interactive wizard is AI/provider-first and has no template/blank choice. (source: [src/prompts/init-wizard.ts](src/prompts/init-wizard.ts))
- Config schema currently requires `ai.provider` and `ai.apiKeyEnvVar`, which blocks a non-AI first-run path unless the contract changes. (source: [src/config/schema.ts](src/config/schema.ts))
- Config persistence and validation are already centralized and path-aware. (source: [src/config/store.ts](src/config/store.ts))
- A valid document must contain at least one section, one block, and one page. (source: [src/document/schema.ts](src/document/schema.ts))
- Physics rules require frame-free document workspaces and fully framed design workspaces. (source: [src/document/validation.ts](src/document/validation.ts))
- Bridge startup reads the workspace before reporting readiness, so `open` cannot currently host onboarding without valid files. (source: [src/bridge/server.mjs](src/bridge/server.mjs))
- `sfrb open` expects an existing workspace and surfaces path-aware failure when config is missing. (source: [src/commands/open.ts](src/commands/open.ts), [tests/cli/open-command.test.ts](tests/cli/open-command.test.ts))
- The current browser shell centers bridge diagnostics and consultant controls rather than first-run guidance. (source: [web/src/App.tsx](web/src/App.tsx))
- The current canvas and engine model “interaction mode” as workspace physics, not future text/tile/freeform modes. (source: [web/src/editor/Canvas.tsx](web/src/editor/Canvas.tsx), [web/src/editor/engine.ts](web/src/editor/engine.ts))
- Test helper `writeWorkspaceFiles()` contains the closest thing to a real starter template/blank seed and already proves the minimal valid document shape. (source: [tests/utils/bridge-browser.ts](tests/utils/bridge-browser.ts))
- Current web tests validate document-mode and design-mode behavior, confirming that three-mode guidance in S01 must be additive rather than pretending the later modes already ship. (source: [tests/web/editor-document-mode.test.ts](tests/web/editor-document-mode.test.ts), [tests/web/editor-design-mode.test.ts](tests/web/editor-design-mode.test.ts))
