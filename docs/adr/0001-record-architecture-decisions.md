# ADR-0001: Record architecture decisions

- Status: Accepted
- Date: 2026-06-25

## Context

The project's design rationale was spread across planning documents and PR descriptions, much of it now archived under `docs/history/`. Contributors and AI agents need a durable, discoverable record of *why* the system is shaped the way it is, separate from day-to-day planning.

## Decision

We will keep Architecture Decision Records (ADRs) in `docs/adr/`, one Markdown file per decision, numbered sequentially. Records are immutable once accepted; superseding a decision means adding a new ADR and updating the old one's status.

## Consequences

- Significant decisions have a single, linkable home.
- New contributors and agents can read the ADR index to understand constraints before changing code.
- A small amount of process overhead is added when making notable decisions.
