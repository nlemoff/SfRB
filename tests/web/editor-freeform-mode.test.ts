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
    frames: Array<{
      id: string;
      blockId: string;
      placement: string;
      box: { x: number; y: number; width: number; height: number };
    }>;
  };
  semantic: {
    blocks: Array<{ id: string; kind: string; text: string }>;
  };
};

async function enterFreeform(page: Page): Promise<void> {
  await page.click('[data-testid="lens-freeform"]');
  await page.waitForSelector('#editor-canvas[data-active-surface="freeform"]');
}

async function dragElement(page: Page, testId: string, dx: number, dy: number): Promise<void> {
  const element = page.locator(`[data-testid="${testId}"]`);
  await element.scrollIntoViewIfNeeded();
  const box = await element.boundingBox();
  if (!box) {
    throw new Error(`No bounding box for ${testId}`);
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 6 });
  await page.mouse.up();
}

describe('editor freeform mode', () => {
  beforeAll(async () => {
    await ensureBuilt();
    browser = await chromium.launch({ headless: true });
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('moves and resizes elements directly, persisting through structured operations', async () => {
    const projectRoot = await makeTempProject('sfrb-freeform-move-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', skipAi: true, blockText: 'Freeform move coverage.' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page: Page = await browser.newPage();

    try {
      await openDesignWorkspace(page as unknown as BridgeBrowserPage, url);
      await enterFreeform(page);

      const before = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      const beforeBox = before.layout.frames.find((frame) => frame.id === 'summaryFrame')!.box;

      // Grab the element body anywhere and move it.
      await dragElement(page, 'editor-frame-summaryFrame', 30, 22);
      await waitForEditorIdle(page as unknown as BridgeBrowserPage);
      await page.waitForFunction(
        ({ expectedX }: { expectedX: number }) =>
          document.querySelector('[data-testid="editor-frame-summaryFrame"]')?.getAttribute('data-frame-x') ===
          String(expectedX),
        { expectedX: beforeBox.x + 30 },
      );

      let persisted = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      let frame = persisted.layout.frames.find((entry) => entry.id === 'summaryFrame')!;
      expect(frame.box).toMatchObject({ x: beforeBox.x + 30, y: beforeBox.y + 22 });
      // Plain freeform moves acknowledge the lens without changing placement.
      expect(frame.placement).toBe('managed');

      // Resize through the selected element's corner handle.
      await page.click('[data-testid="editor-frame-summaryFrame"]');
      await page.waitForSelector('[data-testid="freeform-resize-summaryFrame"]', { state: 'visible' });
      await dragElement(page, 'freeform-resize-summaryFrame', 36, 28);
      await waitForEditorIdle(page as unknown as BridgeBrowserPage);
      await page.waitForFunction(
        ({ expectedWidth }: { expectedWidth: number }) =>
          document.querySelector('[data-testid="editor-frame-summaryFrame"]')?.getAttribute('data-frame-width') ===
          String(expectedWidth),
        { expectedWidth: beforeBox.width + 36 },
      );

      persisted = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      frame = persisted.layout.frames.find((entry) => entry.id === 'summaryFrame')!;
      expect(frame.box.width).toBe(beforeBox.width + 36);
      expect(frame.box.height).toBe(beforeBox.height + 28);

      // The HUD mirrors the selected element.
      expect(await page.textContent('[data-testid="freeform-selected-element-id"]')).toBe('summaryFrame');
      expect(await page.textContent('[data-testid="freeform-selected-element-kind"]')).toBe('paragraph');
    } finally {
      await page.close();
      await closeBridge(child);
    }
  }, 60000);

  it('adds and removes divider elements through the canonical operations', async () => {
    const projectRoot = await makeTempProject('sfrb-freeform-divider-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', skipAi: true, blockText: 'Divider coverage.' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page: Page = await browser.newPage();

    try {
      await openDesignWorkspace(page as unknown as BridgeBrowserPage, url);
      await enterFreeform(page);

      await page.click('#freeform-add-divider');
      await page.waitForFunction(() => document.querySelectorAll('[data-element-kind="divider"]').length === 1);

      let persisted = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      const divider = persisted.semantic.blocks.find((block) => block.kind === 'divider');
      expect(divider).toBeDefined();
      expect(persisted.layout.frames.some((frame) => frame.blockId === divider!.id)).toBe(true);

      const dividerFrameId = persisted.layout.frames.find((frame) => frame.blockId === divider!.id)!.id;
      await page.click(`[data-testid="editor-frame-${dividerFrameId}"]`);
      await page.click('#freeform-remove-element');
      await page.waitForFunction(() => document.querySelectorAll('[data-element-kind="divider"]').length === 0);

      persisted = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      expect(persisted.semantic.blocks.some((block) => block.kind === 'divider')).toBe(false);
      expect(persisted.layout.frames.some((frame) => frame.id === dividerFrameId)).toBe(false);
    } finally {
      await page.close();
      await closeBridge(child);
    }
  }, 60000);

  it('blocks locked-group members visibly without writing', async () => {
    const projectRoot = await makeTempProject('sfrb-freeform-locked-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', starterKind: 'template', skipAi: true });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page: Page = await browser.newPage();

    try {
      await openDesignWorkspace(page as unknown as BridgeBrowserPage, url);
      await enterFreeform(page);

      const beforeRaw = await readWorkspaceDocumentRaw(projectRoot);
      const beforeX = await page.getAttribute('[data-testid="editor-frame-heroNameFrame"]', 'data-frame-x');

      await dragElement(page, 'editor-frame-heroNameFrame', 40, 30);

      expect(await page.getAttribute('[data-testid="freeform-move-state"]', 'data-move-state')).toBe('blocked');
      expect(await page.textContent('#freeform-action-note')).toContain('locked');
      expect(await page.getAttribute('[data-testid="editor-frame-heroNameFrame"]', 'data-frame-x')).toBe(beforeX);
      expect(await readWorkspaceDocumentRaw(projectRoot)).toBe(beforeRaw);
    } finally {
      await page.close();
      await closeBridge(child);
    }
  }, 60000);
});
