import { createRequire } from 'node:module';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  cleanupTempProjects,
  closeBridge,
  ensureBuilt,
  fetchBootstrap,
  makeTempProject,
  openWorkspace,
  readFirstRunGuidance,
  readWorkspaceDocument,
  waitForBridgeReady,
  waitForEditorIdle,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright') as { chromium: { launch: (options: { headless: boolean }) => Promise<any> } };

type Browser = Awaited<ReturnType<typeof chromium.launch>>;
type Page = Awaited<ReturnType<Browser['newPage']>>;

describe('editor first-run guidance', () => {
  beforeAll(async () => {
    await ensureBuilt();
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it.each([
    {
      starterKind: 'template' as const,
      physics: 'document' as const,
      blockId: 'heroSummaryBlock',
      initialText: 'Product-minded operator who turns messy workflow problems into calm, local-first tools.',
      nextText: 'Template starter replaced through the canonical document loop.',
      expectedStarterLabel: 'Template starter',
      starterGuidanceSnippet: 'starts with realistic sample content',
      tileAvailabilitySnippet: 'Not available in this workspace yet',
    },
    {
      starterKind: 'blank' as const,
      physics: 'design' as const,
      blockId: 'summaryBlock',
      initialText: 'Add your first line here.',
      nextText: 'Blank starter replaced through the canonical document loop.',
      expectedStarterLabel: 'Blank starter',
      starterGuidanceSnippet: 'starts intentionally sparse',
      tileAvailabilitySnippet: 'Available now in this workspace',
    },
  ])(
    'surfaces guidance-first starter state for $starterKind and persists starter replacement through bootstrap reconciliation',
    async ({
      starterKind,
      physics,
      blockId,
      initialText,
      nextText,
      expectedStarterLabel,
      starterGuidanceSnippet,
      tileAvailabilitySnippet,
    }) => {
      const projectRoot = await makeTempProject(`sfrb-first-run-${starterKind}-`);
      await writeWorkspaceFiles(projectRoot, {
        physics,
        starterKind,
        skipAi: true,
      });

      const { child, url, stderr } = await waitForBridgeReady(projectRoot);
      let browser: Browser | null = null;

      try {
        const bootstrap = await fetchBootstrap(url);
        expect(bootstrap.status).toBe(200);
        expect(bootstrap.payload).toMatchObject({
          status: 'ready',
          workspaceRoot: projectRoot,
          physics,
          starter: {
            kind: starterKind,
          },
          ai: {
            status: 'skipped',
          },
        });

        browser = await chromium.launch({ headless: true });
        const page: Page = await browser.newPage();
        await openWorkspace(page, url, physics);

        await expect(page.locator('[data-testid="first-run-guidance"]')).toBeTruthy();
        expect(await page.textContent('[data-testid="lens-text-availability"]')).toContain('Available now');
        expect(await page.textContent('[data-testid="lens-freeform-availability"]')).toContain('Not shipped yet');

        const guidance = await readFirstRunGuidance(page);
        expect(guidance.starterKind).toContain(expectedStarterLabel);
        expect(guidance.starterId).toContain(starterKind === 'template' ? 'starterTemplateV1' : 'starterBlankV1');
        expect(guidance.starterGuidance).toContain(starterGuidanceSnippet);
        expect(guidance.aiStatus).toContain('skipped');
        expect(guidance.aiNote).toContain('Text and tile editing still save normally');
        expect(guidance.tileAvailability).toContain(tileAvailabilitySnippet);
        expect(guidance.consultantState).toBe('unavailable');
        expect(guidance.consultantCode).toBe('skipped');

        if (physics === 'design') {
          await page.dblclick('[data-testid="editor-frame-summaryFrame"]');
        } else {
          await page.click(`[data-testid="editor-block-${blockId}"]`);
        }
        await page.waitForSelector('#editor-active-textarea');
        expect(await page.inputValue('#editor-active-textarea')).toBe(initialText);

        await page.fill('#editor-active-textarea', nextText);
        await waitForEditorIdle(page);
        await page.waitForFunction((expectedText: string) => {
          const signal = document.querySelector('#bridge-last-signal')?.textContent ?? '';
          const payloadPreview = document.querySelector('#bridge-payload-preview')?.textContent ?? '';
          return signal.includes('sfrb:bridge-update') && signal.includes('resume.sfrb.json') && payloadPreview.includes(expectedText);
        }, nextText);

        expect(await page.evaluate(() => document.activeElement?.id)).toBe('editor-active-textarea');
        await page.locator('#editor-active-textarea').evaluate((element: HTMLTextAreaElement) => element.blur());
        await page.waitForFunction(() => !document.querySelector('#editor-active-textarea'));
        expect(await page.textContent(`[data-testid="editor-block-text-${blockId}"]`)).toContain(nextText);

        const refreshedBootstrap = await fetchBootstrap(url);
        expect(refreshedBootstrap.payload).toMatchObject({
          status: 'ready',
          starter: {
            kind: starterKind,
          },
          ai: {
            status: 'skipped',
          },
          document: {
            semantic: {
              blocks: expect.arrayContaining([
                expect.objectContaining({ id: blockId, text: nextText }),
              ]),
            },
          },
        });

        const diskDocument = await readWorkspaceDocument(projectRoot) as {
          metadata: { starter?: { id: string; kind: string } };
          semantic: { blocks: Array<{ id: string; text: string }> };
        };
        expect(diskDocument.metadata.starter).toEqual({
          kind: starterKind,
          id: starterKind === 'template' ? 'starterTemplateV1' : 'starterBlankV1',
        });
        expect(diskDocument.semantic.blocks.find((block) => block.id === blockId)?.text).toBe(nextText);
        expect(stderr.join('')).toBe('');
      } finally {
        if (browser) {
          await browser.close();
        }
        await closeBridge(child);
      }
    },
    30000,
  );
});
