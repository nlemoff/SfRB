import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
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

async function runCliExport(
  projectRoot: string,
  outputPath: string,
): Promise<{ exitCode: number; stdout: string }> {
  const args = ['dist/cli.js', 'export', '--cwd', projectRoot, '--output', outputPath, '--port', '0'];
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout: string[] = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
  child.stderr.on('data', (chunk) => stdout.push(chunk.toString()));

  const exitCode = await new Promise<number>((resolve) => {
    child.once('exit', (code) => resolve(code ?? 1));
  });

  return { exitCode, stdout: stdout.join('') };
}

describe('export assembly', () => {
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

  it('proves browser edit → shared print preview → CLI PDF export on one workspace', async () => {
    const projectRoot = await makeTempProject('sfrb-assembly-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'document',
      title: 'Assembly Proof',
      blockText: 'Original assembly text.',
    });

    const { child, url } = await waitForBridgeReady(projectRoot);
    const page = await createPage();

    try {
      // Step 1: Open editor and verify initial content
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('#editor-canvas');

      // Step 2: Edit text in the browser editor
      const editableBlock = await page.$('[data-testid="editor-block-summaryBlock"]');
      expect(editableBlock).not.toBeNull();
      await editableBlock!.click();

      // Wait for the textarea to appear after clicking the block
      await page.waitForSelector('textarea', { timeout: 5000 });
      const textarea = await page.$('textarea');
      if (textarea) {
        await textarea.fill('Edited assembly content for export proof.');
        // Trigger blur to persist
        await page.click('#editor-canvas');
      }

      // Wait for save to settle
      await page.waitForFunction(() => {
        const saveEl = document.querySelector('#editor-save-status');
        return saveEl?.getAttribute('data-save-state') === 'idle';
      }, undefined, { timeout: 10000 });

      // Step 3: Open /print preview and verify the edited text appears
      const printPage = await createPage();
      await openPrintSurface(printPage as unknown as BridgeBrowserPage, url);
      const diag = await readPrintSurfaceDiagnostics(printPage as unknown as BridgeBrowserPage);

      expect(diag.exportState).toBe('ready');
      expect(diag.pageCount).toBe(1);

      const printBodyText = await printPage.textContent('body');
      expect(printBodyText).toContain('Edited assembly content for export proof.');

      await printPage.close();
    } finally {
      await page.close();
      await closeBridge(child);
    }

    // Step 4: CLI export from the same workspace
    const outputPath = path.join(projectRoot, 'assembly.pdf');
    const exportResult = await runCliExport(projectRoot, outputPath);

    expect(exportResult.exitCode).toBe(0);

    const fileInfo = await stat(outputPath);
    expect(fileInfo.size).toBeGreaterThan(0);

    const pdfHeader = await readFile(outputPath, 'utf8');
    expect(pdfHeader.startsWith('%PDF')).toBe(true);
  }, 45000);
}, { timeout: 60000 });
