---
estimated_steps: 4
estimated_files: 6
---

# T01: Add the bridge-backed consultant contract and provider safety boundary

**Slice:** S05 — AI Layout Consultant
**Milestone:** M001

## Description

Close the highest-risk boundary first by making the bridge the only place that can turn workspace AI config plus process env secrets into a structured frame-resize proposal. This task should produce a typed consultant route, a small provider abstraction with local proposal safety checks, and contract coverage for both happy-path and failure-path behavior without writing to the canonical document.

## Steps

1. Add a consultant service module that accepts the canonical document plus target frame context, calls the configured provider through a tightly-scoped structured-output contract, and normalizes results into either a safe resize proposal or an actionable unavailable/error outcome.
2. Wire a dedicated consultant bridge route that reads provider settings from `sfrb.config.json`, resolves the actual secret from `process.env`, rejects missing/unsupported configuration early, and never returns raw provider responses or secrets to the browser.
3. Extend `web/src/bridge-client.ts` with typed consultant request/response helpers so the browser can ask for proposals without depending on raw fetch shapes.
4. Add a bridge contract test that proves successful proposal responses, missing-secret or provider-unavailable failures, malformed-provider-output rejection, and no canonical write on consultant-only requests.

## Must-Haves

- [ ] Consultant responses are schema-checked and limited to safe frame resize proposals targeting an existing frame.
- [ ] Missing secret, unsupported provider, and malformed provider output each surface as distinct inspectable failures.
- [ ] Consultant requests do not mutate `resume.sfrb.json` or bypass `/__sfrb/editor`.

## Verification

- `npm test -- --run tests/bridge/bridge-layout-consultant-contract.test.ts`
- Confirm the test asserts both success payload shape and unchanged canonical document state on consultant failure paths.

## Observability Impact

- Signals added/changed: consultant bridge status/result codes and proposal validation failures.
- How a future agent inspects this: bridge contract test output plus direct consultant route responses in a temp workspace.
- Failure state exposed: configuration missing, provider unavailable, malformed proposal, and safe rejection before any canonical mutation.

## Inputs

- `src/bridge/server.mjs` — existing canonical runtime boundary and validated editor write route.
- `web/src/bridge-client.ts` — existing typed bootstrap/editor client helpers to extend with consultant helpers.
- S05 research summary — consultant calls must stay behind the bridge because the browser only knows the env-var name, not the secret.

## Expected Output

- `src/agent/LayoutConsultant.ts` — provider-backed structured proposal service with local safety validation.
- `src/bridge/server.mjs` — consultant route wired into the existing bridge runtime.
- `web/src/bridge-client.ts` — typed consultant request/response helper.
- `tests/bridge/bridge-layout-consultant-contract.test.ts` — executable proof of consultant contract success and failure behavior.
