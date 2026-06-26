## Summary

<!-- What does this change do, and why? Focus on intent over mechanics. -->

## Related issues

<!-- e.g. Closes #123 -->

## Changes

<!-- Bullet the notable changes. -->

-

## Verification

<!-- How did you verify this? Paste commands/output where useful. -->

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run knip`
- [ ] `npm run duplication`
- [ ] `npm run schema:check`
- [ ] `npm test` (or `npm run coverage`)

## Contracts checklist

- [ ] Document mutations still go only through `POST /__sfrb/editor`.
- [ ] No provider secrets in committed config, the browser, or logs.
- [ ] The bridge stays silent on stderr during normal operation.
- [ ] Changes are surgical and match existing style.
