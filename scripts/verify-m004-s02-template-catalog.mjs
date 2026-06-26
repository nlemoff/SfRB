#!/usr/bin/env node

/**
 * M004/S02 built-runtime smoke verifier: template catalog
 *
 * For each registered template id: runs `dist/cli.js template apply <id>` against
 * a temp workspace, then probes /print?mode=artifact via headless Chromium and
 * asserts (a) data-template-id matches, (b) M003 markers report ready/clear,
 * (c) the rendered root font reflects the template's typography.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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

const TEMPLATE_EXPECTATIONS = [
  { id: 'default', fontMatch: /Georgia/, headingFontSize: '18px' },
  { id: 'classic', fontMatch: /Times/, headingFontSize: '20px' },
  { id: 'modern', fontMatch: /Helvetica|Arial/, headingFontSize: '16px' },
];

async function createTempWorkspace() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-verify-m004-s02-'));
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
        metadata: { title: 'Verify M004 S02', locale: 'en' },
        semantic: {
          sections: [{ id: 'sec1', title: 'Profile', blockIds: ['heading1', 'b1'] }],
          blocks: [
            { id: 'heading1', kind: 'heading', text: 'Verify Catalog' },
            { id: 'b1', kind: 'paragraph', text: 'Template catalog verification body.' },
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

async function runCli(args, projectRoot) {
  const child = spawn(process.execPath, [cliEntry, ...args], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: projectRoot,
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

async function readMarkers(page, baseUrl) {
  const printUrl = new URL('/print?mode=artifact', baseUrl).href;
  await page.goto(printUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return (
      root?.getAttribute('data-export-state') !== 'blocked' || root?.getAttribute('data-blocked-reason') !== 'loading'
    );
  });
  return page.evaluate(() => {
    const root = document.getElementById('root');
    const heading = document.querySelector('[data-block-kind="heading"]');
    return {
      templateId: root?.getAttribute('data-template-id') ?? null,
      templateVersion: root?.getAttribute('data-template-version') ?? null,
      exportState: root?.getAttribute('data-export-state') ?? null,
      overflowStatus: root?.getAttribute('data-overflow-status') ?? null,
      riskCount: root?.getAttribute('data-risk-count') ?? null,
      rootFontFamily: root ? window.getComputedStyle(root).fontFamily : null,
      headingFontSize: heading ? window.getComputedStyle(heading).fontSize : null,
    };
  });
}

async function main() {
  console.log('\nM004/S02: Template Catalog Verification\n');

  const browser = await chromium.launch({ headless: true });

  for (const expectation of TEMPLATE_EXPECTATIONS) {
    const projectRoot = await createTempWorkspace();
    let bridgeChild;

    try {
      console.log(`\nTemplate: ${expectation.id}`);

      const applyResult = await runCli(['template', 'apply', expectation.id, '--cwd', projectRoot], repoRoot);
      assert(applyResult.exitCode === 0, `template apply ${expectation.id} exits 0`);

      const bridge = await startBridge(projectRoot);
      bridgeChild = bridge.child;

      const page = await browser.newPage();
      try {
        const markers = await readMarkers(page, bridge.url);
        assert(markers.templateId === expectation.id, `data-template-id="${expectation.id}"`);
        assert(markers.templateVersion === '1', `data-template-version="1"`);
        assert(markers.exportState === 'ready', `data-export-state="ready"`);
        assert(markers.overflowStatus === 'clear', `data-overflow-status="clear"`);
        assert(markers.riskCount === '0', `data-risk-count="0"`);
        assert(
          expectation.fontMatch.test(markers.rootFontFamily ?? ''),
          `root font matches ${expectation.fontMatch} (got ${markers.rootFontFamily})`,
        );
        assert(
          markers.headingFontSize === expectation.headingFontSize,
          `heading fontSize="${expectation.headingFontSize}" (got ${markers.headingFontSize})`,
        );
      } finally {
        await page.close();
      }
    } finally {
      if (bridgeChild) {
        bridgeChild.kill('SIGTERM');
        await new Promise((resolve) => bridgeChild.once('exit', resolve));
      }
      await rm(projectRoot, { recursive: true, force: true });
    }
  }

  await browser.close();

  console.log(
    exitCode === 0
      ? '\nM004/S02 template catalog verification passed.\n'
      : '\nM004/S02 template catalog verification FAILED.\n',
  );
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
