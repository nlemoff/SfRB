# S05 — Research

**Date:** 2026-03-14

## Summary

S05 is the primary owner of the two remaining **Active** requirements: **R001 — Canonical local authoring loop** and **R006 — AI layout consultant proposals**. Research should therefore stay tightly focused on one end-to-end proof: in a **design** workspace, a fixed frame visibly overflows, the system proposes a structured fix as a ghost preview, the user can accept or reject it, and accepted changes persist through the existing canonical bridge without state drift.

The good news is that S04 already shipped nearly all of the persistence and reconciliation machinery S05 needs. The existing `/__sfrb/bootstrap` read path, `/__sfrb/editor` validated write path, save-status store, design-mode frame rendering, and built-path browser test harness are all reusable. The major gaps are now very specific: **overflow detection**, **provider-backed structured suggestion generation**, **a preview layer that is separate from canonical edits**, and **accept/reject UX plus proof**.

The biggest surprises were architectural rather than functional. First, despite the `.tsx` filenames, the web app is **not React-based** right now; it is a DOM-first imperative Vite/TypeScript app. Second, there is **no AI runtime or provider SDK in the repo yet**. Third, the browser cannot safely call OpenAI or Anthropic directly because the workspace config only stores the **env-var name**, not the secret, and the actual secret is only available in the CLI/bridge process environment. That pushes the provider call behind the bridge and strongly argues for a dedicated consultant endpoint rather than a browser-only implementation.

## Recommendation

Build S05 as a **hybrid client+bridge consultant workflow** on top of the existing bridge/editor contract:

1. **Detect overflow in the browser, only in design mode.**
   - The browser already renders the real fixed frame box, so it is the right place to measure whether the linked block body exceeds the available frame height.
   - Keep detection local and cheap: selected frame, active design frame, or debounced post-edit checks are enough for M001 proof.

2. **Ask the bridge for a structured proposal, not prose.**
   - Add a bridge-backed consultant route that reads `sfrb.config.json`, resolves `config.ai.provider` + `config.ai.apiKeyEnvVar`, reads the actual secret from `process.env`, and calls the selected provider.
   - Constrain the model output to a small JSON schema like: frame id, next `x/y/width/height`, rationale, and maybe confidence.
   - Limit the first implementation to **resizing an existing frame**. That is the milestone risk retirement target and fits the current schema/engine cleanly.

3. **Render the proposal as a true ghost preview layer, separate from engine overrides.**
   - Do **not** reuse `frameBoxOverrides` for preview-only state, because those overrides are part of the engine’s working document and are meant for commitable edits.
   - Instead, add a consultant preview state that the canvas can render translucently over the canonical frame.

4. **Accept through the existing mutation path; reject by clearing preview.**
   - On accept, materialize the proposed frame box into a candidate document and submit it through `/__sfrb/editor`.
   - On reject, clear preview state only. No disk write, no canonical mutation.

5. **Prove the shipped path with the existing built-runtime harness.**
   - Reuse `tests/utils/bridge-browser.ts` and the S04 smoke-test style.
   - The highest-value proof is still: temp design workspace → open real bridge → create visible overflow → request proposal → see ghost preview → accept → wait for idle + bridge update → verify `resume.sfrb.json` changed and overflow cleared.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Canonical browser state refresh | `/__sfrb/bootstrap` + invalidation-only bridge events | S04 already proved this avoids client/server drift. |
| Validated persistence | `/__sfrb/editor` | Reuses schema + physics validation and keeps path-aware failures. |
| Save lifecycle UI | `createBridgeEditorStatusStore()` | Already drives `idle` / `saving` / `error` observability surfaces. |
| Design-frame geometry edits | `engine.updateFrameBox()` + composed working document | The engine already supports full box objects, including width/height, not just drag x/y. |
| Structured provider output | OpenAI JSON-schema output / Anthropic structured output helpers | Avoids brittle prose parsing for box mutations. |

## Existing Code and Patterns

- `src/bridge/server.mjs` — already owns the canonical runtime boundary: `/__sfrb/bootstrap` for inspection, `/__sfrb/editor` for validated writes, and Vite custom events for invalidation only. S05 should extend this surface, not bypass it.
- `web/src/bridge-client.ts` — already defines the bridge payload types, save-state store, and mutation helper. A consultant request/result type belongs beside these existing bridge contracts.
- `web/src/App.tsx` — stable shell-level diagnostics already exist (`#editor-save-status`, `#editor-save-error`, `#bridge-last-signal`, payload preview). S05 should add consultant diagnostics here rather than invent a second shell.
- `web/src/editor/engine.ts` — important finding: the engine already supports full `FrameBox` replacement via `updateFrameBox(frameId, box)`, and `composeWorkingDocument()` already knows how to persist changed frame geometry. That means accept-path resizing can reuse existing persistence logic.
- `web/src/editor/engine.ts` — caution: `displayTextOverrides` and `frameBoxOverrides` are part of the working document composition. They are appropriate for canonical edits, but not for a rejectable ghost preview.
- `web/src/editor/Canvas.tsx` — design mode already renders frame DOM, maintains frame maps, and updates frame position from engine state without rebuilding structure when only geometry changes. This is the right place for an overlay/ghost layer.
- `web/src/editor/Canvas.tsx` — another important detail: the actual visible frame includes a drag handle and metadata label above the text body. Overflow detection should measure the text region carefully, not just compare raw outer frame height.
- `tests/utils/bridge-browser.ts` — already provides temp workspace creation, real `dist/cli.js open` startup, bootstrap fetch helpers, mutation helpers, and Vite websocket helpers. This is the fastest trustworthy base for S05 verification.
- `tests/web/editor-design-mode.test.ts` — already proves design selection, drag persistence, and text editing through the shipped browser path. S05 should mirror this test style for ghost preview and accept/reject behavior.
- `src/document/schema.ts` + `src/document/validation.ts` — the schema and physics rules already constrain S05’s safe mutation space. In design mode, every semantic block must stay linked to a frame; resizing an existing frame is low-risk compared with adding/removing frames.

