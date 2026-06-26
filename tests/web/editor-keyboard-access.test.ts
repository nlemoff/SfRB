import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';

import {
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  makeTempProject,
  openDesignWorkspace,
  readWorkspaceDocument,
  waitForBridgeReady,
  waitForEditorIdle,
  writeWorkspaceFiles,
  type BridgeBrowserPage,
} from '../utils/bridge-browser';

let browser: Browser;

type DiskDocument = {
  layout: { frames: Array<{ id: string; box: { x: number; y: number } }> };
};

describe('editor keyboard access', () => {
  beforeAll(async () => {
    await ensureBuilt();
    browser = await chromium.launch({ headless: true });
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('supports a full keyboard journey: nudge, edit, escape, and lens switching', async () => {
    const projectRoot = await makeTempProject('sfrb-keyboard-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', skipAi: true, blockText: 'Keyboard journey.' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page: Page = await browser.newPage();

    try {
      await openDesignWorkspace(page as unknown as BridgeBrowserPage, url);

      const before = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
      const beforeBox = before.layout.frames.find((frame) => frame.id === 'summaryFrame')!.box;

      // The canvas region and frame are keyboard-reachable landmarks.
      expect(await page.getAttribute('#editor-canvas', 'role')).toBe('region');
      expect(await page.getAttribute('[data-testid="editor-frame-summaryFrame"]', 'tabindex')).toBe('0');

      // Arrow keys nudge the focused frame 1pt; Shift+Arrow nudges 10pt.
      await page.focus('[data-testid="editor-frame-summaryFrame"]');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Shift+ArrowDown');
      await page.waitForFunction(
        ({ expectedX }: { expectedX: number }) =>
          document.querySelector('[data-testid="editor-frame-summaryFrame"]')?.getAttribute('data-frame-x') ===
          String(expectedX),
        { expectedX: beforeBox.x + 3 },
      );

      // Nudges commit through a debounce; poll the canonical file for the write.
      await expect
        .poll(
          async () => {
            const nudged = (await readWorkspaceDocument(projectRoot)) as unknown as DiskDocument;
            return nudged.layout.frames.find((frame) => frame.id === 'summaryFrame')!.box;
          },
          { timeout: 5000 },
        )
        .toMatchObject({ x: beforeBox.x + 3, y: beforeBox.y + 10 });
      await waitForEditorIdle(page as unknown as BridgeBrowserPage);

      // Enter starts text editing; Escape commits and leaves the textarea.
      await page.focus('[data-testid="editor-frame-summaryFrame"]');
      await page.keyboard.press('Enter');
      await page.waitForSelector('#editor-active-textarea');
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('editor-active-textarea');

      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#editor-active-textarea'));

      // Escape on a selected frame clears the selection.
      await page.focus('[data-testid="editor-frame-summaryFrame"]');
      await page.waitForFunction(
        () => document.querySelector('#editor-selected-frame')?.textContent === 'summaryFrame',
      );
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('#editor-selected-frame')?.textContent === 'None');

      // The lens switcher is a radiogroup with arrow-key movement.
      await page.focus('[data-testid="lens-tile"]');
      await page.keyboard.press('ArrowLeft');
      await page.waitForSelector('#editor-canvas[data-active-lens="text"]');
      expect(await page.evaluate(() => document.activeElement?.getAttribute('data-lens'))).toBe('text');
      expect(await page.getAttribute('[data-testid="lens-text"]', 'aria-checked')).toBe('true');

      // The save surface announces politely for assistive tech.
      expect(await page.getAttribute('#editor-save-status', 'aria-live')).toBe('polite');
    } finally {
      await page.close();
      await closeBridge(child);
    }
  }, 60000);
});
