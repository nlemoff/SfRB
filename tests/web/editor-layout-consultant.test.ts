import { createRequire } from 'node:module';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  acceptConsultantPreview,
  cleanupTempProjects,
  closeBridge,
  createOpenAiStubServer,
  ensureBuilt,
  makeTempProject,
  openDesignWorkspace,
  postEditorMutation,
  readConsultantDiagnostics,
  readWorkspaceDocument,
  readWorkspaceDocumentRaw,
  rejectConsultantPreview,
  requestConsultantPreview,
  selectConsultantFrame,
  waitForBridgeReady,
  waitForBridgeUpdateSignal,
  waitForConsultantState,
  waitForEditorIdle,
  waitForOverflowStatus,
  waitForPreviewVisibility,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright') as { chromium: { launch: (options: { headless: boolean }) => Promise<any> } };

type Browser = Awaited<ReturnType<typeof chromium.launch>>;
type Page = Awaited<ReturnType<Browser['newPage']>>;

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
                  box: { x: 36, y: 48, width: 540, height: 420 },
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
    const beforeRaw = await readWorkspaceDocumentRaw(projectRoot);
    const { child, url, stderr } = await waitForBridgeReady(projectRoot, {
      env: {
        OPENAI_API_KEY: 'sk-test-layout-consultant',
        SFRB_OPENAI_BASE_URL: provider.baseUrl,
      },
    });
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const page: Page = await browser.newPage();
      await openDesignWorkspace(page, url);
      await selectConsultantFrame(page);
      await waitForOverflowStatus(page, 'overflow');

      const beforePreview = await readConsultantDiagnostics(page);
      expect(beforePreview.consultantState).toBe('idle');
      expect(beforePreview.overflowStatus).toBe('overflow');
      expect(beforePreview.overflowPx).toBeGreaterThan(0);
      expect(beforePreview.previewVisible).toBe(false);
      expect(beforePreview.ghostCount).toBe(0);

      await requestConsultantPreview(page);
      await waitForConsultantState(page, 'preview');

      const preview = await readConsultantDiagnostics(page);
      expect(preview.previewVisible).toBe(true);
      expect(preview.rationale).toContain('Increase frame height');
      expect(preview.ghostCount).toBe(1);
      expect(preview.ghostFrameHeight).toBe('420');

      await rejectConsultantPreview(page);
      await waitForPreviewVisibility(page, false);

      const rejected = await readConsultantDiagnostics(page);
      expect(rejected.consultantCode).toBe('rejected');
      expect(rejected.note).toContain('rejected');
      expect(await readWorkspaceDocument(projectRoot)).toEqual(beforeDocument);
      expect(await readWorkspaceDocumentRaw(projectRoot)).toBe(beforeRaw);
      expect(rejected.payloadPreview).toContain('"height": 96');

      await requestConsultantPreview(page);
      await waitForConsultantState(page, 'preview');
      await acceptConsultantPreview(page);
      await waitForEditorIdle(page);
      await waitForPreviewVisibility(page, false);
      await waitForBridgeUpdateSignal(page);
      await waitForOverflowStatus(page, 'clear');

      const accepted = await readConsultantDiagnostics(page);
      const diskDocument = await readWorkspaceDocument(projectRoot);
      expect((diskDocument.layout as { frames: Array<{ id: string; box: { height: number } }> }).frames[0]).toMatchObject({
        id: 'summaryFrame',
        box: { height: 420 },
      });
      expect(accepted.payloadPreview).toContain('"height": 420');
      expect(accepted.previewVisible).toBe(false);
      expect(accepted.overflowStatus).toBe('clear');
      expect(stderr.join('')).toBe('');
    } finally {
      if (browser) {
        await browser.close();
      }
      await closeBridge(child);
      await provider.close();
    }
  }, 45000);

  it('surfaces a missing consultant secret in the real browser runtime without mutating the canonical document', async () => {
    const projectRoot = await makeTempProject('sfrb-editor-layout-consultant-missing-secret-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      title: 'Layout Consultant Missing Secret',
      blockText: Array.from({ length: 10 }, (_, index) => `Missing secret overflow line ${index + 1}.`).join('\n'),
    });

    const beforeDocument = await readWorkspaceDocument(projectRoot);
    const beforeRaw = await readWorkspaceDocumentRaw(projectRoot);
    const env = { ...process.env };
    delete env.OPENAI_API_KEY;
    const { child, url } = await waitForBridgeReady(projectRoot, { env });
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const page: Page = await browser.newPage();
      await openDesignWorkspace(page, url);
      await selectConsultantFrame(page);
      await waitForOverflowStatus(page, 'overflow');

      await requestConsultantPreview(page);
      await waitForConsultantState(page, 'error');

      const failure = await readConsultantDiagnostics(page);
      expect(failure.previewVisible).toBe(false);
      expect(failure.consultantCode).toBe('configuration_missing');
      expect(failure.errorText).toContain('configuration_missing');
      expect(failure.errorText).toContain('OPENAI_API_KEY');
      expect(failure.payloadPreview).toContain('"height": 96');
      expect(await readWorkspaceDocument(projectRoot)).toEqual(beforeDocument);
      expect(await readWorkspaceDocumentRaw(projectRoot)).toBe(beforeRaw);
    } finally {
      if (browser) {
        await browser.close();
      }
      await closeBridge(child);
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
      const page: Page = await browser.newPage();
      await openDesignWorkspace(page, url);
      await selectConsultantFrame(page);
      await waitForOverflowStatus(page, 'overflow');
      await requestConsultantPreview(page);
      await waitForPreviewVisibility(page, true);

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
      await waitForPreviewVisibility(page, false);
      const staleCleared = await readConsultantDiagnostics(page);
      expect(staleCleared.consultantCode).toBe('preview_stale_cleared');
      expect(staleCleared.note).toContain('canonical document changed');
      expect(staleCleared.ghostCount).toBe(0);
      expect(staleCleared.payloadPreview).toContain('"x": 64');
    } finally {
      if (browser) {
        await browser.close();
      }
      await closeBridge(child);
      await provider.close();
    }
  }, 30000);
});
