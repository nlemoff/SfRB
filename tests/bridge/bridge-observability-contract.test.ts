import type { ChildProcess } from 'node:child_process';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  makeTempProject,
  waitForBridgeReady,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

const REQUEST_ID_PATTERN = /^[0-9a-f-]{36}$/;

let activeChild: ChildProcess | undefined;

describe('bridge observability contract', () => {
  beforeAll(async () => {
    await ensureBuilt();
  });

  afterEach(async () => {
    if (activeChild) {
      await closeBridge(activeChild);
      activeChild = undefined;
    }
  });

  afterAll(async () => {
    await cleanupTempProjects();
  });

  it('serves a healthy snapshot with a correlation id and stays silent on stderr', async () => {
    const projectRoot = await makeTempProject();
    await writeWorkspaceFiles(projectRoot, { physics: 'document' });
    const ready = await waitForBridgeReady(projectRoot);
    activeChild = ready.child;

    const response = await fetch(new URL('/__sfrb/health', ready.url));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toMatch(REQUEST_ID_PATTERN);

    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload.status).toBe('ok');
    expect(payload.bridgeState).toBe('ready');
    expect(payload.workspaceRoot).toBe(projectRoot);
    expect(typeof payload.uptimeMs).toBe('number');

    expect(ready.stderr.join('')).toBe('');
  });

  it('exposes Prometheus metrics that count served requests', async () => {
    const projectRoot = await makeTempProject();
    await writeWorkspaceFiles(projectRoot, { physics: 'document' });
    const ready = await waitForBridgeReady(projectRoot);
    activeChild = ready.child;

    await fetch(new URL('/__sfrb/bootstrap', ready.url));

    const response = await fetch(new URL('/__sfrb/metrics', ready.url));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(response.headers.get('x-request-id')).toMatch(REQUEST_ID_PATTERN);

    const body = await response.text();
    expect(body).toContain('# TYPE sfrb_bridge_requests_total counter');
    expect(body).toContain('sfrb_bridge_requests_total{route="/__sfrb/bootstrap"');
    expect(body).toContain('sfrb_bridge_request_duration_seconds_count{route="/__sfrb/bootstrap"}');

    expect(ready.stderr.join('')).toBe('');
  });
});
