# Observability

SfRB ships a lightweight, dependency-free observability layer focused on the bridge, where all I/O and AI calls happen.

## Structured logging

`src/utils/logger.ts` provides a structured JSON logger.

- **Silent by default.** Nothing is emitted unless `SFRB_LOG_LEVEL` is set. This preserves the bridge's clean-stdout/stderr contract (a contract test asserts the bridge writes nothing to stderr during normal operation).
- **Levels:** `debug`, `info`, `warn`, `error`, `silent`. Set with `SFRB_LOG_LEVEL=info`.
- **One JSON object per line**, with `ts`, `level`, `msg`, and any bound context.
- **Child loggers** carry bound context (e.g. `component`, `workspaceRoot`, `requestId`) so related lines correlate.
- **Secret redaction.** `redactSecrets` recursively masks values under secret-like keys (`apiKey`, `authorization`, `token`, `secret`, `password`, `cookie`) before anything is written.

Example:

```bash
SFRB_LOG_LEVEL=info npx sfrb open
```

```json
{"ts":"2026-06-25T10:00:00.000Z","level":"info","msg":"bridge request completed","component":"bridge","requestId":"...","route":"/__sfrb/editor","status":200,"durationSeconds":0.012}
```

## Request correlation (tracing)

Every request to a `/__sfrb/*` route is assigned a UUID `requestId`. The bridge:

- sets it on the response as the `x-request-id` header, and
- includes it in the request-received and request-completed log lines.

This gives end-to-end correlation across a single request without an external tracing backend, and is the seam where an OpenTelemetry exporter would attach.

## Metrics

`src/utils/metrics.ts` is a tiny Prometheus registry. The bridge records one observation per completed request:

- `sfrb_bridge_requests_total{route,status}` — request volume.
- `sfrb_bridge_request_duration_seconds_sum{route}` / `_count{route}` — latency (average = sum / count).

Scrape them at `GET /__sfrb/metrics`:

```bash
curl -s http://127.0.0.1:<port>/__sfrb/metrics
```

## Health checks

`GET /__sfrb/health` returns `200` with `status: "ok"` when the workspace is loaded, or `503` with `status: "degraded"` otherwise. The payload includes `uptimeMs` and the resolved workspace paths. Use it for liveness/readiness probes when running the bridge under a supervisor.

## Operational guidance

Troubleshooting steps for common bridge failures are in [runbooks/bridge-troubleshooting.md](./runbooks/bridge-troubleshooting.md).
