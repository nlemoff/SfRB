# Research Slice S03 ("Local Web Bridge") — Research

**Date:** 2026-03-13

## Summary

S03 primarily owns **R003 — Local Web Editor (Vite/Browser)** and directly supports **R001 — Hybrid Interaction Model** by establishing the bridge S04 will edit through. It also lightly advances **R002 — CLI-First Architecture** because `sfrb open` becomes a first-class CLI entrypoint, but the research target is clearly the browser bridge: launch a local server, open the browser, load the canonical `resume.sfrb.json`, and keep the browser updated when that local file changes.

The codebase is still pre-bridge. Today there is **no `open` command, no Vite/React dependency, no server process management, no browser app, and no file-watching layer**. The strongest reuse surfaces are the existing CLI command pattern in `src/cli.ts` / `src/commands/init.ts` and the strict document boundary in `src/document/store.ts`, especially `readWorkspaceDocument()`. Two implementation surprises materially constrain the slice. First, **Vite 8 is ESM-only**, while the current CLI compiles to **CommonJS**; in this repo’s TypeScript settings, `import('vite')` transpiles to `require('vite')`, which will break if used naively from the current CLI build. Second, Vite already exposes a **server WebSocket/HMR channel for custom events**, which means S03 likely does **not** need to add a separate `ws` server just to push document-change notifications to the client.

## Recommendation

Implement S03 as a **thin CLI launcher + Vite bridge plugin + minimal client shell**:

1. **CLI entrypoint**
   - Add `sfrb open` as a real Commander command.
   - Keep it responsible for workspace path resolution and process startup, not document parsing/rendering.
   - Reuse the `runInitCommand()` pattern: return exit codes, keep errors human-readable, and route all workspace file access through existing stores.

2. **Separate ESM bridge runtime**
   - Do **not** try to import Vite directly from the current CommonJS-compiled CLI modules.
   - Prefer a small ESM bridge runner (for example an `.mjs` file or a separate NodeNext/Nodenext-targeted bridge entry) that the CLI launches.
   - Let that bridge runner own `createServer(...)`, browser opening, custom middleware/routes, and file watching.

3. **One authoritative document boundary**
   - Load the current document through `readWorkspaceDocument(projectRoot)` for browser-facing reads so S03 respects workspace physics immediately.
   - Watch `resume.sfrb.json` directly, plus `sfrb.config.json` if the browser must react to physics-mode changes without restart.
   - If S03 adds any write-back surface early, it should go through `writeDocument()` rather than bypassing validation.

4. **Use Vite’s built-in dev server primitives instead of hand-rolled realtime plumbing**
   - Use Vite’s JavaScript API to start the server.
   - Use `server.open` or equivalent startup behavior to open the default browser instead of adding a browser-launch dependency.
   - Use custom Vite HMR/WebSocket events (`server.ws.send({ type: 'custom', ... })` on the server and `import.meta.hot.on(...)` on the client) for live document refresh rather than standing up a second WebSocket server unless S04/S05 later need bidirectional collaboration semantics.

This keeps S03 focused on the slice promise: local server + browser + live file bridge. It also preserves future flexibility: S04 can layer interactive editing on top of the same bridge, and S05 can later add preview/agent overlays without replacing the transport.

## Don’t Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| CLI command surface | `commander` pattern already used in `src/cli.ts` and `src/commands/init.ts` | Keeps `sfrb open` consistent with the shipped `init` command and existing exit-code/error conventions. |
| Workspace document loading | `readWorkspaceDocument()` / `writeDocument()` | Preserves the strict schema + physics-aware validation S02 already established. |
| Browser opening | Vite `server.open` behavior | Avoids adding an `open`/`opn` dependency or hand-rolling per-OS shell commands. |
| Server-to-client live updates | Vite custom HMR/WebSocket events | Reuses Vite’s existing dev connection instead of adding a second realtime transport for one-way document sync. |
| File-boundary diagnostics | `ConfigValidationError`, `DocumentValidationError`, `MissingWorkspaceConfigError` patterns | Gives S03 actionable workspace-path errors with almost no new error-shaping design work. |
| Integration verification | `vitest` + temp workspace pattern from current tests | Matches how S01/S02 proved real filesystem boundaries instead of mocked flows. |

