# Architecture

SfRB is a local-first, CLI-first resume editor. The entire product is organized around **one canonical document boundary** mediated by a local HTTP bridge.

## Components

```
+-------------------+         spawn          +--------------------------+
|  sfrb CLI         |  -------------------->  |  Bridge (Vite dev server)|
|  src/cli.ts       |                         |  src/bridge/server.mjs   |
|  src/commands/*   |  <-- process events --  |  owns all disk I/O       |
+-------------------+                         +-----------+--------------+
                                                          |
                                          HTTP + Vite HMR | serves
                                                          v
                                              +-----------------------+
                                              |  Web UI (web/src)     |
                                              |  React editor +       |
                                              |  printable surface    |
                                              +-----------------------+

   Canonical files on disk:  resume.sfrb.json   sfrb.config.json
```

- **CLI** (`src/cli.ts`, `src/commands/{init,open,export,template}.ts`) — Commander entry compiled to CommonJS in `dist/`.
- **Bridge** (`src/bridge/server.mjs`) — an ESM Vite dev server. It loads compiled CJS modules from `dist/` with `createRequire`, so you must `npm run build` before running the bridge against `src/` changes. The bridge is the only component that reads and writes workspace files.
- **Web UI** (`web/src/`) — the React editor (`App.tsx`, `editor/`) and the printable surface (`print-main.tsx`, `presentation/`).
- **Document model** (`src/document/`) — the Zod schema, store, validation, and starter workspaces.
- **Config** (`src/config/`) — Zod-validated `sfrb.config.json` (physics mode, AI provider metadata).
- **Layout consultant** (`src/agent/LayoutConsultant.ts`) — the provider boundary for AI overflow proposals.
- **Shared utilities** (`src/utils/`) — the structured logger and metrics registry.

## The canonical document

`resume.sfrb.json` is the single source of truth. It has three coordinated parts:

- **semantic** — content `blocks` and the `sections` that order them.
- **layout** — `pages` and the `frames` that place blocks on pages.
- **metadata** — title, starter info, and optional template binding.

A document is valid only if every cross-reference resolves (sections reference real blocks, frames reference real pages and blocks, no block has more than one frame, etc.). These rules live in `src/document/schema.ts` and `src/document/validation.ts`.

## Physics modes

Workspaces run in one of two physics modes, configured in `sfrb.config.json`:

- **document** — flow layout; fixed layout frames are forbidden.
- **design** — explicit frame placement is allowed.

Physics validation runs at the bridge write path so an invalid mutation never reaches disk.

## Data flow

1. The browser reconciles full state from `GET /__sfrb/bootstrap`.
2. Edits are sent to `POST /__sfrb/editor`. The bridge validates (schema + physics) and, only on success, writes `resume.sfrb.json`.
3. The bridge watches the canonical files; on change it emits an **invalidation signal** over Vite HMR (`sfrb:bridge-update` / `sfrb:bridge-error`). These events are signals, not authoritative payloads, so the browser re-fetches bootstrap.
4. AI requests go to `POST /__sfrb/consultant`; provider secrets and raw provider responses stay bridge-side.

See [bridge-api.md](./bridge-api.md) for the full HTTP contract and [observability.md](./observability.md) for health, metrics, and tracing.

## Module boundaries

ESLint enforces that web code and bridge/server code do not import each other directly. Shared meaning crosses the boundary only as validated payloads over HTTP, never as shared mutable modules.

## Key decisions

Architecture Decision Records live in [adr/](./adr/). Start with [ADR-0002](./adr/0002-canonical-document-and-local-bridge.md) for the rationale behind the canonical-document-plus-local-bridge design.
