# Security Policy

## Supported versions

SfRB is pre-1.0 and ships from `main`. Security fixes target the latest released version and `main`.

| Version | Supported |
| ------- | --------- |
| `main` (latest) | Yes |
| older tags | Best effort |

## Reporting a vulnerability

Please report security issues privately. **Do not open a public GitHub issue for vulnerabilities.**

- Use GitHub's [private vulnerability reporting](https://github.com/nlemoff/SfRB/security/advisories/new) for this repository, or
- Contact the maintainer directly through their GitHub profile.

When reporting, include:

- A description of the issue and its impact.
- Steps to reproduce or a proof of concept.
- Affected version or commit.

We aim to acknowledge reports within 5 business days and to provide a remediation timeline after triage.

## Data and secret handling

SfRB is **local-first**. The canonical document (`resume.sfrb.json`) and workspace config (`sfrb.config.json`) live on the user's machine.

- **Provider API keys** are read by the bridge from environment variables referenced in `sfrb.config.json`. Keys are never stored in committed config, never sent to the browser, and never written to logs.
- The structured logger redacts secret-like fields (`apiKey`, `authorization`, `token`, `secret`, `password`, `cookie`) before emitting any record.
- AI consultant requests only leave the machine when a provider is configured and a request is explicitly made. See [docs/privacy.md](./docs/privacy.md) for what data is transmitted and to whom.

## Dependencies

Dependency updates are automated via Dependabot. Run `npm audit` locally to review advisories; CI surfaces high-severity findings.
