import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';

import {
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  makeTempProject,
  openWorkspace,
  waitForBridgeReady,
  writeWorkspaceFiles,
  type BridgeBrowserPage,
} from '../utils/bridge-browser';

let browser: Browser;

describe('editor lens switcher', () => {
  beforeAll(async () => {
    await ensureBuilt();
    browser = await chromium.launch({ headless: true });
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('defaults design workspaces to the tile lens and lets text take over without drag affordances', async () => {
    const projectRoot = await makeTempProject('sfrb-lens-design-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', skipAi: true, blockText: 'Lens switching coverage.' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page: Page = await browser.newPage();

    try {
      await openWorkspace(page as unknown as BridgeBrowserPage, url, 'design');

      const group = page.locator('#editing-lenses');
      expect(await group.getAttribute('role')).toBe('radiogroup');
      expect(await group.getAttribute('data-active-lens')).toBe('tile');
      expect(await page.getAttribute('#editor-canvas', 'data-active-lens')).toBe('tile');
      expect(await page.getAttribute('#editor-canvas', 'data-active-surface')).toBe('tile');
      expect(await page.locator('[data-testid^="frame-handle"]').count()).toBeGreaterThan(0);
      expect(await page.getAttribute('[data-testid="lens-tile"]', 'aria-checked')).toBe('true');
      expect(await page.locator('[data-testid="lens-freeform"]').isDisabled()).toBe(false);

      await page.click('[data-testid="lens-text"]');
      await page.waitForSelector('#editor-canvas[data-active-lens="text"]');

      expect(await page.getAttribute('#editor-canvas', 'data-active-surface')).toBe('flow');
      expect(await page.getAttribute('#editor-canvas', 'data-physics-mode')).toBe('design');
      expect(await page.locator('[data-testid^="frame-handle"]').count()).toBe(0);
      expect(await page.textContent('#editor-drag-affordance-status')).toBe('absent');
      expect(await page.locator('[data-testid="editor-block-summaryBlock"]').count()).toBe(1);

      await page.click('[data-testid="lens-tile"]');
      await page.waitForSelector('#editor-canvas[data-active-lens="tile"]');
      expect(await page.locator('[data-testid^="frame-handle"]').count()).toBeGreaterThan(0);
      expect(await page.textContent('#editor-drag-affordance-status')).toBe('present');
    } finally {
      await page.close();
      await closeBridge(child);
    }
  });

  it('keeps document workspaces on the text lens with tile and freeform honestly unavailable', async () => {
    const projectRoot = await makeTempProject('sfrb-lens-document-');
    await writeWorkspaceFiles(projectRoot, { physics: 'document', skipAi: true, blockText: 'Document lens coverage.' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page: Page = await browser.newPage();

    try {
      await openWorkspace(page as unknown as BridgeBrowserPage, url, 'document');

      expect(await page.getAttribute('#editing-lenses', 'data-active-lens')).toBe('text');
      expect(await page.getAttribute('[data-testid="lens-text"]', 'aria-checked')).toBe('true');
      expect(await page.locator('[data-testid="lens-tile"]').isDisabled()).toBe(true);
      expect(await page.locator('[data-testid="lens-freeform"]').isDisabled()).toBe(true);
      expect(await page.textContent('#tile-lens-availability')).toContain('Not available in this workspace yet');
    } finally {
      await page.close();
      await closeBridge(child);
    }
  });

  it('moves between available lenses with arrow keys as a radiogroup', async () => {
    const projectRoot = await makeTempProject('sfrb-lens-keyboard-');
    await writeWorkspaceFiles(projectRoot, { physics: 'design', skipAi: true, blockText: 'Keyboard lens coverage.' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page: Page = await browser.newPage();

    try {
      await openWorkspace(page as unknown as BridgeBrowserPage, url, 'design');

      await page.focus('[data-testid="lens-tile"]');
      await page.keyboard.press('ArrowLeft');
      await page.waitForSelector('#editor-canvas[data-active-lens="text"]');
      expect(await page.getAttribute('[data-testid="lens-text"]', 'aria-checked')).toBe('true');

      await page.keyboard.press('ArrowRight');
      await page.waitForSelector('#editor-canvas[data-active-lens="tile"]');
      expect(await page.getAttribute('[data-testid="lens-tile"]', 'aria-checked')).toBe('true');
    } finally {
      await page.close();
      await closeBridge(child);
    }
  });
});
