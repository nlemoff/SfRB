import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  fetchPrintRoute,
  makeTempProject,
  waitForBridgeReady,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

describe('bridge print surface contract', () => {
  beforeAll(async () => {
    await ensureBuilt();
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('serves /print as HTML with the print surface entry point', async () => {
    const projectRoot = await makeTempProject('sfrb-print-contract-');
    await writeWorkspaceFiles(projectRoot, { physics: 'document' });

    const { child, url } = await waitForBridgeReady(projectRoot);

    try {
      const result = await fetchPrintRoute(url);

      expect(result.status).toBe(200);
      expect(result.contentType).toContain('text/html');
      expect(result.body).toContain('print-main.tsx');
      expect(result.body).toContain('<div id="root"></div>');
    } finally {
      await closeBridge(child);
    }
  });

  it('serves /print?mode=artifact as HTML', async () => {
    const projectRoot = await makeTempProject('sfrb-print-contract-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design' });

    const { child, url } = await waitForBridgeReady(projectRoot);

    try {
      const result = await fetchPrintRoute(url, 'artifact');

      expect(result.status).toBe(200);
      expect(result.contentType).toContain('text/html');
      expect(result.body).toContain('print-main.tsx');
    } finally {
      await closeBridge(child);
    }
  });

  it('still serves the editor at / alongside /print', async () => {
    const projectRoot = await makeTempProject('sfrb-print-contract-');
    await writeWorkspaceFiles(projectRoot, { physics: 'document' });

    const { child, url } = await waitForBridgeReady(projectRoot);

    try {
      const editorResponse = await fetch(url);
      expect(editorResponse.status).toBe(200);
      const editorHtml = await editorResponse.text();
      expect(editorHtml).toContain('main.tsx');

      const printResult = await fetchPrintRoute(url);
      expect(printResult.status).toBe(200);
      expect(printResult.body).toContain('print-main.tsx');
    } finally {
      await closeBridge(child);
    }
  });

  it('bootstrap endpoint is accessible from the print surface context', async () => {
    const projectRoot = await makeTempProject('sfrb-print-contract-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      title: 'Print Bootstrap Test',
    });

    const { child, url } = await waitForBridgeReady(projectRoot);

    try {
      const bootstrapResponse = await fetch(new URL('/__sfrb/bootstrap', url));
      expect(bootstrapResponse.status).toBe(200);
      const payload = await bootstrapResponse.json() as Record<string, unknown>;
      expect(payload).toMatchObject({
        status: 'ready',
        physics: 'design',
      });
    } finally {
      await closeBridge(child);
    }
  });
}, { timeout: 30000 });