## Existing Code and Patterns

- `src/cli.ts` — current CLI root. Only `init` is registered; `open` must be added here to become a real first-class command.
- `src/commands/init.ts` — best existing command pattern for option parsing, exit codes, redaction-safe logging, and centralized store usage.
- `src/config/store.ts` — authoritative config file boundary. S03 should reuse `getConfigPath()`/`readConfig()` behavior instead of reading raw JSON ad hoc.
- `src/document/store.ts` — authoritative document boundary. `SFRB_DOCUMENT_FILE` is already fixed as `resume.sfrb.json`; `readWorkspaceDocument()` is the correct browser-facing read path.
- `src/document/validation.ts` — physics-aware validation already exists, including helpful missing-config and mismatch diagnostics. S03 should surface these, not re-implement them.
- `src/document/schema.ts` — confirms the client will be rendering linked semantic blocks and optional layout frames, not arbitrary HTML blobs.
- `tests/cli/init-command.test.ts` — strongest example of how command-level integration tests are written in this repo: temp dirs, real writes, explicit stdout/stderr assertions.
- `tests/document/document-validation.test.ts` — shows exactly which physics-sensitive failures S03 must preserve when reading the document for the browser.
- `package.json` — confirms there are currently no web/editor dependencies at all; S03 will be the first slice to add them.
- `tsconfig.json` — critical constraint: root build emits CommonJS from `src/**/*.ts` only. A Vite bridge/client cannot be dropped into the existing build naively.

## Constraints

- **S03’s owned requirement is R003.** The slice must launch a local server and open a browser, not just create internal library code.
- **S03 supports R001.** The bridge must preserve stable IDs, semantic/layout linkage, and live document visibility so S04 can edit through it without inventing a second state model.
- **Physics remains workspace-owned.** `workspace.physics` in `sfrb.config.json` is already the source of truth; S03 must consume that through `readWorkspaceDocument()` instead of duplicating mode state into the client bootstrap payload.
- **`resume.sfrb.json` is the explicit file contract.** S03 should watch that file directly rather than introducing a bridge-specific filename.
- **The repo currently builds to CommonJS only.** `tsconfig.json` compiles `src/**/*.ts` with `"module": "CommonJS"`; this collides with Vite’s ESM-only runtime if imported directly.
- **Vite 8 requires modern Node.** The current project engine range (`>=20`) is broad enough for the repo, but Vite 8 itself declares `^20.19.0 || >=22.12.0`; S03 should pin a compatible version deliberately or tighten engine expectations.
- **No browser UI stack exists yet.** S03 will need to introduce the initial client structure (likely React + ReactDOM if following the milestone context), not just server code.
- **The slice should stay light on native/runtime complexity.** The milestone and decisions prefer a plain Node + browser architecture, not Electron/Tauri or heavy native watchers.

## Common Pitfalls

- **Importing Vite from the existing CJS build** — in this repo’s TS config, dynamic `import('vite')` transpiles to `require('vite')`, which is incompatible with Vite 8’s ESM package. **Avoidance:** launch an ESM bridge runner or move the bridge entry to a NodeNext/ESM boundary.
- **Adding a second WebSocket layer too early** — a standalone `ws` server adds lifecycle, port, heartbeat, and shutdown complexity. **Avoidance:** start with Vite custom HMR events for file-to-browser sync unless true bidirectional protocol needs appear.
- **Bypassing `readWorkspaceDocument()`** — reading raw JSON directly can let the browser display an invalid or physics-incompatible document. **Avoidance:** load through the existing validated store boundary.
- **Watching only the document file** — if the browser UI depends on workspace physics, changing `sfrb.config.json` could leave the client out of sync. **Avoidance:** either watch both files or clearly document that `open` must be restarted after config changes.
- **Letting CLI and bridge invent separate state shapes** — S04/S05 will become fragile if the client bootstrap payload drifts from `SfrbDocument`. **Avoidance:** send the canonical parsed document shape to the browser unchanged or with minimal metadata wrapping.
- **Treating Vite as just a static file server** — then you miss built-in browser-open behavior, HMR transport, and plugin hooks that solve most of S03’s glue problems. **Avoidance:** use the JavaScript API and plugin hooks intentionally.

