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
  readWorkspaceDocument,
  waitForBridgeReady,
  writeWorkspaceFiles,
  type BridgeBrowserPage,
} from '../utils/bridge-browser';

let browser: Browser;

async function runCli(args: string[]): Promise<{ exitCode: number; stdout: string }> {
  const child = spawn(process.execPath, ['dist/cli.js', ...args], {
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

describe('M004 template export assembly', () => {
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

  it('proves CLI template apply → browser edit → shared print → CLI PDF export on one workspace', async () => {
    const projectRoot = await makeTempProject('sfrb-template-assembly-');
    await writeWorkspaceFiles(projectRoot, {
      physics: 'document',
      title: 'Template Assembly Proof',
      blockText: 'Initial assembly text.',
    });

    // Step 1: Apply a non-default template via CLI; assert persistence.
    const applyResult = await runCli(['template', 'apply', 'classic', '--cwd', projectRoot]);
    expect(applyResult.exitCode).toBe(0);

    const persistedAfterApply = await readWorkspaceDocument(projectRoot);
    expect(persistedAfterApply.metadata).toMatchObject({
      template: { id: 'classic', version: '1' },
    });

    // Step 2: Edit text through the browser editor; mutation must preserve template.
    const { child, url } = await waitForBridgeReady(projectRoot);
    const editorPage = await createPage();
    let printPage: Page | null = null;

    try {
      await editorPage.goto(url, { waitUntil: 'networkidle' });
      await editorPage.waitForSelector('#editor-canvas');

      const editableBlock = await editorPage.$('[data-testid="editor-block-summaryBlock"]');
      expect(editableBlock).not.toBeNull();
      await editableBlock!.click();

      await editorPage.waitForSelector('textarea', { timeout: 5000 });
      const textarea = await editorPage.$('textarea');
      if (textarea) {
        await textarea.fill('Edited body text under the classic template.');
        // Blur via the canvas bar chrome: the canvas center can land on the
        // active textarea itself, which would keep focus and skip the commit.
        await editorPage.click('#editor-page-metrics');
      }

      await editorPage.waitForFunction(() => {
        const saveEl = document.querySelector('#editor-save-status');
        return saveEl?.getAttribute('data-save-state') === 'idle';
      }, undefined, { timeout: 10000 });

      // Step 3: /print reflects edited body AND active template.
      printPage = await createPage();
      await openPrintSurface(printPage as unknown as BridgeBrowserPage, url);
      const diag = await readPrintSurfaceDiagnostics(printPage as unknown as BridgeBrowserPage);

      expect(diag.exportState).toBe('ready');
      expect(diag.templateId).toBe('classic');
      expect(diag.pageCount).toBe(1);

      const printBodyText = await printPage.textContent('body');
      expect(printBodyText).toContain('Edited body text under the classic template.');

      // Step 4: Persistence still reflects classic template after browser edit.
      const persistedAfterEdit = await readWorkspaceDocument(projectRoot);
      expect(persistedAfterEdit.metadata).toMatchObject({
        template: { id: 'classic', version: '1' },
      });
    } finally {
      if (printPage) {
        await printPage.close();
      }
      await editorPage.close();
      await closeBridge(child);
    }

    // Step 5: CLI export produces a real %PDF for the same workspace.
    const outputPath = path.join(projectRoot, 'template-assembly.pdf');
    const exportResult = await runCli([
      'export',
      '--cwd', projectRoot,
      '--output', outputPath,
      '--port', '0',
    ]);
    expect(exportResult.exitCode).toBe(0);

    const fileInfo = await stat(outputPath);
    expect(fileInfo.size).toBeGreaterThan(0);

    const pdfHeader = await readFile(outputPath, 'utf8');
    expect(pdfHeader.startsWith('%PDF')).toBe(true);
  }, 60000);
}, { timeout: 90000 });
