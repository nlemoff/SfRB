import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const modeIndex = argv.indexOf('--mode');
  return {
    mode: modeIndex >= 0 ? argv[modeIndex + 1] : 'all',
  };
}

async function ensureBuilt() {
  await execFileAsync('npm', ['run', 'build'], {
    cwd: process.cwd(),
    env: process.env,
  });
}

async function writeWorkspaceFiles(projectRoot, { physics = 'document', title = 'S04 Smoke Resume', blockText = 'Initial smoke text.' } = {}) {
  const frames = physics === 'design'
    ? [
        {
          id: 'summaryFrame',
          pageId: 'pageOne',
          blockId: 'summaryBlock',
          box: { x: 36, y: 48, width: 540, height: 96 },
          zIndex: 0,
        },
      ]
    : [];

  await writeFile(
    path.join(projectRoot, 'sfrb.config.json'),
    `${JSON.stringify(
      {
        version: 1,
        ai: {
          provider: 'openai',
          apiKeyEnvVar: 'OPENAI_API_KEY',
        },
        workspace: {
          physics,
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  await writeFile(
    path.join(projectRoot, 'resume.sfrb.json'),
    `${JSON.stringify(
      {
        version: 1,
        metadata: {
          title,
          locale: 'en-US',
        },
        semantic: {
          sections: [
            {
              id: 'summary',
              title: 'Summary',
              blockIds: ['summaryBlock'],
            },
          ],
          blocks: [
            {
              id: 'summaryBlock',
              kind: 'paragraph',
              text: blockText,
            },
          ],
        },
        layout: {
          pages: [
            {
              id: 'pageOne',
              size: { width: 612, height: 792 },
              margin: { top: 36, right: 36, bottom: 36, left: 36 },
            },
          ],
          frames,
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

async function waitForBridgeReady(projectRoot) {
  const child = spawn(process.execPath, ['dist/cli.js', 'open', '--cwd', projectRoot, '--port', '0', '--no-open'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout = [];
  const stderr = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
  child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));

  const readyOutput = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for bridge readiness.\nstdout:\n${stdout.join('')}\nstderr:\n${stderr.join('')}`));
    }, 15000);

    child.stdout.on('data', () => {
      const combined = stdout.join('');
      if (combined.includes('SfRB bridge ready at http://') && combined.includes(`Workspace root: ${projectRoot}`)) {
        clearTimeout(timeout);
        resolve(combined);
      }
    });

    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Bridge exited before readiness with code ${code}.\nstdout:\n${stdout.join('')}\nstderr:\n${stderr.join('')}`));
    });
  });

  const urlMatch = readyOutput.match(/SfRB bridge ready at (http:\/\/[^\s]+)/);
  if (!urlMatch?.[1]) {
    throw new Error(`Could not parse bridge URL from readiness output:\n${readyOutput}`);
  }

  return { child, url: urlMatch[1], stderr };
}

async function closeBridge(child) {
  child.kill('SIGTERM');
  await new Promise((resolve) => child.once('exit', () => resolve()));
}

async function waitForEditorIdle(page) {
  await page.waitForFunction(() => document.querySelector('#editor-save-status')?.getAttribute('data-save-state') === 'idle');
}

