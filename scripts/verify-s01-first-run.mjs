import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const execFileAsync = promisify(execFile);

async function ensureBuilt() {
  await execFileAsync('npm', ['run', 'build'], {
    cwd: process.cwd(),
    env: process.env,
  });
}

async function runInit(projectRoot, starterKind) {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ['dist/cli.js', 'init', '--cwd', projectRoot, '--starter', starterKind, '--physics', 'design', '--skip-ai'],
    {
      cwd: process.cwd(),
      env: process.env,
    },
  );

  if (stderr.trim().length > 0) {
    throw new Error(`init produced stderr for ${starterKind}:\n${stderr}`);
  }

  const summaryStart = stdout.indexOf('{');
  if (summaryStart < 0) {
    throw new Error(`Could not find init summary JSON for ${starterKind}:\n${stdout}`);
  }

  const summary = JSON.parse(stdout.slice(summaryStart));
  const config = JSON.parse(await readFile(path.join(projectRoot, 'sfrb.config.json'), 'utf8'));
  const document = JSON.parse(await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8'));

  if ('ai' in config) {
    throw new Error(`Expected AI-skipped config for ${starterKind}, but sfrb.config.json still had ai settings.`);
  }

  if (document.metadata?.starter?.kind !== starterKind) {
    throw new Error(`Expected starter kind ${starterKind} on disk, received ${JSON.stringify(document.metadata?.starter)}`);
  }

  return { stdout, summary, document };
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

  return { child, url: urlMatch[1], stdout, stderr };
}

async function closeBridge(child) {
  child.kill('SIGTERM');
  await new Promise((resolve) => child.once('exit', () => resolve()));
}

async function fetchBootstrap(baseUrl) {
  const response = await fetch(new URL('/__sfrb/bootstrap', baseUrl));
  return {
    status: response.status,
    payload: await response.json(),
  };
}

function expectCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForEditorIdle(page) {
  await page.waitForFunction(() => document.querySelector('#editor-save-status')?.getAttribute('data-save-state') === 'idle');
}

async function verifyStarterLoop(starterKind) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), `sfrb-s01-first-run-${starterKind}-`));
  let child;
  let browser;

  try {
    const { stdout: initStdout, summary: initSummary, document: initDocument } = await runInit(projectRoot, starterKind);
    expectCondition(initStdout.includes('SfRB init complete.'), `Expected init completion banner for ${starterKind}, received:\n${initStdout}`);
    expectCondition(initSummary.workspace?.starter?.kind === starterKind, `Init summary starter mismatch for ${starterKind}: ${JSON.stringify(initSummary, null, 2)}`);
    expectCondition(initSummary.ai?.status === 'skipped', `Init summary AI status mismatch for ${starterKind}: ${JSON.stringify(initSummary, null, 2)}`);

    ({ child, url: globalThis.__bridgeUrl, stderr: globalThis.__bridgeStderr } = await waitForBridgeReady(projectRoot));

    const initial = await fetchBootstrap(globalThis.__bridgeUrl);
    expectCondition(initial.status === 200, `Expected bootstrap 200 for ${starterKind}, received ${initial.status}`);
    expectCondition(initial.payload.status === 'ready', `Expected ready bootstrap for ${starterKind}, received ${JSON.stringify(initial.payload, null, 2)}`);
    expectCondition(initial.payload.starter?.kind === starterKind, `Expected bootstrap starter kind ${starterKind}, received ${JSON.stringify(initial.payload.starter)}`);
    expectCondition(initial.payload.ai?.status === 'skipped', `Expected AI skipped bootstrap state for ${starterKind}, received ${JSON.stringify(initial.payload.ai)}`);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(globalThis.__bridgeUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('#editor-canvas[data-physics-mode="design"]');
    await page.waitForSelector('[data-testid="first-run-guidance"]');

    const starterLabel = await page.textContent('#starter-kind');
    const starterGuidance = await page.textContent('#starter-guidance');
    const aiStatus = await page.textContent('#workspace-ai-status');
    const aiNote = await page.textContent('#workspace-ai-note');
    const consultantState = await page.getAttribute('#consultant-status', 'data-consultant-state');
    const consultantCode = await page.getAttribute('#consultant-panel', 'data-consultant-code');

    expectCondition(starterLabel?.includes(starterKind === 'template' ? 'Template starter' : 'Blank starter'), `Starter label mismatch for ${starterKind}: ${starterLabel}`);
    expectCondition(starterGuidance?.length > 20, `Starter guidance was not populated for ${starterKind}.`);
    expectCondition(aiStatus?.includes('skipped'), `AI status mismatch for ${starterKind}: ${aiStatus}`);
    expectCondition(aiNote?.includes('Text and tile editing still save normally'), `AI note mismatch for ${starterKind}: ${aiNote}`);
    expectCondition(consultantState === 'unavailable', `Expected unavailable consultant state for ${starterKind}, received ${consultantState}`);
    expectCondition(consultantCode === 'skipped', `Expected skipped consultant code for ${starterKind}, received ${consultantCode}`);

    const blockId = starterKind === 'template' ? 'heroSummaryBlock' : 'summaryBlock';
    const frameId = starterKind === 'template' ? 'heroSummaryFrame' : 'summaryFrame';
    const nextText = starterKind === 'template'
      ? 'Template first-run smoke replacement persisted through the shipped bridge loop.'
      : 'Blank first-run smoke replacement persisted through the shipped bridge loop.';

    await page.dblclick(`[data-testid="editor-frame-${frameId}"]`);
    await page.waitForSelector('#editor-active-textarea');
    await page.fill('#editor-active-textarea', nextText);
    await waitForEditorIdle(page);
    await page.waitForFunction((expectedText) => {
      const signal = document.querySelector('#bridge-last-signal')?.textContent ?? '';
      const payloadPreview = document.querySelector('#bridge-payload-preview')?.textContent ?? '';
      return signal.includes('sfrb:bridge-update') && signal.includes('resume.sfrb.json') && payloadPreview.includes(expectedText);
    }, nextText);

    const updated = await fetchBootstrap(globalThis.__bridgeUrl);
    const updatedBlock = updated.payload.document?.semantic?.blocks?.find?.((block) => block.id === blockId);
    expectCondition(updatedBlock?.text === nextText, `Bootstrap did not reflect edited text for ${starterKind}: ${JSON.stringify(updatedBlock)}`);

    const diskDocument = JSON.parse(await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8'));
    const diskBlock = diskDocument.semantic.blocks.find((block) => block.id === blockId);
    expectCondition(diskBlock?.text === nextText, `Disk document did not persist edited text for ${starterKind}: ${JSON.stringify(diskBlock)}`);
    expectCondition(diskDocument.metadata?.starter?.id === initDocument.metadata?.starter?.id, `Starter metadata drifted for ${starterKind}.`);

    const stderrText = globalThis.__bridgeStderr.join('');
    expectCondition(stderrText.length === 0, `Bridge stderr was not empty for ${starterKind}:\n${stderrText}`);

    console.log(`${starterKind} starter OK: guidance rendered from bootstrap, AI-skipped consultant state stayed inspectable, and canonical save/refetch persisted replacement text.`);
    await page.close();
  } finally {
    if (browser) {
      await browser.close();
    }
    if (child) {
      await closeBridge(child);
    }
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function main() {
  await ensureBuilt();
  await verifyStarterLoop('template');
  await verifyStarterLoop('blank');
  console.log('S01 first-run smoke verification passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
