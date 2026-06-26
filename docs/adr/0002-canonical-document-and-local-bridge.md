# ADR-0002: Canonical document mediated by a local bridge

- Status: Accepted
- Date: 2026-06-25

## Context

SfRB is local-first and CLI-first, but the primary editing experience is a browser UI. We need a single source of truth for the resume and a clear owner of disk I/O, without coupling the browser to the filesystem or scattering write logic across the CLI and UI.

## Decision

There is exactly one authoritative document, `resume.sfrb.json`. A local HTTP bridge (`src/bridge/server.mjs`) is the sole owner of disk I/O and the only component that may write the document, and only through the validated `POST /__sfrb/editor` path. The browser reconciles full state from `GET /__sfrb/bootstrap`; file-change events are invalidation signals, not authoritative payloads. Provider secrets stay bridge-side. The schema is defined with Zod and validated at every boundary.

## Consequences

- Every mutation passes schema and physics validation before it can reach disk, so invalid state cannot be persisted.
- The browser never holds privileged secrets or direct filesystem access.
- The bridge is `.mjs` and loads compiled CJS from `dist/`, so `npm run build` is required before running the bridge against `src/` changes.
- A strict module boundary (enforced by ESLint) keeps web and server code decoupled; meaning crosses the boundary only as validated HTTP payloads.