async function verifyDocumentMode(browser) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'sfrb-s04-document-smoke-'));
  let child;
  try {
    await writeWorkspaceFiles(projectRoot, {
      physics: 'document',
      title: 'S04 Document Smoke',
      blockText: 'Smoke text before editing.',
    });

    ({ child, url: globalThis.__documentBridgeUrl, stderr: globalThis.__documentBridgeStderr } = await waitForBridgeReady(projectRoot));
    const page = await browser.newPage();
    await page.goto(globalThis.__documentBridgeUrl, { waitUntil: 'networkidle' });

    await page.waitForSelector('#editor-canvas[data-physics-mode="document"]');
    if ((await page.textContent('#physics-mode'))?.trim() !== 'document') {
      throw new Error(`Expected document physics mode, received: ${await page.textContent('#physics-mode')}`);
    }

    if (await page.getAttribute('#editor-drag-affordance-status', 'data-drag-affordances') !== 'absent') {
      throw new Error('Document mode should report drag affordances as absent.');
    }

    if (await page.locator('[data-testid^="frame-handle"]').count() !== 0) {
      throw new Error('Document mode unexpectedly rendered frame drag handles.');
    }

    console.log('Document-mode affordance split OK: semantic flow active, drag UI absent.');

    await page.click('[data-testid="editor-block-summaryBlock"]');
    await page.waitForSelector('#editor-active-textarea');

    const nextText = 'Smoke text persisted from the DOM-first canvas.';
    await page.fill('#editor-active-textarea', nextText);

    await waitForEditorIdle(page);
    if ((await page.evaluate(() => document.activeElement?.id)) !== 'editor-active-textarea') {
      throw new Error('Active edit lost focus during document-mode save reconciliation.');
    }

    await page.waitForFunction(() => {
      const signal = document.querySelector('#bridge-last-signal')?.textContent ?? '';
      return signal.includes('sfrb:bridge-update') && signal.includes('resume.sfrb.json');
    });

    await page.locator('#editor-active-textarea').evaluate((element) => element.blur());
    await page.waitForFunction(() => !document.querySelector('#editor-active-textarea'));

    const documentOnDisk = JSON.parse(await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8'));
    const blockText = documentOnDisk.semantic.blocks[0]?.text;
    if (blockText !== nextText) {
      throw new Error(`Expected persisted block text ${JSON.stringify(nextText)}, received ${JSON.stringify(blockText)}`);
    }

    if (documentOnDisk.layout.frames.length !== 0) {
      throw new Error('Document-mode smoke expected no layout frames on disk.');
    }

    const stderrText = globalThis.__documentBridgeStderr.join('');
    if (stderrText.length > 0) {
      throw new Error(`Bridge stderr was not empty:\n${stderrText}`);
    }

    console.log('Document-mode persistence OK: inline editing survived save/refetch and resume.sfrb.json updated.');
    await page.close();
  } finally {
    if (child) {
      await closeBridge(child);
    }
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function verifyDesignMode(browser) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'sfrb-s04-design-smoke-'));
  let child;
  try {
    await writeWorkspaceFiles(projectRoot, {
      physics: 'design',
      title: 'S04 Design Smoke',
      blockText: 'Design smoke text before dragging.',
    });

    ({ child, url: globalThis.__designBridgeUrl, stderr: globalThis.__designBridgeStderr } = await waitForBridgeReady(projectRoot));
    const page = await browser.newPage();
    await page.goto(globalThis.__designBridgeUrl, { waitUntil: 'networkidle' });

    await page.waitForSelector('#editor-canvas[data-physics-mode="design"]');
    if ((await page.textContent('#physics-mode'))?.trim() !== 'design') {
      throw new Error(`Expected design physics mode, received: ${await page.textContent('#physics-mode')}`);
    }

    if (await page.getAttribute('#editor-drag-affordance-status', 'data-drag-affordances') !== 'present') {
      throw new Error('Design mode should expose drag affordances.');
    }

    if (await page.locator('[data-testid="frame-handle-summaryFrame"]').count() !== 1) {
      throw new Error('Design mode should render one drag handle for the single frame.');
    }

    await page.click('[data-testid="editor-frame-summaryFrame"]');
    if (await page.getAttribute('#editor-selected-frame', 'data-selected-frame-id') !== 'summaryFrame') {
      throw new Error('Selecting a frame did not update selected-frame diagnostics.');
    }

    const handle = page.locator('[data-testid="frame-handle-summaryFrame"]');
    const handleBox = await handle.boundingBox();
    if (!handleBox) {
      throw new Error('Design-mode drag handle was not visible.');
    }

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 44, handleBox.y + handleBox.height / 2 + 28, { steps: 8 });
    await page.mouse.up();

    await page.waitForFunction(() => {
      const frameElement = document.querySelector('[data-testid="editor-frame-summaryFrame"]');
      return frameElement?.getAttribute('data-frame-x') === '80' && frameElement?.getAttribute('data-frame-y') === '76';
    });
    await waitForEditorIdle(page);
    await page.waitForFunction(() => {
      const signal = document.querySelector('#bridge-last-signal')?.textContent ?? '';
      return signal.includes('sfrb:bridge-update') && signal.includes('resume.sfrb.json');
    });

    await page.dblclick('[data-testid="editor-frame-summaryFrame"]');
    await page.waitForSelector('#editor-active-textarea');
    const nextText = 'Design smoke text persisted after dragging.';
    await page.fill('#editor-active-textarea', nextText);
    await waitForEditorIdle(page);
    await page.locator('#editor-active-textarea').evaluate((element) => element.blur());
    await page.waitForFunction(() => !document.querySelector('#editor-active-textarea'));

    const documentOnDisk = JSON.parse(await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8'));
    const blockText = documentOnDisk.semantic.blocks[0]?.text;
    if (blockText !== nextText) {
      throw new Error(`Expected design-mode text ${JSON.stringify(nextText)}, received ${JSON.stringify(blockText)}`);
    }

    const frameBox = documentOnDisk.layout.frames[0]?.box;
    if (!frameBox || frameBox.x !== 80 || frameBox.y !== 76 || frameBox.width !== 540 || frameBox.height !== 96) {
      throw new Error(`Expected persisted design frame box to be x:80 y:76 w:540 h:96, received ${JSON.stringify(frameBox)}`);
    }

    const stderrText = globalThis.__designBridgeStderr.join('');
    if (stderrText.length > 0) {
      throw new Error(`Bridge stderr was not empty:\n${stderrText}`);
    }

    console.log('Design-mode persistence OK: frame drag saved geometry and linked text editing still worked.');
    await page.close();
  } finally {
    if (child) {
      await closeBridge(child);
    }
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!['all', 'document', 'design'].includes(options.mode)) {
    throw new Error(`Unsupported --mode ${options.mode}. Expected one of: all, document, design.`);
  }

  await ensureBuilt();

  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    if (options.mode === 'all' || options.mode === 'document') {
      await verifyDocumentMode(browser);
    }

    if (options.mode === 'all' || options.mode === 'design') {
      await verifyDesignMode(browser);
    }

    console.log(`S04 editor smoke verification passed for mode=${options.mode}.`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
