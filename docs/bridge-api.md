# Bridge HTTP API

The bridge (`src/bridge/server.mjs`) serves the web UI and exposes a small HTTP contract under the `/__sfrb/` namespace. All routes are served from `127.0.0.1` on the port chosen at startup.

## Conventions

- Request and response bodies are JSON unless noted.
- Every `/__sfrb/*` response carries an `x-request-id` header (a UUID) for correlation.
- Workspace/document validation failures return structured error payloads with an `issues` array of `{ path, message }`.

## `GET /__sfrb/bootstrap`

Returns the full, authoritative workspace state. The browser reconciles from here; bridge update events are invalidation signals, not payloads.

- `200` with `{ status: "ready", workspaceRoot, documentPath, configPath, physics, starter, ai, document }`.
- `409` with an error payload when the workspace cannot be loaded.

## `POST /__sfrb/editor`

The only path that mutates `resume.sfrb.json`. The body must be `{ "document": <full document> }`. The bridge runs schema validation and physics validation before writing.

- `200` `{ ok: true, status: "saved", saveState: "idle", ... , savedAt }`.
- `400` `request_invalid` — malformed JSON or missing `document`.
- `409` `physics_invalid` — violates the workspace physics mode.
- `422` `document_invalid` — fails schema validation or missing config.
- `500` `persistence_failed` — unexpected write failure.

The last good state is preserved on any failure.

## `POST /__sfrb/consultant`

Requests an AI layout proposal for an overflowing frame. Provider secrets and raw provider responses never leave the bridge; the browser receives only a validated proposal or a sanitized failure.

- `200` `{ ok: true, proposal, provider, ... }`.
- `400` `request_invalid` — body failed validation.
- `422` `configuration_missing` / `provider_unsupported` / `frame_not_found`.
- `502` `malformed_provider_output` / `proposal_rejected`.
- `503` `provider_unavailable`.

## `GET /__sfrb/health`

Liveness/readiness probe.

- `200` `{ status: "ok", bridgeState: "ready", workspaceRoot, documentPath, configPath, uptimeMs }` when the workspace is loaded.
- `503` `{ status: "degraded", ... }` when the workspace is in an error state.

## `GET /__sfrb/metrics`

Prometheus text exposition (`text/plain; version=0.0.4`). Includes:

- `sfrb_bridge_requests_total{route,status}` — counter of served requests.
- `sfrb_bridge_request_duration_seconds_sum{route}` and `_count{route}` — latency summary.

## Other routes

- `GET /` — the React editor shell.
- `GET /print` and `GET /print?mode=artifact` — the printable surface.

## Live update events (Vite HMR)

The bridge emits custom events over the Vite websocket when canonical files change:

- `sfrb:bridge-update` — workspace reloaded successfully; re-fetch bootstrap.
- `sfrb:bridge-error` — reload failed; payload carries the error and changed paths.