## Constraints

- S05’s consultant workflow only makes sense for **design physics**. `document` workspaces forbid fixed frames entirely.
- The browser app is currently **DOM-first imperative TypeScript**, not a React component tree. Any implementation plan that assumes React state/hooks will fight the shipped architecture.
- There is **no provider SDK dependency** in `package.json` today. S05 must either add one or use direct HTTP calls from the bridge.
- Secrets cannot safely live in the browser. `sfrb.config.json` stores the provider and env-var name only; the actual API key must be read in the bridge process from `process.env[config.ai.apiKeyEnvVar]`.
- Any accepted consultant mutation should still flow through `/__sfrb/editor`, so schema and physics validation remain authoritative.
- Preview state must survive canonical refetches sensibly; bridge events are refetch triggers, so preview cannot rely on becoming canonical until the user accepts.
- Existing design-mode rendering structure excludes frame box values from `structureKey`, which is good: changing frame geometry does not force a full DOM rebuild.

## Common Pitfalls

- **Using engine frame overrides as ghost-preview state** — Avoid this. `frameBoxOverrides` feed directly into the next composed document and blur the line between “preview” and “accepted edit.” Keep consultant preview state separate.
- **Calling providers from the browser** — Avoid this. It would expose BYOK secrets or force unsafe secret transport into the page.
- **Measuring overflow against the wrong DOM box** — Avoid comparing only the outer frame element. The drag handle + metadata consume vertical space, so the text body needs its own overflow measurement strategy.
- **Triggering consultant proposals on every keystroke** — Avoid noisy churn. Use debounce or post-idle checks, especially because S04’s editor already performs debounced save commits.
- **Expanding consultant scope too early** — Avoid frame creation, multi-frame reflow, or semantic rewrites in M001. The roadmap only needs “resize a box to resolve overflow without human intervention.”
- **Skipping explicit observability** — Avoid invisible consultant state. Add stable ids/testids for overflow status, proposal state, and accept/reject controls so S05 can be verified without brittle visual-only assertions.

## Open Risks

- Provider output may still need a local safety pass even with JSON-schema formatting; S05 should validate that the proposed frame exists and the returned box dimensions are finite/positive before surfacing it.
- Anthropic and OpenAI structured-output ergonomics differ. A provider abstraction may be small, but the slice should budget for slightly different request/response handling.
- Overflow detection may be flaky if measured while the textarea is active or before layout settles. A small post-render/post-save delay or stable-region check may be needed.
- A bridge refetch while a preview is active could make the preview stale if the underlying document changed externally. The preview should be invalidated when its source frame/block no longer matches the canonical payload.
- Network/provider failures need a first-class UI state, or the feature will look broken rather than unavailable.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Vite | `antfu/skills@vite` | available |
| DOM-first web UI / ghost-preview styling | `frontend-design` | installed |
| React | `vercel-labs/agent-skills@vercel-react-best-practices` | available but only partially relevant because the shipped app is not currently React-based |
| OpenAI | none clearly relevant from `npx skills find "OpenAI"` | none found |
| Anthropic | no provider-integration-specific skill surfaced; installed `frontend-design` is not provider-specific | none found |

## Sources

- The remaining Active requirements owned by S05 are `R001` and `R006`, and both still require the consultant workflow to be proven on the shipped canonical loop (source: preloaded `REQUIREMENTS.md`).
- S04 explicitly says S05 should build directly on `/__sfrb/bootstrap` + `/__sfrb/editor` and reuse existing diagnostics instead of inventing another browser state path (source: preloaded `S04-SUMMARY.md`).
- `src/bridge/server.mjs` shows the current canonical bridge contract, validated write boundary, and invalidation-only update/error events (source: local codebase).
- `web/src/bridge-client.ts` shows that the browser already has a reusable status store and mutation helper, but no consultant request type yet (source: local codebase).
- `web/src/editor/engine.ts` shows that full frame box replacement is already supported and can persist width/height changes, which lowers the cost of accept-path resizing (source: local codebase).
- `web/src/editor/Canvas.tsx` shows design-mode frames are already rendered as stable DOM elements with a fixed box, which makes local overflow measurement practical (source: local codebase).
- `tests/utils/bridge-browser.ts` and `tests/web/editor-design-mode.test.ts` show the strongest existing proof pattern is a temp workspace against the real built `dist/cli.js open` runtime (source: local codebase).
- OpenAI’s current docs support strict JSON-schema structured output via `responses.create(... text.format ...)` or chat `response_format: { type: 'json_schema' }`, which is a good fit for box-mutation proposals (source: Context7 `/websites/developers_openai_api`, structured outputs docs).
- Anthropic’s TypeScript SDK now supports structured parsing with `messages.parse()` plus `jsonSchemaOutputFormat()` / `zodOutputFormat()`, which also fits a provider-abstracted box-mutation contract (source: Context7 `/anthropics/anthropic-sdk-typescript`, helpers docs).
