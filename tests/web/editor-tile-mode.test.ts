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
    frames: Array<{ id: string; blockId: string; box: { x: number; y: number; width: number; height: number } }>;
    frameGroups: Array<{ id: string; frameIds: string[]; locked: boolean }>;
  };
  semantic: {
    sections: Array<{ id: string; blockIds: string[] }>;
    blocks: Array<{ id: string; kind: string; text: string; splitFrom?: string }>;
  };
};

async function dragByTestId(page: Page, testId: string, dx: number, dy: number): Promise<void> {
  const handle = page.locator(`[data-testid="${testId}"]`);
  await handle.scrollIntoViewIfNeeded();
  const handleBox = await handle.boundingBox();
  if (!handleBox) {
    throw new Error(`No bounding box for ${testId}`);
  }
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + dx, handleBox.y + handleBox.height / 2 + dy, { steps: 6 });
  await page.mouse.up();
}

describe('editor tile mode', () => {
  beforeAll(async () => {
    await ensureBuilt();
    browser = await chromium.launch({ headless: true });
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('ships an assembled locked composition: blocked member drags, one canonical group move, unlock and ungroup', async () => {
    const projectRoot = await makeTempProject('sfrb-tile-locked-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', starterKind: 'template', skipAi: true });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page: Page = await browser.newPage();

    try {
      await openDesignWorkspace(page as unknown as BridgeBrowserPage, url);

      // The template starter opens as an assembled locked composition.
      const before = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      expect(before.layout.frameGroups).toEqual([
        { id: 'heroComposition', pageId: 'pageOne', frameIds: ['heroNameFrame', 'heroSummaryFrame'], locked: true },
      ]);
      expect(await page.locator('[data-testid="tile-group-badge-heroComposition"]').count()).toBe(1);
      expect(await page.getAttribute('[data-testid="editor-frame-heroNameFrame"]', 'data-group-id')).toBe('heroComposition');
      expect(await page.getAttribute('[data-testid="editor-frame-heroNameFrame"]', 'data-group-locked')).toBe('true');

      // Dragging a locked member is a visible no-write.
      const beforeRaw = await readWorkspaceDocumentRaw(projectRoot);
      const beforeX = await page.getAttribute('[data-testid="editor-frame-heroNameFrame"]', 'data-frame-x');
      await dragByTestId(page, 'frame-handle-heroNameFrame', 40, 30);
      expect(await page.textContent('#tile-action-note')).toContain('locked');
      expect(await page.getAttribute('[data-testid="editor-frame-heroNameFrame"]', 'data-frame-x')).toBe(beforeX);
      expect(await readWorkspaceDocumentRaw(projectRoot)).toBe(beforeRaw);

      // Dragging the group handle persists one canonical translate for all members.
      const originalName = before.layout.frames.find((frame) => frame.id === 'heroNameFrame')!.box;
      const originalSummary = before.layout.frames.find((frame) => frame.id === 'heroSummaryFrame')!.box;
      await dragByTestId(page, 'tile-group-handle-heroComposition', 24, 18);
      await waitForEditorIdle(page as unknown as BridgeBrowserPage);
      await page.waitForFunction(
        ({ expectedX }: { expectedX: number }) => {
          const frame = document.querySelector('[data-testid="editor-frame-heroNameFrame"]');
          return frame?.getAttribute('data-frame-x') === String(expectedX);
        },
        { expectedX: originalName.x + 24 },
      );

      const afterMove = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      expect(afterMove.layout.frames.find((frame) => frame.id === 'heroNameFrame')?.box).toMatchObject({
        x: originalName.x + 24,
        y: originalName.y + 18,
      });
      expect(afterMove.layout.frames.find((frame) => frame.id === 'heroSummaryFrame')?.box).toMatchObject({
        x: originalSummary.x + 24,
        y: originalSummary.y + 18,
      });

      // Unlock through the toolbar, then a member drag persists individually.
      await page.click('[data-testid="editor-frame-heroNameFrame"]');
      await page.click('#tile-lock');
      await page.waitForFunction(() => {
        const frame = document.querySelector('[data-testid="editor-frame-heroNameFrame"]');
        return frame?.getAttribute('data-group-locked') === 'false';
      });
      const afterUnlock = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      expect(afterUnlock.layout.frameGroups[0]?.locked).toBe(false);

      await dragByTestId(page, 'frame-handle-heroNameFrame', -10, 6);
      await waitForEditorIdle(page as unknown as BridgeBrowserPage);
      await page.waitForFunction(
        ({ expectedX }: { expectedX: number }) => {
          const frame = document.querySelector('[data-testid="editor-frame-heroNameFrame"]');
          return frame?.getAttribute('data-frame-x') === String(expectedX);
        },
        { expectedX: originalName.x + 24 - 10 },
      );
      const afterMemberMove = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      expect(afterMemberMove.layout.frames.find((frame) => frame.id === 'heroNameFrame')?.box).toMatchObject({
        x: originalName.x + 14,
        y: originalName.y + 24,
      });

      // Ungroup leaves the frames in place and removes the composition.
      await page.click('[data-testid="editor-frame-heroNameFrame"]');
      await page.click('#tile-ungroup');
      await page.waitForFunction(() => document.querySelectorAll('[data-testid^="tile-group-badge-"]').length === 0);
      const afterUngroup = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      expect(afterUngroup.layout.frameGroups).toEqual([]);
      expect(afterUngroup.layout.frames).toHaveLength(5);
    } finally {
      await page.close();
      await closeBridge(child);
    }
  }, 60000);

  it('splits a tile into provenance-carrying segments, then groups and locks them', async () => {
    const projectRoot = await makeTempProject('sfrb-tile-split-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      skipAi: true,
      blockText: 'First summary line.\nSecond summary line.',
    });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page: Page = await browser.newPage();

    try {
      await openDesignWorkspace(page as unknown as BridgeBrowserPage, url);

      await page.click('[data-testid="editor-frame-summaryFrame"]');
      await page.click('#tile-split');
      await page.waitForFunction(() => document.querySelectorAll('[data-testid^="editor-frame-"]').length === 2);

      const afterSplit = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      const segments = afterSplit.semantic.blocks.filter((block) => block.splitFrom === 'summaryBlock');
      expect(segments).toHaveLength(2);
      expect(segments.map((block) => block.text)).toEqual(['First summary line.', 'Second summary line.']);
      expect(afterSplit.semantic.sections[0].blockIds).toEqual(segments.map((block) => block.id));
      expect(afterSplit.layout.frames).toHaveLength(2);
      expect(afterSplit.layout.frames.some((frame) => frame.id === 'summaryFrame')).toBe(false);

      // Shift-click extends the selection; grouping persists an unlocked group.
      const [firstFrame, secondFrame] = afterSplit.layout.frames;
      await page.click(`[data-testid="editor-frame-${firstFrame.id}"]`);
      await page.click(`[data-testid="editor-frame-${secondFrame.id}"]`, { modifiers: ['Shift'] });
      await page.waitForFunction(() => document.querySelectorAll('[data-multi-selected="true"]').length >= 1);
      await page.click('#tile-group');
      await page.waitForFunction(() => document.querySelectorAll('[data-testid^="tile-group-badge-"]').length === 1);

      const afterGroup = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      expect(afterGroup.layout.frameGroups).toHaveLength(1);
      expect(afterGroup.layout.frameGroups[0].locked).toBe(false);
      expect(new Set(afterGroup.layout.frameGroups[0].frameIds)).toEqual(new Set([firstFrame.id, secondFrame.id]));

      await page.click('#tile-lock');
      await page.waitForFunction(() => {
        const badge = document.querySelector('[data-testid^="tile-group-badge-"]');
        return badge?.getAttribute('data-group-locked') === 'true';
      });
      const afterLock = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      expect(afterLock.layout.frameGroups[0].locked).toBe(true);
    } finally {
      await page.close();
      await closeBridge(child);
    }
  }, 60000);
});
