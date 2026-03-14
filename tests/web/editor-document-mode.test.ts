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

describe('editor document mode', () => {
  beforeAll(async () => {
    await ensureBuilt();
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it(
    'persists inline text editing in document mode without exposing drag affordances or losing the active textarea during save/refetch',
    async () => {
    const projectRoot = await makeTempProject('sfrb-editor-document-mode-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'document',
      title: 'Document Mode Resume',
      blockText: 'Original summary text for document mode.',
    });

    const { child, url, stderr } = await waitForBridgeReady(projectRoot);
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });

      await page.waitForSelector('#editor-canvas[data-physics-mode="document"]');
      expect(await page.textContent('#physics-mode')).toContain('document');
      expect(await page.getAttribute('#editor-drag-affordance-status', 'data-drag-affordances')).toBe('absent');
      expect(await page.locator('[data-testid^="frame-handle"]').count()).toBe(0);
      expect(await page.locator('#bridge-payload-preview').textContent()).toContain('"frames": []');

      await page.click('[data-testid="editor-block-summaryBlock"]');
      await page.waitForSelector('#editor-active-textarea');
      expect(await page.getAttribute('#editor-selected-block', 'data-selected-block-id')).toBe('summaryBlock');
      expect(await page.inputValue('#editor-active-textarea')).toBe('Original summary text for document mode.');

      const editedText = 'Edited from inline document mode.';
      await page.fill('#editor-active-textarea', editedText);
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('editor-active-textarea');

      await waitForEditorIdle(page);
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('editor-active-textarea');
      expect(await page.inputValue('#editor-active-textarea')).toBe(editedText);
      await page.waitForFunction(() => {
        const signal = document.querySelector('#bridge-last-signal')?.textContent ?? '';
        return signal.includes('sfrb:bridge-update') && signal.includes('resume.sfrb.json');
      });
      expect(await page.locator('#bridge-payload-preview').textContent()).toContain(editedText);

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
      expect((diskDocument.layout as { frames: unknown[] }).frames).toEqual([]);
      expect(stderr.join('')).toBe('');
    } finally {
      if (browser) {
        await browser.close();
      }
      await closeBridge(child);
    }
  }, 30000);
});
