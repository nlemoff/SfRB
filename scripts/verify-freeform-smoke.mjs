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
  const child = spawn(process.execPath, [path.join(repoRoot, 'dist/cli.js'), 'open', '--cwd', projectRoot, '--port', '0', '--no-open'], {
    cwd: repoRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

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

async function dragElement(page, testId, dx, dy) {
  const element = page.locator(`[data-testid="${testId}"]`);
  await element.scrollIntoViewIfNeeded();
  const box = await element.boundingBox();
  expectCondition(box, `No bounding box for ${testId}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 6 });
  await page.mouse.up();
}

async function main() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'sfrb-freeform-smoke-'));
  let child;
  let browser;

  try {
    await execFile('npm', ['run', 'build'], { cwd: repoRoot });

    await execFile(
      process.execPath,
      [path.join(repoRoot, 'dist/cli.js'), 'init', '--cwd', workspace, '--starter', 'template', '--physics', 'design', '--skip-ai'],
      { cwd: repoRoot },
    );

    ({ child, url: globalThis.__freeformSmokeUrl } = await waitForBridgeReady(workspace));
    const { chromium } = require('playwright');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(globalThis.__freeformSmokeUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('#editor-canvas[data-physics-mode="design"]');

    await page.click('[data-testid="lens-freeform"]');
    await page.waitForSelector('#editor-canvas[data-active-surface="freeform"]');

    // 1. Move an ungrouped element and verify the canonical write.
    const before = await readDocument(workspace);
    const skillsBefore = before.layout.frames.find((frame) => frame.id === 'skillsFrame').box;
    await dragElement(page, 'editor-frame-skillsFrame', 26, 14);
    await page.waitForFunction(() => document.querySelector('#editor-save-status')?.getAttribute('data-save-state') === 'idle');
    await page.waitForFunction(
      ({ expectedX }) =>
        document.querySelector('[data-testid="editor-frame-skillsFrame"]')?.getAttribute('data-frame-x') === String(expectedX),
      { expectedX: skillsBefore.x + 26 },
    );

    let document_ = await readDocument(workspace);
    const skillsAfter = document_.layout.frames.find((frame) => frame.id === 'skillsFrame').box;
    expectCondition(
      skillsAfter.x === skillsBefore.x + 26 && skillsAfter.y === skillsBefore.y + 14,
      'Freeform move should persist the element box.',
    );

    // 2. A locked-composition member is a visible no-write.
    const beforeRaw = await readFile(path.join(workspace, 'resume.sfrb.json'), 'utf8');
    await dragElement(page, 'editor-frame-heroNameFrame', 40, 30);
    const moveState = await page.getAttribute('[data-testid="freeform-move-state"]', 'data-move-state');
    expectCondition(moveState === 'blocked', `Expected blocked move state, received ${moveState}`);
    const note = await page.textContent('#freeform-action-note');
    expectCondition(String(note).includes('locked'), `Blocked move should explain the lock, received: ${note}`);
    const afterRaw = await readFile(path.join(workspace, 'resume.sfrb.json'), 'utf8');
    expectCondition(afterRaw === beforeRaw, 'Blocked freeform move must leave the document byte-stable.');

    // 3. Divider elements round-trip through the canonical operations.
    await page.click('#freeform-add-divider');
    await page.waitForFunction(() => document.querySelectorAll('[data-element-kind="divider"]').length === 1);
    document_ = await readDocument(workspace);
    expectCondition(
      document_.semantic.blocks.some((block) => block.kind === 'divider'),
      'Adding a divider should persist a divider block.',
    );

    console.log('Freeform smoke verification passed: element move, blocked locked member, and divider insertion.');
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
