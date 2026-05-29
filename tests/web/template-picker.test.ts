import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';

import {
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  makeTempProject,
  readWorkspaceDocument,
  waitForBridgeReady,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

let browser: Browser;

describe('browser template picker', () => {
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

  it('renders a picker button for every registered template', async () => {
    const projectRoot = await makeTempProject('sfrb-picker-buttons-');
    await writeWorkspaceFiles(projectRoot, { physics: 'document', blockText: 'Picker rendering.' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page = await createPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="template-picker-buttons"] button');

      const ids = await page.$$eval(
        '[data-testid="template-picker-buttons"] button',
        (buttons: Element[]) =>
          buttons.map((button) => (button as HTMLButtonElement).dataset.templateId ?? ''),
      );

      expect(ids).toEqual(['default', 'classic', 'modern']);
    } finally {
      await page.close();
      await closeBridge(child);
    }
  });

  it('persists metadata.template through the canonical write path on selection', async () => {
    const projectRoot = await makeTempProject('sfrb-picker-apply-');
    await writeWorkspaceFiles(projectRoot, { physics: 'document', blockText: 'Picker apply.' });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page = await createPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="template-pick-modern"]');

      await page.click('[data-testid="template-pick-modern"]');

      await page.waitForFunction(() => {
        const panel = document.querySelector('[data-testid="template-picker"]') as HTMLElement | null;
        return panel?.dataset.activeTemplateId === 'modern';
      });

      const persisted = await readWorkspaceDocument(projectRoot);
      expect(persisted.metadata).toMatchObject({
        template: { id: 'modern', version: '1' },
      });

      const activeLabel = await page.textContent('[data-testid="template-active-label"]');
      expect(activeLabel?.trim()).toBe('modern');
    } finally {
      await page.close();
      await closeBridge(child);
    }
  });

  it('reflects the canonical workspace template on initial mount', async () => {
    const projectRoot = await makeTempProject('sfrb-picker-mount-active-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'document',
      blockText: 'Picker mount.',
      template: { id: 'classic', version: '1' },
    });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page = await createPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="template-picker"]');

      await page.waitForFunction(() => {
        const panel = document.querySelector('[data-testid="template-picker"]') as HTMLElement | null;
        return panel?.dataset.activeTemplateId === 'classic';
      });

      const activeLabel = await page.textContent('[data-testid="template-active-label"]');
      expect(activeLabel?.trim()).toBe('classic');
    } finally {
      await page.close();
      await closeBridge(child);
    }
  });
}, { timeout: 60000 });
