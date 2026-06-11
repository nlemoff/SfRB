import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';

import {
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  makeTempProject,
  openDesignWorkspace,
  readWorkspaceDocument,
  readWorkspaceDocumentRaw,
  waitForBridgeReady,
  waitForEditorIdle,
  writeWorkspaceFiles,
  type BridgeBrowserPage,
} from '../utils/bridge-browser';

let browser: Browser;

type DiskDocument = {
  layout: {
    frames: Array<{ id: string; placement: string; box: { x: number; y: number } }>;
  };
};

async function enterFreeform(page: Page): Promise<void> {
  await page.click('[data-testid="lens-freeform"]');
  await page.waitForSelector('#editor-canvas[data-active-surface="freeform"]');
}

async function moveElement(page: Page, testId: string, dx: number, dy: number): Promise<void> {
  const element = page.locator(`[data-testid="${testId}"]`);
  await element.scrollIntoViewIfNeeded();
  const box = await element.boundingBox();
  if (!box) {
    throw new Error(`No bounding box for ${testId}`);
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 5 });
  await page.mouse.up();
}

async function setupTouchedFreeform(page: Page): Promise<void> {
  await enterFreeform(page);
  await moveElement(page, 'editor-frame-summaryFrame', 20, 16);
  await waitForEditorIdle(page as unknown as BridgeBrowserPage);
}

describe('editor mode reconciliation', () => {
  beforeAll(async () => {
    await ensureBuilt();
    browser = await chromium.launch({ headless: true });
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('pauses the lens switch behind an explicit dialog and rejoin keeps geometry while restoring tile edits', async () => {
    const projectRoot = await makeTempProject('sfrb-reconcile-rejoin-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', skipAi: true, blockText: 'Rejoin coverage.' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page: Page = await browser.newPage();

    try {
      await openDesignWorkspace(page as unknown as BridgeBrowserPage, url);
      await setupTouchedFreeform(page);

      const movedDocument = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      const movedBox = movedDocument.layout.frames.find((frame) => frame.id === 'summaryFrame')!.box;

      // Switching back to tile pauses behind the dialog.
      await page.click('[data-testid="lens-tile"]');
      await page.waitForSelector('#reconciliation-dialog:not([hidden])');
      expect(await page.getAttribute('#reconciliation-dialog', 'role')).toBe('dialog');
      expect(await page.getAttribute('#editor-canvas', 'data-active-surface')).toBe('freeform');
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('reconcile-rejoin');

      await page.click('#reconcile-rejoin');
      await page.waitForSelector('#editor-canvas[data-active-surface="tile"]');
      expect(await page.getAttribute('#editor-mode-transition-strip', 'data-outcome')).toBe('rejoin_layout');

      const reconciled = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      const frame = reconciled.layout.frames.find((entry) => entry.id === 'summaryFrame')!;
      expect(frame.placement).toBe('managed');
      // Geometry continuity: rejoin never snaps the element back.
      expect(frame.box).toMatchObject({ x: movedBox.x, y: movedBox.y });

      // Tile edits work after rejoin.
      const handle = page.locator('[data-testid="frame-handle-summaryFrame"]');
      await handle.scrollIntoViewIfNeeded();
      const handleBox = await handle.boundingBox();
      await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox!.x + handleBox!.width / 2 - 12, handleBox!.y + handleBox!.height / 2 + 6, { steps: 5 });
      await page.mouse.up();
      await waitForEditorIdle(page as unknown as BridgeBrowserPage);

      const afterTileMove = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      expect(afterTileMove.layout.frames.find((entry) => entry.id === 'summaryFrame')!.box).toMatchObject({
        x: movedBox.x - 12,
        y: movedBox.y + 6,
      });
    } finally {
      await page.close();
      await closeBridge(child);
    }
  }, 60000);

  it('keep_locked marks placements free and tile edits become visible no-writes', async () => {
    const projectRoot = await makeTempProject('sfrb-reconcile-keep-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', skipAi: true, blockText: 'Keep coverage.' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page: Page = await browser.newPage();

    try {
      await openDesignWorkspace(page as unknown as BridgeBrowserPage, url);
      await setupTouchedFreeform(page);

      await page.click('[data-testid="lens-tile"]');
      await page.waitForSelector('#reconciliation-dialog:not([hidden])');
      await page.click('#reconcile-keep');
      await page.waitForSelector('#editor-canvas[data-active-surface="tile"]');
      expect(await page.getAttribute('#editor-mode-transition-strip', 'data-outcome')).toBe('keep_locked');

      await page.waitForFunction(() => {
        const frame = document.querySelector('[data-testid="editor-frame-summaryFrame"]');
        return frame?.getAttribute('data-placement') === 'free';
      });

      const reconciled = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      expect(reconciled.layout.frames.find((frame) => frame.id === 'summaryFrame')!.placement).toBe('free');

      // A tile drag on the kept element is a visible no-write.
      const beforeRaw = await readWorkspaceDocumentRaw(projectRoot);
      const handle = page.locator('[data-testid="frame-handle-summaryFrame"]');
      await handle.scrollIntoViewIfNeeded();
      const handleBox = await handle.boundingBox();
      await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 30, handleBox!.y + handleBox!.height / 2 + 30, { steps: 5 });
      await page.mouse.up();

      expect(await page.textContent('#tile-action-note')).toContain('freeform placement');
      expect(await readWorkspaceDocumentRaw(projectRoot)).toBe(beforeRaw);

      // Re-entering freeform can still move it (asFreeform path).
      await enterFreeform(page);
      await moveElement(page, 'editor-frame-summaryFrame', -8, -4);
      await waitForEditorIdle(page as unknown as BridgeBrowserPage);
      const afterFreeform = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      expect(afterFreeform.layout.frames.find((frame) => frame.id === 'summaryFrame')!.placement).toBe('free');
      expect(await readWorkspaceDocumentRaw(projectRoot)).not.toBe(beforeRaw);
    } finally {
      await page.close();
      await closeBridge(child);
    }
  }, 60000);

  it('cancel stays in freeform without writing, and clean sessions switch silently', async () => {
    const projectRoot = await makeTempProject('sfrb-reconcile-cancel-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', skipAi: true, blockText: 'Cancel coverage.' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page: Page = await browser.newPage();

    try {
      await openDesignWorkspace(page as unknown as BridgeBrowserPage, url);

      // A clean freeform session switches without any dialog.
      await enterFreeform(page);
      await page.click('[data-testid="lens-tile"]');
      await page.waitForSelector('#editor-canvas[data-active-surface="tile"]');
      expect(await page.locator('#reconciliation-dialog:not([hidden])').count()).toBe(0);

      // A touched session pauses; Escape cancels with no write.
      await setupTouchedFreeform(page);
      const beforeRaw = await readWorkspaceDocumentRaw(projectRoot);

      await page.click('[data-testid="lens-tile"]');
      await page.waitForSelector('#reconciliation-dialog:not([hidden])');
      await page.keyboard.press('Escape');
      await page.waitForSelector('#reconciliation-dialog[hidden]', { state: 'attached' });

      expect(await page.getAttribute('#editor-canvas', 'data-active-surface')).toBe('freeform');
      expect(await readWorkspaceDocumentRaw(projectRoot)).toBe(beforeRaw);
    } finally {
      await page.close();
      await closeBridge(child);
    }
  }, 60000);
});