## Open Risks

- **ESM boundary choice could spill into the repo layout.** If S03 picks an awkward interop strategy, later slices may inherit unnecessary build complexity.
- **The first client scaffold may set a sticky architecture.** Choosing where the web app lives (`web/`, `src/bridge/`, separate tsconfig, etc.) affects S04 editor work immediately.
- **Live-sync semantics are still slightly ambiguous.** S03 clearly needs filesystem → browser sync; browser → filesystem mutation may be partially deferred to S04, so the implementation boundary should be explicit.
- **Config/document race behavior is unproven.** Rapid successive writes from CLI/tests/editor may surface duplicate watcher events or stale client state if the bridge protocol is too naive.
- **No current acceptance harness exists for `sfrb open`.** S03 will likely need both command-level tests and at least one smoke-style process verification to prove server startup and document availability.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Vite | `antfu/skills@vite` | available (not installed) |
| React | `vercel-labs/agent-skills@vercel-react-best-practices` | available (not installed) |
| WebSocket / realtime transport | `jeffallan/claude-skills@websocket-engineer` | available (not installed) |
| Browser UI styling | `frontend-design` | installed locally, but not core to the bridge research itself |
| Local web bridge core techs in other installed skills | none directly relevant | none installed |

Install commands if the user wants them later:
- `npx skills add antfu/skills@vite`
- `npx skills add vercel-labs/agent-skills@vercel-react-best-practices`
- `npx skills add jeffallan/claude-skills@websocket-engineer`

## Sources

- S03 primarily owns **R003** and supports **R001**; `sfrb open` is the key active requirement for this slice (source: `REQUIREMENTS.md`).
- The milestone context and roadmap expect S03 to spawn a Vite-backed local server, open the browser, and live-sync the local document boundary established by S02 (source: preloaded milestone context and roadmap).
- `src/cli.ts` currently registers only `init`, confirming that `open` does not exist yet (source: local codebase).
- `src/commands/init.ts` is the repo’s command implementation model for option parsing, exit-code handling, and store-driven writes (source: local codebase).
- `src/document/store.ts` and `src/document/validation.ts` already provide the canonical workspace-aware read path and authoritative `resume.sfrb.json` file contract S03 should reuse (source: local codebase).
- `tests/document/document-validation.test.ts` proves S03 must preserve physics-aware acceptance and failure behavior when loading workspace documents (source: local codebase).
- Vite’s JavaScript API supports programmatic server startup via `createServer(...)`, and `server.open` can open the default browser (source: https://vite.dev/guide/api-javascript, https://vite.dev/config/server-options).
- Vite supports custom server-to-client events over its existing HMR/WebSocket channel, which is enough for live document refresh notifications (source: https://vite.dev/guide/api-plugin, https://vite.dev/guide/api-hmr, https://vite.dev/guide/api-environment-plugins).
- Vite 8 is published as an ESM package and declares Node support `^20.19.0 || >=22.12.0` (source: local `npm view vite ...` inspection).
- Local TypeScript transpilation in this repo shows `import('vite')` under `module: CommonJS` becomes `require('vite')`; this is the most important interop surprise for S03 (source: local `typescript.transpileModule(...)` check).
- If a separate WebSocket layer is ever needed later, `ws` already provides straightforward broadcast and heartbeat patterns, but it should be deferred unless Vite’s built-in channel proves insufficient (source: `/websockets/ws` Context7 docs, originally from the `ws` README).
