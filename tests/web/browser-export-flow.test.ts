import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';

import {
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  makeTempProject,
  waitForBridgeReady,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

let browser: Browser;

describe(
  'browser export flow',
  () => {
    beforeAll(async () => {
      await ensureBuilt();
      browser = await chromium.launch({ headless: true });
    });

    afterEach(async () => {
      await cleanupTempProjects();
    });

    async function createPage(): Promise<Page> {
      return browser.newPage();
    }

    it('shows an export panel in the editor shell', async () => {
      const projectRoot = await makeTempProject('sfrb-browser-export-');
      await writeWorkspaceFiles(projectRoot, {
        physics: 'document',
        blockText: 'Browser export test.',
      });

      const { child, url } = await waitForBridgeReady(projectRoot);
      const page = await createPage();

      try {
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForSelector('[data-testid="export-panel"]');

        const exportPanel = await page.$('[data-testid="export-panel"]');
        expect(exportPanel).not.toBeNull();

        const exportLabel = await page.textContent('#export-state-label');
        expect(exportLabel).toBeDefined();
      } finally {
        await page.close();
        await closeBridge(child);
      }
    });

    it('probes the export surface and reflects readiness state', async () => {
      const projectRoot = await makeTempProject('sfrb-browser-export-probe-');
      await writeWorkspaceFiles(projectRoot, {
        physics: 'document',
        blockText: 'Short content.',
      });

      const { child, url } = await waitForBridgeReady(projectRoot);
      const page = await createPage();

      try {
        await page.goto(url, { waitUntil: 'networkidle' });

        // Wait for the export probe to complete
        await page.waitForFunction(
          () => {
            const panel = document.querySelector('#export-panel');
            const state = panel?.getAttribute('data-export-state');
            return state !== 'loading';
          },
          undefined,
          { timeout: 15000 },
        );

        const exportState = await page.getAttribute('#export-panel', 'data-export-state');
        expect(exportState).toBe('ready');

        const note = await page.textContent('#export-state-note');
        expect(note).toContain('ready');
      } finally {
        await page.close();
        await closeBridge(child);
      }
    });

    it('enables the preview button when export is ready', async () => {
      const projectRoot = await makeTempProject('sfrb-browser-export-btn-');
      await writeWorkspaceFiles(projectRoot, {
        physics: 'document',
        blockText: 'Export button test.',
      });

      const { child, url } = await waitForBridgeReady(projectRoot);
      const page = await createPage();

      try {
        await page.goto(url, { waitUntil: 'networkidle' });

        await page.waitForFunction(
          () => {
            const panel = document.querySelector('#export-panel');
            return panel?.getAttribute('data-export-state') === 'ready';
          },
          undefined,
          { timeout: 15000 },
        );

        const isDisabled = await page.$eval('#export-preview', (el: Element) => {
          return (el as HTMLButtonElement).disabled;
        });
        expect(isDisabled).toBe(false);
      } finally {
        await page.close();
        await closeBridge(child);
      }
    });

    it('does not show editor chrome on the export surface', async () => {
      const projectRoot = await makeTempProject('sfrb-browser-export-chrome-');
      await writeWorkspaceFiles(projectRoot, {
        physics: 'document',
        blockText: 'No chrome test.',
      });

      const { child, url } = await waitForBridgeReady(projectRoot);
      const page = await createPage();

      try {
        // Navigate directly to the print surface
        await page.goto(new URL('/print', url).href, { waitUntil: 'networkidle' });

        await page.waitForFunction(
          () => {
            const root = document.getElementById('root');
            return (
              root?.getAttribute('data-export-state') !== null &&
              root?.getAttribute('data-blocked-reason') !== 'loading'
            );
          },
          undefined,
          { timeout: 10000 },
        );

        // Editor chrome should not be present
        const editorCanvas = await page.$('#editor-canvas');
        expect(editorCanvas).toBeNull();

        const consultantPanel = await page.$('#consultant-panel');
        expect(consultantPanel).toBeNull();

        // But canonical content should be there
        const bodyText = await page.textContent('body');
        expect(bodyText).toContain('No chrome test.');
      } finally {
        await page.close();
        await closeBridge(child);
      }
    });
  },
  { timeout: 60000 },
);
