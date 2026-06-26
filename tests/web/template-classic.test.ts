import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';

import {
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  makeTempProject,
  openPrintSurface,
  readPrintSurfaceDiagnostics,
  waitForBridgeReady,
  writeWorkspaceFiles,
  type BridgeBrowserPage,
} from '../utils/bridge-browser';

let browser: Browser;

describe(
  'classic template rendering',
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

    it('renders classic typography on /print and reports the M003 trust contract unchanged', async () => {
      const projectRoot = await makeTempProject('sfrb-template-classic-');
      await writeWorkspaceFiles(projectRoot, {
        physics: 'document',
        starterKind: 'template',
        template: { id: 'classic', version: '1' },
      });

      const { child, url } = await waitForBridgeReady(projectRoot);
      const page = await createPage();

      try {
        await openPrintSurface(page as unknown as BridgeBrowserPage, url);
        const diag = await readPrintSurfaceDiagnostics(page as unknown as BridgeBrowserPage);

        expect(diag.templateId).toBe('classic');
        expect(diag.templateVersion).toBe('1');
        expect(diag.exportState).toBe('ready');
        expect(diag.overflowStatus).toBe('clear');

        const rootFontFamily = await page.$eval(
          '#root',
          (el: Element) => window.getComputedStyle(el as HTMLElement).fontFamily,
        );
        expect(rootFontFamily).toMatch(/Times/);

        const headingStyles = await page.$eval('[data-block-kind="heading"]', (el: Element) => {
          const computed = window.getComputedStyle(el as HTMLElement);
          return { fontSize: computed.fontSize, fontWeight: computed.fontWeight };
        });
        expect(headingStyles.fontSize).toBe('20px');
        expect(['bold', '700']).toContain(headingStyles.fontWeight);

        const bulletStyles = await page.$eval('[data-block-kind="bullet"]', (el: Element) => {
          const computed = window.getComputedStyle(el as HTMLElement);
          return { fontSize: computed.fontSize, paddingLeft: computed.paddingLeft };
        });
        expect(bulletStyles.fontSize).toBe('11px');
        expect(bulletStyles.paddingLeft).toBe('14px');
      } finally {
        await page.close();
        await closeBridge(child);
      }
    });

    it('keeps artifact mode chrome-free for classic template', async () => {
      const projectRoot = await makeTempProject('sfrb-template-classic-artifact-');
      await writeWorkspaceFiles(projectRoot, {
        physics: 'document',
        starterKind: 'template',
        template: { id: 'classic', version: '1' },
      });

      const { child, url } = await waitForBridgeReady(projectRoot);
      const page = await createPage();

      try {
        await openPrintSurface(page as unknown as BridgeBrowserPage, url, 'artifact');
        const diag = await readPrintSurfaceDiagnostics(page as unknown as BridgeBrowserPage);

        expect(diag.templateId).toBe('classic');
        expect(diag.surfaceMode).toBe('artifact');
        expect(diag.hasDiagnosticsPanel).toBe(false);
        expect(diag.exportState).toBe('ready');
      } finally {
        await page.close();
        await closeBridge(child);
      }
    });
  },
  { timeout: 60000 },
);
