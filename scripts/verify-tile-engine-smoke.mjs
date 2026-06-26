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

async function dragByTestId(page, testId, dx, dy) {
  const handle = page.locator(`[data-testid="${testId}"]`);
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  expectCondition(box, `No bounding box for ${testId}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 6 });
  await page.mouse.up();
}

async function waitForIdleSave(page) {
  await page.waitForFunction(
    () => document.querySelector('#editor-save-status')?.getAttribute('data-save-state') === 'idle',
  );
}

async function main() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'sfrb-tile-smoke-'));
  let child;
  let browser;

  try {
    await execFile('npm', ['run', 'build'], { cwd: repoRoot });

    const init = await execFile(
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
    expectCondition(init.stderr.trim().length === 0, `init produced stderr:\n${init.stderr}`);

    await execFile(
      process.execPath,
      [
        path.join(repoRoot, 'dist/cli.js'),
        'edit',
        '--cwd',
        workspace,
        '--op',
        JSON.stringify({
          op: 'set-block-text',
          blockId: 'summaryBlock',
          text: 'Tile smoke line one.\nTile smoke line two.',
        }),
      ],
      { cwd: repoRoot },
    );

    ({ child, url: globalThis.__tileSmokeUrl } = await waitForBridgeReady(workspace));
    const { chromium } = require('playwright');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(globalThis.__tileSmokeUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('#editor-canvas[data-physics-mode="design"]');

    // 1. Split the summary tile into two provenance-carrying tiles.
    await page.click('[data-testid="editor-frame-summaryFrame"]');
    await page.click('#tile-split');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid^="editor-frame-"]').length === 2);

    let document_ = await readDocument(workspace);
    expectCondition(document_.layout.frames.length === 2, 'Split should persist two frames.');
    expectCondition(
      document_.semantic.blocks.every((block) => block.splitFrom === 'summaryBlock'),
      'Split segments should carry provenance.',
    );

    const [firstFrameId, secondFrameId] = document_.layout.frames.map((frame) => frame.id);

    // 2. Group both tiles, then lock the composition.
    await page.click(`[data-testid="editor-frame-${firstFrameId}"]`);
    await page.click(`[data-testid="editor-frame-${secondFrameId}"]`, { modifiers: ['Shift'] });
    await page.click('#tile-group');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid^="tile-group-badge-"]').length === 1);
    await page.click(`[data-testid="editor-frame-${firstFrameId}"]`);
    await page.click('#tile-lock');
    await page.waitForFunction(() => {
      const badge = document.querySelector('[data-testid^="tile-group-badge-"]');
      return badge?.getAttribute('data-group-locked') === 'true';
    });

    document_ = await readDocument(workspace);
    expectCondition(document_.layout.frameGroups.length === 1, 'Grouping should persist one frame group.');
    expectCondition(document_.layout.frameGroups[0].locked === true, 'Locking should persist.');
    const groupId = document_.layout.frameGroups[0].id;
    const beforeMove = document_.layout.frames.map((frame) => ({ id: frame.id, x: frame.box.x, y: frame.box.y }));

    // 3. Translate the locked composition through the group handle.
    await dragByTestId(page, `tile-group-handle-${groupId}`, 30, 22);
    await waitForIdleSave(page);
    await page.waitForFunction(
      ({ frameId, expectedX }) => {
        const frame = document.querySelector(`[data-testid="editor-frame-${frameId}"]`);
        return frame?.getAttribute('data-frame-x') === String(expectedX);
      },
      { frameId: firstFrameId, expectedX: beforeMove[0].x + 30 },
    );

    document_ = await readDocument(workspace);
    for (const before of beforeMove) {
      const after = document_.layout.frames.find((frame) => frame.id === before.id);
      expectCondition(
        after.box.x === before.x + 30 && after.box.y === before.y + 22,
        `Group move should translate ${before.id}.`,
      );
    }

    // 4. A locked member drag is a visible no-write.
    const beforeRaw = await readFile(path.join(workspace, 'resume.sfrb.json'), 'utf8');
    await dragByTestId(page, `frame-handle-${firstFrameId}`, 50, 40);
    const note = await page.textContent('#tile-action-note');
    expectCondition(String(note).includes('locked'), `Blocked drag should explain the lock, received: ${note}`);
    const afterRaw = await readFile(path.join(workspace, 'resume.sfrb.json'), 'utf8');
    expectCondition(afterRaw === beforeRaw, 'Blocked locked-member drag must leave the document byte-stable.');

    console.log('Tile engine smoke verification passed: split, group, lock, group move, and blocked member drag.');
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
