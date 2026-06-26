#!/usr/bin/env node
import { execFile as execFileCallback, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';

const execFile = promisify(execFileCallback);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

function expectCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readDocument(projectRoot) {
  return JSON.parse(await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8'));
}

async function waitForBridgeReady(projectRoot) {
  const child = spawn(
    process.execPath,
    [path.join(repoRoot, 'dist/cli.js'), 'open', '--cwd', projectRoot, '--port', '0', '--no-open'],
    {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  const stdout = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
  child.stderr.on('data', (chunk) => stdout.push(chunk.toString()));

  const url = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Bridge did not become ready.\n${stdout.join('')}`)), 20000);
    child.stdout.on('data', () => {
      const match = stdout.join('').match(/SfRB bridge ready at (http:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
  });

  return { child, url };
}

async function moveElement(page, testId, dx, dy) {
  const element = page.locator(`[data-testid="${testId}"]`);
  await element.scrollIntoViewIfNeeded();
  const box = await element.boundingBox();
  expectCondition(box, `No bounding box for ${testId}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 5 });
  await page.mouse.up();
}

async function waitForIdleSave(page) {
  await page.waitForFunction(
    () => document.querySelector('#editor-save-status')?.getAttribute('data-save-state') === 'idle',
  );
}

async function main() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'sfrb-reconcile-smoke-'));
  let child;
  let browser;

  try {
    await execFile('npm', ['run', 'build'], { cwd: repoRoot });
    await execFile(
      process.execPath,
      [
        path.join(repoRoot, 'dist/cli.js'),
        'init',
        '--cwd',
        workspace,
        '--starter',
        'blank',
        '--physics',
        'design',
        '--skip-ai',
      ],
      { cwd: repoRoot },
    );

    ({ child, url: globalThis.__reconcileSmokeUrl } = await waitForBridgeReady(workspace));
    const { chromium } = require('playwright');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(globalThis.__reconcileSmokeUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('#editor-canvas[data-physics-mode="design"]');

    // 1. Touch freeform, leave via rejoin_layout: geometry continuity + tile editing restored.
    await page.click('[data-testid="lens-freeform"]');
    await page.waitForSelector('#editor-canvas[data-active-surface="freeform"]');
    await moveElement(page, 'editor-frame-summaryFrame', 24, 18);
    await waitForIdleSave(page);

    const movedBox = (await readDocument(workspace)).layout.frames[0].box;

    await page.click('[data-testid="lens-tile"]');
    await page.waitForSelector('#reconciliation-dialog:not([hidden])');
    await page.click('#reconcile-rejoin');
    await page.waitForSelector('#editor-canvas[data-active-surface="tile"]');

    let document_ = await readDocument(workspace);
    expectCondition(document_.layout.frames[0].placement === 'managed', 'Rejoin should keep the frame managed.');
    expectCondition(
      document_.layout.frames[0].box.x === movedBox.x && document_.layout.frames[0].box.y === movedBox.y,
      'Rejoin must not snap geometry back.',
    );

    // 2. Touch freeform again, keep_locked: placement free + blocked tile edit no-write.
    await page.click('[data-testid="lens-freeform"]');
    await page.waitForSelector('#editor-canvas[data-active-surface="freeform"]');
    await moveElement(page, 'editor-frame-summaryFrame', 10, 8);
    await waitForIdleSave(page);

    await page.click('[data-testid="lens-tile"]');
    await page.waitForSelector('#reconciliation-dialog:not([hidden])');
    await page.click('#reconcile-keep');
    await page.waitForSelector('#editor-canvas[data-active-surface="tile"]');
    await page.waitForFunction(() => {
      const frame = document.querySelector('[data-testid="editor-frame-summaryFrame"]');
      return frame?.getAttribute('data-placement') === 'free';
    });

    document_ = await readDocument(workspace);
    expectCondition(document_.layout.frames[0].placement === 'free', 'keep_locked should persist free placement.');

    const beforeRaw = await readFile(path.join(workspace, 'resume.sfrb.json'), 'utf8');
    const handle = page.locator('[data-testid="frame-handle-summaryFrame"]');
    await handle.scrollIntoViewIfNeeded();
    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 30, handleBox.y + handleBox.height / 2 + 30, {
      steps: 5,
    });
    await page.mouse.up();

    const note = await page.textContent('#tile-action-note');
    expectCondition(
      String(note).includes('freeform placement'),
      `Blocked tile edit should explain the placement, received: ${note}`,
    );
    const afterRaw = await readFile(path.join(workspace, 'resume.sfrb.json'), 'utf8');
    expectCondition(afterRaw === beforeRaw, 'Blocked tile edit on a kept element must be a no-write.');

    console.log(
      'Mode reconciliation smoke verification passed: rejoin continuity, keep_locked protection, and blocked tile edits.',
    );
  } finally {
    if (browser) {
      await browser.close();
    }
    if (child) {
      child.kill('SIGTERM');
      await new Promise((resolve) => {
        child.once('exit', resolve);
        setTimeout(resolve, 2000);
      });
    }
    await rm(workspace, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
