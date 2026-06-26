# Data Handling and Privacy

SfRB is **local-first**. This document describes what data exists, where it lives, and the only path by which any of it leaves the user's machine.

## What data exists

- **`resume.sfrb.json`** — the canonical resume document. It contains whatever personal information (PII) the user enters: name, contact details, work history, education, and free-form text.
- **`sfrb.config.json`** — workspace configuration: physics mode and AI provider metadata (provider name and the *name* of the environment variable that holds the API key). It does **not** contain the key itself.
- **Exported artifacts** — generated PDFs written to the workspace.

All of the above live on the user's local filesystem. SfRB has no backend, no telemetry, and no analytics. The application does not transmit the document anywhere on its own.

## The one egress path: the AI consultant

The document leaves the machine only when **all** of the following are true:

1. The workspace config declares an AI `provider` and an `apiKeyEnvVar`.
2. The referenced environment variable holds a valid key.
3. The user explicitly requests a layout consultant proposal.

In that case, the bridge sends the relevant document context to the configured provider (e.g. OpenAI-compatible endpoints) to compute an overflow proposal. Operators who must avoid any egress can simply leave AI unconfigured; text and tile editing work fully offline.

## Secret handling

- API keys are read by the **bridge** from environment variables. They are never stored in committed files, never sent to the browser, and never logged.
- The structured logger redacts secret-like fields before emitting any record (see [observability.md](./observability.md)).
- Raw provider responses stay bridge-side; the browser receives only validated proposals or sanitized failures.

## PII in logs and telemetry

- Logging is silent by default. When enabled, log records contain operational metadata (route, status, duration, request id), not document content.
- Metrics are aggregate counters and latencies with low-cardinality labels (route, status). They contain no PII.

## Data retention and deletion

Because all state is local files, deleting a workspace directory removes all associated data. There is nothing stored server-side to purge.

## Reporting concerns

Security and privacy concerns should follow [SECURITY.md](../SECURITY.md). Do not file public issues for sensitive reports.
