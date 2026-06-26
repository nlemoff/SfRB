# Runbook: Bridge troubleshooting

The bridge (`src/bridge/server.mjs`) serves the editor and owns all disk I/O. Most "the editor is broken" reports come back to the bridge.

## First, gather signal

```bash
SFRB_LOG_LEVEL=debug node dist/cli.js open --no-open
curl -s http://127.0.0.1:<port>/__sfrb/health        # readiness
curl -s http://127.0.0.1:<port>/__sfrb/metrics       # request volume + latency
```

`x-request-id` on any `/__sfrb/*` response lets you correlate a failing request with its log lines.

## Symptom: bridge exits immediately on `open`

- **Likely cause:** missing or invalid workspace files.
- **Check:** `/__sfrb/health` returns `503` with `status: "degraded"`, or the CLI prints a workspace validation error.
- **Fix:** run `sfrb init` to scaffold, or correct `sfrb.config.json` / `resume.sfrb.json` against the schema (`npm run schema:check`).

## Symptom: edits don't save

- **Likely cause:** the mutation failed schema or physics validation.
- **Check:** the `POST /__sfrb/editor` response code and `issues[]`:
  - `409 physics_invalid` — the change violates the workspace physics mode (e.g. fixed frames in `document` mode).
  - `422 document_invalid` — schema violation or missing config.
- **Fix:** address the reported `path`/`message`. The last good document on disk is never overwritten by a failed write.

## Symptom: stale editor after editing files on disk

- **Likely cause:** the file watcher debounce or a missed invalidation signal.
- **Check:** logs for `sfrb:bridge-update` / `sfrb:bridge-error` events.
- **Fix:** reload the browser tab to force a fresh `GET /__sfrb/bootstrap`.

## Symptom: AI consultant fails

- **Check** the `POST /__sfrb/consultant` failure code:
  - `422 configuration_missing` — provider or `apiKeyEnvVar` not set, or the env var is empty.
  - `503 provider_unavailable` — provider endpoint unreachable.
  - `502 malformed_provider_output` / `proposal_rejected` — provider returned something unusable.
- **Fix:** confirm the provider env var is exported in the bridge's environment. Secrets are read bridge-side only.

## Symptom: bridge writes to stderr (CI contract failure)

- **Cause:** a code path is logging unconditionally instead of through the silent-by-default logger.
- **Fix:** route diagnostics through `src/utils/logger.ts`; it emits nothing unless `SFRB_LOG_LEVEL` is set.

## Escalation

If the workspace document appears corrupted, capture `resume.sfrb.json`, restore from version control or backup, and open an issue with the failing request id and logs.
