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

describe('print surface template markers', () => {
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

  it('publishes data-template-id="default" when the workspace has no explicit template metadata', async () => {
    const projectRoot = await makeTempProject('sfrb-template-markers-default-');
    await writeWorkspaceFiles(projectRoot, { physics: 'document', blockText: 'Default fallback.' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page = await createPage();

    try {
      await openPrintSurface(page as unknown as BridgeBrowserPage, url);
      const diag = await readPrintSurfaceDiagnostics(page as unknown as BridgeBrowserPage);

      expect(diag.templateId).toBe('default');
      expect(diag.templateVersion).toBe('1');

      // M003 markers must be unchanged and unaffected by the new attributes.
      expect(diag.exportState).toBe('ready');
      expect(diag.overflowStatus).toBe('clear');
      expect(diag.blockedReason).toBe('');
      expect(diag.riskCount).toBe('0');
      expect(diag.maxOverflowPx).toBe('0');
    } finally {
      await page.close();
      await closeBridge(child);
    }
  });

  it('publishes the template markers in artifact mode alongside the M003 markers', async () => {
    const projectRoot = await makeTempProject('sfrb-template-markers-artifact-');
    await writeWorkspaceFiles(projectRoot, { physics: 'document', blockText: 'Artifact fallback.' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page = await createPage();

    try {
      await openPrintSurface(page as unknown as BridgeBrowserPage, url, 'artifact');
      const diag = await readPrintSurfaceDiagnostics(page as unknown as BridgeBrowserPage);

      expect(diag.templateId).toBe('default');
      expect(diag.templateVersion).toBe('1');
      expect(diag.surfaceMode).toBe('artifact');
      expect(diag.exportState).toBe('ready');
      expect(diag.hasDiagnosticsPanel).toBe(false);
    } finally {
      await page.close();
      await closeBridge(child);
    }
  });

  it('shows a "Template" line in the preview diagnostics band but never in artifact mode', async () => {
    const projectRoot = await makeTempProject('sfrb-template-diagnostics-line-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'document',
      template: { id: 'classic', version: '1' },
    });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const previewPage = await createPage();
    const artifactPage = await createPage();

    try {
      await openPrintSurface(previewPage as unknown as BridgeBrowserPage, url);
      const previewLine = await previewPage.textContent('[data-testid="print-diagnostics-template"]');
      expect(previewLine?.trim()).toBe('Template · classic');

      await openPrintSurface(artifactPage as unknown as BridgeBrowserPage, url, 'artifact');
      const artifactLine = await artifactPage.$('[data-testid="print-diagnostics-template"]');
      expect(artifactLine).toBeNull();
    } finally {
      await previewPage.close();
      await artifactPage.close();
      await closeBridge(child);
    }
  });

  it('renders default theme typography on the print surface (byte-stability spot checks)', async () => {
    const projectRoot = await makeTempProject('sfrb-template-default-typography-');
    await writeWorkspaceFiles(projectRoot, { physics: 'document', starterKind: 'template' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page = await createPage();

    try {
      await openPrintSurface(page as unknown as BridgeBrowserPage, url);

      const rootFontFamily = await page.$eval('#root', (el: Element) =>
        window.getComputedStyle(el as HTMLElement).fontFamily,
      );
      expect(rootFontFamily).toMatch(/Georgia/);

      const headingStyles = await page.$eval('[data-block-kind="heading"]', (el: Element) => {
        const computed = window.getComputedStyle(el as HTMLElement);
        return {
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
        };
      });
      expect(headingStyles.fontSize).toBe('18px');
      expect(['bold', '700']).toContain(headingStyles.fontWeight);

      const paragraphStyles = await page.$eval('[data-block-kind="paragraph"]', (el: Element) => {
        const computed = window.getComputedStyle(el as HTMLElement);
        return { fontSize: computed.fontSize };
      });
      expect(paragraphStyles.fontSize).toBe('12px');

      const bulletStyles = await page.$eval('[data-block-kind="bullet"]', (el: Element) => {
        const computed = window.getComputedStyle(el as HTMLElement);
        return { fontSize: computed.fontSize, paddingLeft: computed.paddingLeft };
      });
      expect(bulletStyles.fontSize).toBe('12px');
      expect(bulletStyles.paddingLeft).toBe('12px');
    } finally {
      await page.close();
      await closeBridge(child);
    }
  });
}, { timeout: 60000 });
