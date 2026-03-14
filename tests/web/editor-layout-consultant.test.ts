import http from 'node:http';
import { createRequire } from 'node:module';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  makeTempProject,
  postEditorMutation,
  readWorkspaceDocument,
  waitForBridgeReady,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright') as { chromium: { launch: (options: { headless: boolean }) => Promise<any> } };

type Browser = Awaited<ReturnType<typeof chromium.launch>>;
type Page = Awaited<ReturnType<Browser['newPage']>>;

async function waitForEditorIdle(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    return document.querySelector('#editor-save-status')?.getAttribute('data-save-state') === 'idle';
  });
}

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

describe('editor layout consultant', () => {
  beforeAll(async () => {
    await ensureBuilt();
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('detects overflow, renders a rejectable ghost preview, rejects without writing, and accepts through the canonical editor route', async () => {
    const projectRoot = await makeTempProject('sfrb-editor-layout-consultant-success-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      title: 'Layout Consultant Success',
      blockText: Array.from({ length: 10 }, (_, index) => `Overflow line ${index + 1}: measured frame content should exceed the available body height.`).join('\n'),
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
                  box: { x: 36, y: 48, width: 540, height: 280 },
                  rationale: 'Increase frame height so the overflowing summary can fit without clipping.',
                  confidence: 0.94,
                }),
              },
            },
          ],
        }),
      );
    });

    const beforeDocument = await readWorkspaceDocument(projectRoot);
    const { child, url, stderr } = await waitForBridgeReady(projectRoot, {
      env: {
        OPENAI_API_KEY: 'sk-test-layout-consultant',
        SFRB_OPENAI_BASE_URL: provider.baseUrl,
      },
    });
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });

      await page.waitForSelector('#editor-canvas[data-physics-mode="design"]');
      await page.click('[data-testid="editor-frame-summaryFrame"]');
      await page.waitForFunction(() => {
        return document.querySelector('#consultant-overflow-status')?.getAttribute('data-overflow-status') === 'overflow';
      });

      expect(await page.textContent('#consultant-status')).toContain('idle');
      expect(await page.textContent('#consultant-overflow-status')).toContain('overflow');
      expect(Number(await page.getAttribute('#consultant-measurements', 'data-overflow-px'))).toBeGreaterThan(0);
      expect(await page.getAttribute('#consultant-preview-state', 'data-preview-visible')).toBe('false');

      await page.click('#consultant-request');
      await page.waitForFunction(() => {
        return document.querySelector('#consultant-status')?.getAttribute('data-consultant-state') === 'preview';
      });

      expect(await page.getAttribute('#consultant-preview-state', 'data-preview-visible')).toBe('true');
      expect(await page.textContent('#consultant-rationale')).toContain('Increase frame height');
      expect(await page.locator('[data-testid="consultant-ghost-preview-summaryFrame"]').count()).toBe(1);
      expect(await page.locator('[data-testid="consultant-ghost-preview-summaryFrame"]').getAttribute('data-frame-height')).toBe('280');

      await page.click('#consultant-reject');
      await page.waitForFunction(() => {
        return document.querySelector('#consultant-preview-state')?.getAttribute('data-preview-visible') === 'false';
      });
      expect(await page.textContent('#consultant-state-note')).toContain('rejected');
      expect(await readWorkspaceDocument(projectRoot)).toEqual(beforeDocument);
      expect(await page.locator('#bridge-payload-preview').textContent()).toContain('"height": 96');

      await page.click('#consultant-request');
      await page.waitForFunction(() => {
        return document.querySelector('#consultant-status')?.getAttribute('data-consultant-state') === 'preview';
      });
      await page.click('#consultant-accept');
      await waitForEditorIdle(page);
      await page.waitForFunction(() => {
        return document.querySelector('#consultant-preview-state')?.getAttribute('data-preview-visible') === 'false';
      });
      await page.waitForFunction(() => {
        const signal = document.querySelector('#bridge-last-signal')?.textContent ?? '';
        return signal.includes('sfrb:bridge-update') && signal.includes('resume.sfrb.json');
      });
      await page.waitForFunction(() => {
        return document.querySelector('#consultant-overflow-status')?.getAttribute('data-overflow-status') === 'clear';
      });

      const diskDocument = await readWorkspaceDocument(projectRoot);
      expect((diskDocument.layout as { frames: Array<{ id: string; box: { height: number } }> }).frames[0]).toMatchObject({
        id: 'summaryFrame',
        box: { height: 280 },
      });
      expect(await page.locator('#bridge-payload-preview').textContent()).toContain('"height": 280');
      expect(await page.textContent('#consultant-state-note')).toContain('persisted');
      expect(stderr.join('')).toBe('');
    } finally {
      if (browser) {
        await browser.close();
      }
      await closeBridge(child);
      await provider.close();
    }
  }, 30000);

  it('invalidates a stale preview after canonical changes under it', async () => {
    const projectRoot = await makeTempProject('sfrb-editor-layout-consultant-stale-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      title: 'Layout Consultant Stale Preview',
      blockText: Array.from({ length: 9 }, (_, index) => `Preview invalidation line ${index + 1}.`).join('\n'),
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
                  box: { x: 36, y: 48, width: 540, height: 220 },
                  rationale: 'Temporary preview that should clear when canonical state changes.',
                  confidence: 0.88,
                }),
              },
            },
          ],
        }),
      );
    });

    const { child, url } = await waitForBridgeReady(projectRoot, {
      env: {
        OPENAI_API_KEY: 'sk-test-layout-consultant-stale',
        SFRB_OPENAI_BASE_URL: provider.baseUrl,
      },
    });
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });

      await page.waitForSelector('#editor-canvas[data-physics-mode="design"]');
      await page.click('[data-testid="editor-frame-summaryFrame"]');
      await page.waitForFunction(() => {
        return document.querySelector('#consultant-overflow-status')?.getAttribute('data-overflow-status') === 'overflow';
      });
      await page.click('#consultant-request');
      await page.waitForFunction(() => {
        return document.querySelector('#consultant-preview-state')?.getAttribute('data-preview-visible') === 'true';
      });

      const nextDocument = await readWorkspaceDocument(projectRoot) as {
        layout: { frames: Array<{ id: string; box: { x: number; y: number; width: number; height: number } }> };
      };
      nextDocument.layout.frames = nextDocument.layout.frames.map((frame) => (
        frame.id === 'summaryFrame'
          ? { ...frame, box: { ...frame.box, x: 64, y: 80, width: 520, height: 140 } }
          : frame
      ));
      await postEditorMutation(url, nextDocument as unknown as Record<string, unknown>);

      await waitForEditorIdle(page);
      await page.waitForFunction(() => {
        return document.querySelector('#consultant-preview-state')?.getAttribute('data-preview-visible') === 'false';
      });
      expect(await page.getAttribute('#consultant-panel', 'data-consultant-code')).toBe('preview_stale_cleared');
      expect(await page.textContent('#consultant-state-note')).toContain('canonical document changed');
      expect(await page.locator('[data-testid="consultant-ghost-preview-summaryFrame"]').count()).toBe(0);
      expect(await page.locator('#bridge-payload-preview').textContent()).toContain('"x": 64');
    } finally {
      if (browser) {
        await browser.close();
      }
      await closeBridge(child);
      await provider.close();
    }
  }, 30000);
});
