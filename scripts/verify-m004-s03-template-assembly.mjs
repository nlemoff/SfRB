#!/usr/bin/env node

/**
 * M004/S03 built-runtime smoke verifier: template export assembly
 *
 * For at least one non-default template: applies the template via the CLI,
 * confirms the bridge serves /print with the expected data-template-id, then
 * runs `dist/cli.js export` to produce a real %PDF artifact from the same
 * workspace. Mirrors the M003 S03 assembly pattern with template metadata
 * threaded through.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliEntry = path.join(repoRoot, 'dist', 'cli.js');

let exitCode = 0;
const assert = (condition, label) => {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}`);
    exitCode = 1;
  }
};

async function createTempWorkspace() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-verify-m004-s03-'));
  await writeFile(
    path.join(dir, 'sfrb.config.json'),
    JSON.stringify(
      {
        version: 1,
        workspace: { physics: 'document' },
      },
      null,
      2,
    ),
  );
  await writeFile(
    path.join(dir, 'resume.sfrb.json'),
    JSON.stringify(
      {
        version: 1,
        metadata: { title: 'Verify M004 S03', locale: 'en' },
        semantic: {
          sections: [{ id: 'sec1', title: 'Profile', blockIds: ['heading1', 'b1'] }],
          blocks: [
            { id: 'heading1', kind: 'heading', text: 'Assembled Template Proof' },
            { id: 'b1', kind: 'paragraph', text: 'Default body before template apply.' },
          ],
        },
        layout: {
          pages: [
            { id: 'p1', size: { width: 612, height: 792 }, margin: { top: 36, right: 36, bottom: 36, left: 36 } },
          ],
          frames: [],
        },
      },
      null,
      2,
    ),
  );
  return dir;
}

async function runCli(args) {
  const child = spawn(process.execPath, [cliEntry, ...args], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout = [];
  const stderr = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
  child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));

  const code = await new Promise((resolve) => {
    child.once('exit', (c) => resolve(c ?? 1));
  });

  return { exitCode: code, stdout: stdout.join(''), stderr: stderr.join('') };
}

async function startBridge(projectRoot) {
  const child = spawn(process.execPath, [cliEntry, 'open', '--cwd', projectRoot, '--port', '0', '--no-open'], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));

  const url = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Bridge timed out')), 15000);
    child.stdout.on('data', () => {
      const combined = stdout.join('');
      const match = combined.match(/SfRB bridge ready at (http:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Bridge exited with code ${code}`));
    });
  });

  return { child, url };
}

async function main() {
  console.log('\nM004/S03: Template Export Assembly Verification\n');

  const targetTemplate = 'modern';
  const projectRoot = await createTempWorkspace();
  let bridgeChild;
  let browser;

  try {
    // Step 1: apply template via CLI; assert persistence.
    const apply = await runCli(['template', 'apply', targetTemplate, '--cwd', projectRoot]);
    assert(apply.exitCode === 0, `template apply ${targetTemplate} exits 0`);

    const persisted = JSON.parse(await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8'));
    assert(
      persisted.metadata?.template?.id === targetTemplate,
      `metadata.template.id == "${targetTemplate}" after apply`,
    );
    assert(persisted.metadata?.template?.version === '1', `metadata.template.version == "1"`);

    // Step 2: bridge reflects template metadata via /print.
    const bridge = await startBridge(projectRoot);
    bridgeChild = bridge.child;

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
      await page.goto(new URL('/print?mode=artifact', bridge.url).href, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => {
        const root = document.getElementById('root');
        return (
          root?.getAttribute('data-export-state') !== 'blocked' ||
          root?.getAttribute('data-blocked-reason') !== 'loading'
        );
      });

      const markers = await page.evaluate(() => {
        const root = document.getElementById('root');
        return {
          templateId: root?.getAttribute('data-template-id') ?? null,
          exportState: root?.getAttribute('data-export-state') ?? null,
          surfaceMode: root?.getAttribute('data-surface-mode') ?? null,
        };
      });

      assert(markers.templateId === targetTemplate, `/print?mode=artifact data-template-id == "${targetTemplate}"`);
      assert(markers.exportState === 'ready', `/print?mode=artifact data-export-state == "ready"`);
      assert(markers.surfaceMode === 'artifact', `/print?mode=artifact data-surface-mode == "artifact"`);

      // Confirm preview mode includes the template diagnostics line.
      await page.goto(new URL('/print', bridge.url).href, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => {
        const root = document.getElementById('root');
        return root?.getAttribute('data-export-state') !== 'blocked';
      });
      const previewLine = await page.textContent('[data-testid="print-diagnostics-template"]');
      assert(
        previewLine?.trim() === `Template · ${targetTemplate}`,
        `preview diagnostics line says "Template · ${targetTemplate}"`,
      );
    } finally {
      await page.close();
    }

    // Step 3: kill bridge before CLI export (export spins its own bridge).
    bridgeChild.kill('SIGTERM');
    await new Promise((resolve) => bridgeChild.once('exit', resolve));
    bridgeChild = null;

    // Step 4: CLI export produces a real %PDF for the same workspace.
    const outputPath = path.join(projectRoot, 'm004-s03-assembly.pdf');
    const exportResult = await runCli(['export', '--cwd', projectRoot, '--output', outputPath, '--port', '0']);
    assert(exportResult.exitCode === 0, 'CLI export exits 0');

    const fileInfo = await stat(outputPath);
    assert(fileInfo.size > 0, 'PDF file is non-empty');

    const header = await readFile(outputPath, 'utf8');
    assert(header.startsWith('%PDF'), 'output starts with %PDF');
  } finally {
    if (bridgeChild) {
      bridgeChild.kill('SIGTERM');
      await new Promise((resolve) => bridgeChild.once('exit', resolve));
    }
    if (browser) {
      await browser.close();
    }
    await rm(projectRoot, { recursive: true, force: true });
  }

  console.log(
    exitCode === 0
      ? '\nM004/S03 template assembly verification passed.\n'
      : '\nM004/S03 template assembly verification FAILED.\n',
  );
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
