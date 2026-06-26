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
  'printable presentation surface',
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

    describe('document physics', () => {
      it('renders canonical content on the print surface without editor chrome', async () => {
        const projectRoot = await makeTempProject('sfrb-print-doc-');
        await writeWorkspaceFiles(projectRoot, {
          physics: 'document',
          title: 'Print Doc Test',
          blockText: 'My summary text for print.',
        });

        const { child, url } = await waitForBridgeReady(projectRoot);
        const page = await createPage();

        try {
          await openPrintSurface(page as unknown as BridgeBrowserPage, url);

          // Canonical content should be visible
          const bodyText = await page.textContent('body');
          expect(bodyText).toContain('My summary text for print.');

          // Editor chrome should NOT be present
          const editorCanvas = await page.$('#editor-canvas');
          expect(editorCanvas).toBeNull();

          const consultantPanel = await page.$('#consultant-panel');
          expect(consultantPanel).toBeNull();

          const firstRunGuidance = await page.$('[data-testid="first-run-guidance"]');
          expect(firstRunGuidance).toBeNull();
        } finally {
          await page.close();
          await closeBridge(child);
        }
      });

      it('reports ready export state for a clean one-page document', async () => {
        const projectRoot = await makeTempProject('sfrb-print-doc-ready-');
        await writeWorkspaceFiles(projectRoot, {
          physics: 'document',
          title: 'Clean Doc',
          blockText: 'Short text.',
        });

        const { child, url } = await waitForBridgeReady(projectRoot);
        const page = await createPage();

        try {
          await openPrintSurface(page as unknown as BridgeBrowserPage, url);
          const diag = await readPrintSurfaceDiagnostics(page as unknown as BridgeBrowserPage);

          expect(diag.exportState).toBe('ready');
          expect(diag.overflowStatus).toBe('clear');
          expect(diag.riskCount).toBe('0');
          expect(diag.pageCount).toBe(1);
          expect(diag.hasDiagnosticsPanel).toBe(true);
          expect(diag.diagnosticsText).toContain('Export ready');
        } finally {
          await page.close();
          await closeBridge(child);
        }
      });

      it('preserves page geometry from canonical document', async () => {
        const projectRoot = await makeTempProject('sfrb-print-doc-geo-');
        await writeWorkspaceFiles(projectRoot, { physics: 'document' });

        const { child, url } = await waitForBridgeReady(projectRoot);
        const page = await createPage();

        try {
          await openPrintSurface(page as unknown as BridgeBrowserPage, url);

          const pageBox = await page.$eval('[data-testid="print-page-pageOne"]', (el: Element) => {
            const style = (el as HTMLElement).style;
            return { width: style.width, height: style.height };
          });

          expect(pageBox.width).toBe('612px');
          expect(pageBox.height).toBe('792px');
        } finally {
          await page.close();
          await closeBridge(child);
        }
      });
    });

    describe('design physics', () => {
      it('renders canonical content with absolute frame positioning', async () => {
        const projectRoot = await makeTempProject('sfrb-print-design-');
        await writeWorkspaceFiles(projectRoot, {
          physics: 'design',
          title: 'Print Design Test',
          blockText: 'Design summary.',
        });

        const { child, url } = await waitForBridgeReady(projectRoot);
        const page = await createPage();

        try {
          await openPrintSurface(page as unknown as BridgeBrowserPage, url);

          const bodyText = await page.textContent('body');
          expect(bodyText).toContain('Design summary.');

          // Frames should use absolute positioning in design mode
          const framePosition = await page.$eval('[data-testid="print-frame-summaryFrame"]', (el: Element) => {
            return (el as HTMLElement).style.position;
          });
          expect(framePosition).toBe('absolute');
        } finally {
          await page.close();
          await closeBridge(child);
        }
      });

      it('reports ready export state for a clean design document', async () => {
        const projectRoot = await makeTempProject('sfrb-print-design-ready-');
        await writeWorkspaceFiles(projectRoot, {
          physics: 'design',
          title: 'Clean Design',
          blockText: 'Short.',
        });

        const { child, url } = await waitForBridgeReady(projectRoot);
        const page = await createPage();

        try {
          await openPrintSurface(page as unknown as BridgeBrowserPage, url);
          const diag = await readPrintSurfaceDiagnostics(page as unknown as BridgeBrowserPage);

          expect(diag.exportState).toBe('ready');
          expect(diag.overflowStatus).toBe('clear');
          expect(diag.pageCount).toBe(1);
        } finally {
          await page.close();
          await closeBridge(child);
        }
      });
    });

    describe('artifact mode', () => {
      it('renders without diagnostics panel in artifact mode', async () => {
        const projectRoot = await makeTempProject('sfrb-print-artifact-');
        await writeWorkspaceFiles(projectRoot, {
          physics: 'document',
          blockText: 'Artifact text.',
        });

        const { child, url } = await waitForBridgeReady(projectRoot);
        const page = await createPage();

        try {
          await openPrintSurface(page as unknown as BridgeBrowserPage, url, 'artifact');
          const diag = await readPrintSurfaceDiagnostics(page as unknown as BridgeBrowserPage);

          expect(diag.exportState).toBe('ready');
          expect(diag.surfaceMode).toBe('artifact');
          expect(diag.hasDiagnosticsPanel).toBe(false);

          // Content should still render
          const bodyText = await page.textContent('body');
          expect(bodyText).toContain('Artifact text.');
        } finally {
          await page.close();
          await closeBridge(child);
        }
      });

      it('still publishes root-level export markers in artifact mode', async () => {
        const projectRoot = await makeTempProject('sfrb-print-artifact-markers-');
        await writeWorkspaceFiles(projectRoot, { physics: 'design' });

        const { child, url } = await waitForBridgeReady(projectRoot);
        const page = await createPage();

        try {
          await openPrintSurface(page as unknown as BridgeBrowserPage, url, 'artifact');
          const diag = await readPrintSurfaceDiagnostics(page as unknown as BridgeBrowserPage);

          expect(diag.exportState).toBe('ready');
          expect(diag.overflowStatus).toBe('clear');
          expect(diag.riskCount).toBe('0');
        } finally {
          await page.close();
          await closeBridge(child);
        }
      });
    });

    describe('export readiness diagnostics', () => {
      it('surfaces risk state markers when content is not blocked', async () => {
        const projectRoot = await makeTempProject('sfrb-print-diag-');
        await writeWorkspaceFiles(projectRoot, {
          physics: 'document',
          blockText: 'Normal text.',
        });

        const { child, url } = await waitForBridgeReady(projectRoot);
        const page = await createPage();

        try {
          await openPrintSurface(page as unknown as BridgeBrowserPage, url);
          const diag = await readPrintSurfaceDiagnostics(page as unknown as BridgeBrowserPage);

          // Root markers are always present
          expect(diag.exportState).toBeDefined();
          expect(diag.overflowStatus).toBeDefined();
          expect(diag.riskCount).toBeDefined();
          expect(diag.maxOverflowPx).toBeDefined();
          expect(['ready', 'risk', 'blocked']).toContain(diag.exportState);
        } finally {
          await page.close();
          await closeBridge(child);
        }
      });
    });
  },
  { timeout: 60000 },
);
