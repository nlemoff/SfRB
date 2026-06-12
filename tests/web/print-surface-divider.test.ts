import { writeFile } from 'node:fs/promises';
import path from 'node:path';

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

function createDividerDocument(physics: 'document' | 'design') {
  const frames =
    physics === 'design'
      ? [
          {
            id: 'headingFrame',
            pageId: 'mainPage',
            blockId: 'headingBlock',
            box: { x: 48, y: 60, width: 516, height: 36 },
            zIndex: 0,
          },
          {
            id: 'ruleFrame',
            pageId: 'mainPage',
            blockId: 'ruleBlock',
            box: { x: 48, y: 104, width: 516, height: 12 },
            zIndex: 1,
          },
          {
            id: 'summaryFrame',
            pageId: 'mainPage',
            blockId: 'summaryBlock',
            box: { x: 48, y: 124, width: 516, height: 96 },
            zIndex: 2,
          },
        ]
      : [];

  return {
    metadata: {
      title: 'Divider Coverage',
      locale: 'en-US',
    },
    semantic: {
      sections: [
        {
          id: 'mainSection',
          title: 'Main',
          blockIds: ['headingBlock', 'ruleBlock', 'summaryBlock'],
        },
      ],
      blocks: [
        { id: 'headingBlock', kind: 'heading', text: 'Alex Carter' },
        { id: 'ruleBlock', kind: 'divider', text: '' },
        { id: 'summaryBlock', kind: 'paragraph', text: 'Divider rendering coverage.' },
      ],
    },
    layout: {
      pages: [
        {
          id: 'mainPage',
          size: { width: 612, height: 792 },
          margin: { top: 48, right: 48, bottom: 48, left: 48 },
        },
      ],
      frames,
    },
  };
}

async function writeDividerWorkspace(projectRoot: string, physics: 'document' | 'design'): Promise<void> {
  await writeWorkspaceFiles(projectRoot, { physics });
  await writeFile(
    path.join(projectRoot, 'resume.sfrb.json'),
    `${JSON.stringify(createDividerDocument(physics), null, 2)}\n`,
    'utf8',
  );
}

async function readDividerRendering(page: Page) {
  const divider = page.locator('[data-block-kind="divider"]');
  const count = await divider.count();
  if (count !== 1) {
    return { count, text: null, borderTop: null };
  }

  const text = await divider.textContent();
  const borderTop = await divider.evaluate((element: HTMLElement) => {
    const style = getComputedStyle(element);
    return `${style.borderTopWidth} ${style.borderTopStyle}`;
  });

  return { count, text, borderTop };
}

describe('print surface divider rendering', () => {
  beforeAll(async () => {
    await ensureBuilt();
    browser = await chromium.launch({ headless: true });
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('renders a divider as a chrome-free rule with no text in design physics artifact mode', async () => {
    const projectRoot = await makeTempProject('sfrb-divider-design-');
    await writeDividerWorkspace(projectRoot, 'design');

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page = await browser.newPage();

    try {
      await openPrintSurface(page as unknown as BridgeBrowserPage, url, 'artifact');
      const diag = await readPrintSurfaceDiagnostics(page as unknown as BridgeBrowserPage);
      const rendering = await readDividerRendering(page);

      expect(diag.exportState).toBe('ready');
      expect(diag.hasDiagnosticsPanel).toBe(false);
      expect(rendering.count).toBe(1);
      expect(rendering.text).toBe('');
      expect(rendering.borderTop).toBe('1px solid');
    } finally {
      await page.close();
      await closeBridge(child);
    }
  });

  it('renders a divider in document physics preview without breaking readiness', async () => {
    const projectRoot = await makeTempProject('sfrb-divider-document-');
    await writeDividerWorkspace(projectRoot, 'document');

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page = await browser.newPage();

    try {
      await openPrintSurface(page as unknown as BridgeBrowserPage, url);
      const diag = await readPrintSurfaceDiagnostics(page as unknown as BridgeBrowserPage);
      const rendering = await readDividerRendering(page);

      expect(diag.exportState).toBe('ready');
      expect(rendering.count).toBe(1);
      expect(rendering.text).toBe('');
      expect(rendering.borderTop).toBe('1px solid');
    } finally {
      await page.close();
      await closeBridge(child);
    }
  });
});
