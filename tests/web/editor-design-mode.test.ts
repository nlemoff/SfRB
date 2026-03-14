import { createRequire } from 'node:module';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  makeTempProject,
  readWorkspaceDocument,
  waitForBridgeReady,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright') as { chromium: { launch: (options: { headless: boolean }) => Promise<any> } };

type Browser = Awaited<ReturnType<typeof chromium.launch>>;
type Page = Awaited<ReturnType<Browser['newPage']>>;

async function waitForEditorIdle(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    return document.querySelector('#editor-save-status')?.getAttribute('data-save-state') === 'idle';
  });
}

describe('editor design mode', () => {
  beforeAll(async () => {
    await ensureBuilt();
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('renders canonical design geometry, persists frame dragging, and keeps inline text editing linked to the dragged frame', async () => {
    const projectRoot = await makeTempProject('sfrb-editor-design-mode-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      title: 'Design Mode Resume',
      blockText: 'Original summary text for design mode.',
    });

    const { child, url, stderr } = await waitForBridgeReady(projectRoot);
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });

      await page.waitForSelector('#editor-canvas[data-physics-mode="design"]');
      expect(await page.textContent('#physics-mode')).toContain('design');
      expect(await page.getAttribute('#editor-drag-affordance-status', 'data-drag-affordances')).toBe('present');
      expect(await page.getAttribute('#editor-selected-frame', 'data-selected-frame-id')).toBe('');
      expect(await page.locator('[data-testid="frame-handle-summaryFrame"]').count()).toBe(1);
      expect(await page.locator('#bridge-payload-preview').textContent()).toContain('"x": 36');
      expect(await page.locator('#bridge-payload-preview').textContent()).toContain('"y": 48');

      const frame = page.locator('[data-testid="editor-frame-summaryFrame"]');
      await frame.click();
      expect(await page.getAttribute('#editor-selected-frame', 'data-selected-frame-id')).toBe('summaryFrame');
      expect(await page.getAttribute('#editor-selected-block', 'data-selected-block-id')).toBe('summaryBlock');
      expect(await frame.getAttribute('data-frame-x')).toBe('36');
      expect(await frame.getAttribute('data-frame-y')).toBe('48');
      expect(await page.getAttribute('#editor-selected-frame-box', 'data-frame-box')).toContain('"x":36');

      const handle = page.locator('[data-testid="frame-handle-summaryFrame"]');
      const handleBox = await handle.boundingBox();
      if (!handleBox) {
        throw new Error('Expected a visible design-mode drag handle.');
      }

      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + handleBox.width / 2 + 44, handleBox.y + handleBox.height / 2 + 28, { steps: 8 });
      await page.mouse.up();

      await page.waitForFunction(() => {
        const frameElement = document.querySelector('[data-testid="editor-frame-summaryFrame"]');
        return frameElement?.getAttribute('data-frame-x') === '80' && frameElement?.getAttribute('data-frame-y') === '76';
      });
      await waitForEditorIdle(page);
      await page.waitForFunction(() => {
        const signal = document.querySelector('#bridge-last-signal')?.textContent ?? '';
        return signal.includes('sfrb:bridge-update') && signal.includes('resume.sfrb.json');
      });
      expect(await page.getAttribute('#editor-selected-frame-box', 'data-frame-box')).toContain('"x":80');
      expect(await page.locator('#bridge-payload-preview').textContent()).toContain('"x": 80');
      expect(await page.locator('#bridge-payload-preview').textContent()).toContain('"y": 76');

      await frame.dblclick();
      await page.waitForSelector('#editor-active-textarea');
      expect(await page.inputValue('#editor-active-textarea')).toBe('Original summary text for design mode.');

      const editedText = 'Edited from fixed-layout design mode.';
      await page.fill('#editor-active-textarea', editedText);
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('editor-active-textarea');

      await waitForEditorIdle(page);
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('editor-active-textarea');
      expect(await page.inputValue('#editor-active-textarea')).toBe(editedText);
      await page.locator('#editor-active-textarea').evaluate((element: HTMLTextAreaElement) => {
        element.blur();
      });
      await page.waitForFunction(() => !document.querySelector('#editor-active-textarea'));
      expect(await page.textContent('[data-testid="editor-block-text-summaryBlock"]')).toContain(editedText);

      const diskDocument = await readWorkspaceDocument(projectRoot);
      expect((diskDocument.semantic as { blocks: Array<{ id: string; text: string }> }).blocks[0]).toMatchObject({
        id: 'summaryBlock',
        text: editedText,
      });
      expect((diskDocument.layout as { frames: Array<{ id: string; box: { x: number; y: number; width: number; height: number } }> }).frames[0]).toMatchObject({
        id: 'summaryFrame',
        box: { x: 80, y: 76, width: 540, height: 96 },
      });
      expect(stderr.join('')).toBe('');
    } finally {
      if (browser) {
        await browser.close();
      }
      await closeBridge(child);
    }
  }, 30000);
});
