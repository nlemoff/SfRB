import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { requestLayoutConsultantProposal } from '../../src/agent/LayoutConsultant';
import type { SfrbDocument } from '../../src/document/schema';
import {
  BRIDGE_BOOTSTRAP_PATH,
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  makeTempProject,
  postConsultantRequest,
  readWorkspaceDocument,
  waitForBridgeReady,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

describe('bridge layout consultant contract', () => {
  beforeAll(async () => {
    await ensureBuilt();
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('returns a safe resize proposal through the bridge without mutating the canonical document', async () => {
    const projectRoot = await makeTempProject('sfrb-consultant-success-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      title: 'Consultant Success',
      blockText: 'Overflowing summary text that needs more room.',
      provider: 'deepseek',
      apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    });

    const provider = await createOpenAiStubServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  frameId: 'summaryFrame',
                  box: { x: 36, y: 48, width: 540, height: 180 },
                  rationale: 'Increase frame height to fit the measured overflow.',
                  confidence: 0.91,
                }),
              },
            },
          ],
        }),
      );
    });

    const beforeDocument = await readWorkspaceDocument(projectRoot);
    const beforeRaw = await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8');
    const { child, url, stderr } = await waitForBridgeReady(projectRoot, {
      env: {
        DEEPSEEK_API_KEY: '***',
        SFRB_DEEPSEEK_BASE_URL: provider.baseUrl,
      },
    });

    try {
      const result = await postConsultantRequest(url, {
        frameId: 'summaryFrame',
        issue: {
          kind: 'overflow',
          measuredContentHeight: 188,
          measuredAvailableHeight: 96,
        },
      });

      expect(result.status).toBe(200);
      expect(result.payload).toMatchObject({
        ok: true,
        status: 'proposal',
        code: 'proposal_ready',
        workspaceRoot: projectRoot,
        documentPath: path.join(projectRoot, 'resume.sfrb.json'),
        configPath: path.join(projectRoot, 'sfrb.config.json'),
        canonicalBootstrapPath: BRIDGE_BOOTSTRAP_PATH,
        provider: 'deepseek',
        apiKeyEnvVar: 'DEEPSEEK_API_KEY',
        proposal: {
          kind: 'frame_resize',
          frameId: 'summaryFrame',
          box: { x: 36, y: 48, width: 540, height: 180 },
          rationale: 'Increase frame height to fit the measured overflow.',
          confidence: 0.91,
        },
      });
      expect(JSON.stringify(result.payload)).not.toContain('sk-test-success');

      const afterDocument = await readWorkspaceDocument(projectRoot);
      const afterRaw = await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8');
      expect(afterDocument).toEqual(beforeDocument);
      expect(afterRaw).toBe(beforeRaw);
      expect(stderr.join('')).toBe('');
    } finally {
      await closeBridge(child);
      await provider.close();
    }
  });

  it('surfaces a missing secret as a configuration failure and leaves the canonical document untouched', async () => {
    const projectRoot = await makeTempProject('sfrb-consultant-missing-secret-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      title: 'Consultant Missing Secret',
      blockText: 'No bridge secret available.',
    });

    const beforeRaw = await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8');
    const env = { ...process.env };
    delete env.OPENAI_API_KEY;
    const { child, url } = await waitForBridgeReady(projectRoot, {
      env,
    });

    try {
      const result = await postConsultantRequest(url, {
        frameId: 'summaryFrame',
        issue: {
          kind: 'overflow',
          measuredContentHeight: 164,
          measuredAvailableHeight: 96,
        },
      });

      expect(result.status).toBe(422);
      expect(result.payload).toMatchObject({
        ok: false,
        status: 'error',
        code: 'configuration_missing',
        workspaceRoot: projectRoot,
        documentPath: path.join(projectRoot, 'resume.sfrb.json'),
        configPath: path.join(projectRoot, 'sfrb.config.json'),
        canonicalBootstrapPath: BRIDGE_BOOTSTRAP_PATH,
        provider: 'openai',
        apiKeyEnvVar: 'OPENAI_API_KEY',
      });
      expect(String(result.payload.message)).toContain('OPENAI_API_KEY');
      expect(JSON.stringify(result.payload)).not.toContain('sk-test');

      const afterRaw = await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8');
      expect(afterRaw).toBe(beforeRaw);
    } finally {
      await closeBridge(child);
    }
  });

  it('surfaces provider-unavailable and malformed-output failures distinctly without writing the canonical document', async () => {
    const projectRoot = await makeTempProject('sfrb-consultant-provider-failures-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      title: 'Consultant Provider Failures',
      blockText: 'Provider failure coverage.',
    });

    const beforeRaw = await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8');
    const unavailableProvider = await createOpenAiStubServer((_request, response) => {
      response.writeHead(503, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'temporary upstream outage' } }));
    });

    const unavailableBridge = await waitForBridgeReady(projectRoot, {
      env: {
        OPENAI_API_KEY: 'sk-test-unavailable',
        SFRB_OPENAI_BASE_URL: unavailableProvider.baseUrl,
      },
    });

    try {
      const unavailable = await postConsultantRequest(unavailableBridge.url, {
        frameId: 'summaryFrame',
        issue: {
          kind: 'overflow',
          measuredContentHeight: 170,
          measuredAvailableHeight: 96,
        },
      });

      expect(unavailable.status).toBe(503);
      expect(unavailable.payload).toMatchObject({
        ok: false,
        status: 'unavailable',
        code: 'provider_unavailable',
        workspaceRoot: projectRoot,
        provider: 'openai',
        apiKeyEnvVar: 'OPENAI_API_KEY',
      });
      expect(String(unavailable.payload.message)).toContain('status 503');
      expect(JSON.stringify(unavailable.payload)).not.toContain('temporary upstream outage');
      expect(JSON.stringify(unavailable.payload)).not.toContain('sk-test-unavailable');
    } finally {
      await closeBridge(unavailableBridge.child);
      await unavailableProvider.close();
    }

    const malformedProvider = await createOpenAiStubServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '{"frameId":"summaryFrame","box":{"x":36,"y":48,"width":540}}',
              },
            },
          ],
        }),
      );
    });

    const malformedBridge = await waitForBridgeReady(projectRoot, {
      env: {
        OPENAI_API_KEY: 'sk-test-malformed',
        SFRB_OPENAI_BASE_URL: malformedProvider.baseUrl,
      },
    });

    try {
      const malformed = await postConsultantRequest(malformedBridge.url, {
        frameId: 'summaryFrame',
        issue: {
          kind: 'overflow',
          measuredContentHeight: 172,
          measuredAvailableHeight: 96,
        },
      });

      expect(malformed.status).toBe(502);
      expect(malformed.payload).toMatchObject({
        ok: false,
        status: 'error',
        code: 'malformed_provider_output',
        workspaceRoot: projectRoot,
        provider: 'openai',
        apiKeyEnvVar: 'OPENAI_API_KEY',
      });
      expect(malformed.payload.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'box.height' }),
          expect.objectContaining({ path: 'rationale' }),
        ]),
      );
      expect(JSON.stringify(malformed.payload)).not.toContain('sk-test-malformed');

      const afterRaw = await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8');
      expect(afterRaw).toBe(beforeRaw);
    } finally {
      await closeBridge(malformedBridge.child);
      await malformedProvider.close();
    }
  });

  it('distinguishes provider auth and rate-limit failures without writing the canonical document', async () => {
    const projectRoot = await makeTempProject('sfrb-consultant-auth-rate-limit-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      title: 'Consultant Auth Failures',
      blockText: 'Auth and rate-limit coverage.',
    });

    const beforeRaw = await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8');
    const authProvider = await createOpenAiStubServer((_request, response) => {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'invalid api key supplied' } }));
    });

    const authBridge = await waitForBridgeReady(projectRoot, {
      env: {
        OPENAI_API_KEY: 'sk-test-auth-failure',
        SFRB_OPENAI_BASE_URL: authProvider.baseUrl,
      },
    });

    try {
      const auth = await postConsultantRequest(authBridge.url, {
        frameId: 'summaryFrame',
        issue: {
          kind: 'overflow',
          measuredContentHeight: 168,
          measuredAvailableHeight: 96,
        },
      });

      expect(auth.status).toBe(502);
      expect(auth.payload).toMatchObject({
        ok: false,
        status: 'error',
        code: 'provider_auth',
        workspaceRoot: projectRoot,
        provider: 'openai',
        apiKeyEnvVar: 'OPENAI_API_KEY',
      });
      expect(String(auth.payload.message)).toContain('status 401');
      expect(JSON.stringify(auth.payload)).not.toContain('invalid api key supplied');
      expect(JSON.stringify(auth.payload)).not.toContain('sk-test-auth-failure');
    } finally {
      await closeBridge(authBridge.child);
      await authProvider.close();
    }

    const rateLimitedProvider = await createOpenAiStubServer((_request, response) => {
      response.writeHead(429, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'rate limit exceeded for org' } }));
    });

    const rateLimitedBridge = await waitForBridgeReady(projectRoot, {
      env: {
        OPENAI_API_KEY: 'sk-test-rate-limited',
        SFRB_OPENAI_BASE_URL: rateLimitedProvider.baseUrl,
      },
    });

    try {
      const rateLimited = await postConsultantRequest(rateLimitedBridge.url, {
        frameId: 'summaryFrame',
        issue: {
          kind: 'overflow',
          measuredContentHeight: 168,
          measuredAvailableHeight: 96,
        },
      });

      expect(rateLimited.status).toBe(503);
      expect(rateLimited.payload).toMatchObject({
        ok: false,
        status: 'unavailable',
        code: 'provider_rate_limited',
        workspaceRoot: projectRoot,
        provider: 'openai',
        apiKeyEnvVar: 'OPENAI_API_KEY',
      });
      expect(String(rateLimited.payload.message)).toContain('status 429');
      expect(JSON.stringify(rateLimited.payload)).not.toContain('rate limit exceeded for org');
      expect(JSON.stringify(rateLimited.payload)).not.toContain('sk-test-rate-limited');

      const afterRaw = await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8');
      expect(afterRaw).toBe(beforeRaw);
    } finally {
      await closeBridge(rateLimitedBridge.child);
      await rateLimitedProvider.close();
    }
  });

  it('rejects proposals that leave the page bounds and keeps the canonical document untouched', async () => {
    const projectRoot = await makeTempProject('sfrb-consultant-off-page-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      title: 'Consultant Off Page',
      blockText: 'Bounds rejection coverage.',
    });

    const beforeRaw = await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8');
    const offPageProvider = await createOpenAiStubServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  frameId: 'summaryFrame',
                  box: { x: 36, y: 48, width: 5000, height: 9000 },
                  rationale: 'Make the frame enormous.',
                  confidence: 0.9,
                }),
              },
            },
          ],
        }),
      );
    });

    const bridge = await waitForBridgeReady(projectRoot, {
      env: {
        OPENAI_API_KEY: 'sk-test-off-page',
        SFRB_OPENAI_BASE_URL: offPageProvider.baseUrl,
      },
    });

    try {
      const result = await postConsultantRequest(bridge.url, {
        frameId: 'summaryFrame',
        issue: {
          kind: 'overflow',
          measuredContentHeight: 168,
          measuredAvailableHeight: 96,
        },
      });

      expect(result.status).toBe(502);
      expect(result.payload).toMatchObject({
        ok: false,
        status: 'error',
        code: 'proposal_rejected',
        workspaceRoot: projectRoot,
        provider: 'openai',
        apiKeyEnvVar: 'OPENAI_API_KEY',
      });
      expect(result.payload.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'box.width' }),
          expect.objectContaining({ path: 'box.height' }),
        ]),
      );
      expect(JSON.stringify(result.payload)).not.toContain('sk-test-off-page');

      const afterRaw = await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8');
      expect(afterRaw).toBe(beforeRaw);
    } finally {
      await closeBridge(bridge.child);
      await offPageProvider.close();
    }
  });

  it('reports unsupported providers distinctly before any browser-facing bridge serialization', async () => {
    const projectRoot = await makeTempProject('sfrb-consultant-unsupported-provider-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      provider: 'openai',
      apiKeyEnvVar: 'OPENAI_API_KEY',
    });

    const document = (await readWorkspaceDocument(projectRoot)) as SfrbDocument;
    const result = await requestLayoutConsultantProposal({
      provider: 'unsupported-provider',
      apiKey: 'sk-test-unsupported',
      document,
      request: {
        frameId: 'summaryFrame',
        issue: {
          kind: 'overflow',
          measuredContentHeight: 150,
          measuredAvailableHeight: 96,
        },
      },
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'error',
      code: 'provider_unsupported',
      provider: 'unsupported-provider',
    });
    expect(JSON.stringify(result)).not.toContain('sk-test-unsupported');
  });
});

async function createOpenAiStubServer(
  handler: (request: http.IncomingMessage, response: http.ServerResponse<http.IncomingMessage>) => void,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = http.createServer((request, response) => {
    if (request.method !== 'POST' || request.url !== '/chat/completions') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    handler(request, response);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve stub provider address.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
