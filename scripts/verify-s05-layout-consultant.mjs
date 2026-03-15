import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
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

async function writeWorkspaceFiles(projectRoot, { physics = 'design', title = 'S05 Smoke Resume', blockText, provider = 'openai', apiKeyEnvVar = 'OPENAI_API_KEY' } = {}) {
  const resolvedBlockText = blockText ?? Array.from({ length: 10 }, (_, index) => `S05 smoke overflow line ${index + 1}.`).join('\n');
  await writeFile(
    path.join(projectRoot, 'sfrb.config.json'),
    `${JSON.stringify({
      version: 1,
      ai: { provider, apiKeyEnvVar },
      workspace: { physics },
    }, null, 2)}\n`,
    'utf8',
  );

  await writeFile(
    path.join(projectRoot, 'resume.sfrb.json'),
    `${JSON.stringify({
      version: 1,
      metadata: { title, locale: 'en-US' },
      semantic: {
        sections: [{ id: 'summary', title: 'Summary', blockIds: ['summaryBlock'] }],
        blocks: [{ id: 'summaryBlock', kind: 'paragraph', text: resolvedBlockText }],
      },
      layout: {
        pages: [{ id: 'pageOne', size: { width: 612, height: 792 }, margin: { top: 36, right: 36, bottom: 36, left: 36 } }],
        frames: [{ id: 'summaryFrame', pageId: 'pageOne', blockId: 'summaryBlock', box: { x: 36, y: 48, width: 540, height: 96 }, zIndex: 0 }],
      },
    }, null, 2)}\n`,
    'utf8',
  );
}

async function readWorkspaceDocument(projectRoot) {
  return JSON.parse(await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8'));
}

async function readWorkspaceDocumentRaw(projectRoot) {
  return readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8');
}

async function waitForBridgeReady(projectRoot, env = process.env) {
  const child = spawn(process.execPath, ['dist/cli.js', 'open', '--cwd', projectRoot, '--port', '0', '--no-open'], {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout = [];
  const stderr = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
  child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));

  const readyOutput = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for bridge readiness.\nstdout:\n${stdout.join('')}\nstderr:\n${stderr.join('')}`)), 15000);
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
  await new Promise((resolve) => child.once('exit', resolve));
}

async function createOpenAiStubServer(handler) {
  const server = http.createServer((request, response) => {
    if (request.method !== 'POST' || request.url !== '/chat/completions') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'not_found' }));
      return;
    }
    handler(request, response);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve stub provider address.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }),
  };
}

async function waitForEditorIdle(page) {
  await page.waitForFunction(() => document.querySelector('#editor-save-status')?.getAttribute('data-save-state') === 'idle');
}

async function openDesignWorkspace(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('#editor-canvas[data-physics-mode="design"]');
}

async function waitForOverflowStatus(page, expected) {
  await page.waitForFunction((expectedStatus) => document.querySelector('#consultant-overflow-status')?.getAttribute('data-overflow-status') === expectedStatus, expected);
}

async function waitForConsultantState(page, expected) {
  await page.waitForFunction((expectedState) => document.querySelector('#consultant-status')?.getAttribute('data-consultant-state') === expectedState, expected);
}

async function waitForPreviewVisible(page, visible) {
  await page.waitForFunction((expectedVisibility) => document.querySelector('#consultant-preview-state')?.getAttribute('data-preview-visible') === expectedVisibility, String(visible));
}

async function waitForBridgeUpdateSignal(page) {
  await page.waitForFunction(() => {
    const signal = document.querySelector('#bridge-last-signal')?.textContent ?? '';
    return signal.includes('sfrb:bridge-update') && signal.includes('resume.sfrb.json');
  });
}

async function readConsultantDiagnostics(page) {
  const ghost = page.locator('[data-testid="consultant-ghost-preview-summaryFrame"]');
  const ghostCount = await ghost.count();
  const overflowPx = await page.getAttribute('#consultant-measurements', 'data-overflow-px');
  const errorText = await page.locator('#consultant-error').evaluate((element) => element.hidden ? null : element.textContent);

  return {
    consultantState: await page.getAttribute('#consultant-status', 'data-consultant-state'),
    consultantCode: await page.getAttribute('#consultant-panel', 'data-consultant-code'),
    overflowStatus: await page.getAttribute('#consultant-overflow-status', 'data-overflow-status'),
    overflowPx: overflowPx === null || overflowPx === '' ? null : Number(overflowPx),
    previewVisible: (await page.getAttribute('#consultant-preview-state', 'data-preview-visible')) === 'true',
    rationale: await page.textContent('#consultant-rationale'),
    note: await page.textContent('#consultant-state-note'),
    errorText,
    payloadPreview: await page.locator('#bridge-payload-preview').textContent(),
    ghostCount,
    ghostHeight: ghostCount > 0 ? await ghost.getAttribute('data-frame-height') : null,
  };
}

function expectCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function verifyHappyPath(browser) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'sfrb-s05-happy-smoke-'));
  const provider = await createOpenAiStubServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            frameId: 'summaryFrame',
            box: { x: 36, y: 48, width: 540, height: 420 },
            rationale: 'Increase frame height so the overflowing summary can fit without clipping.',
            confidence: 0.94,
          }),
        },
      }],
    }));
  });

  let child;
  try {
    await writeWorkspaceFiles(projectRoot, { title: 'S05 Happy Smoke' });
    const beforeRaw = await readWorkspaceDocumentRaw(projectRoot);
    ({ child, url: globalThis.__s05HappyUrl, stderr: globalThis.__s05HappyStderr } = await waitForBridgeReady(projectRoot, {
      ...process.env,
      OPENAI_API_KEY: 'sk-test-layout-consultant-smoke',
      SFRB_OPENAI_BASE_URL: provider.baseUrl,
    }));

    const page = await browser.newPage();
    await openDesignWorkspace(page, globalThis.__s05HappyUrl);
    await page.click('[data-testid="editor-frame-summaryFrame"]');
    await waitForOverflowStatus(page, 'overflow');

    const before = await readConsultantDiagnostics(page);
    expectCondition(before.consultantState === 'idle', `Expected idle before request, received ${before.consultantState}`);
    expectCondition(before.overflowPx !== null && before.overflowPx > 0, `Expected positive overflowPx before request, received ${before.overflowPx}`);
    expectCondition(before.previewVisible === false, 'Expected no preview before request.');

    await page.click('#consultant-request');
    await waitForConsultantState(page, 'preview');
    const preview = await readConsultantDiagnostics(page);
    expectCondition(preview.previewVisible === true, 'Expected preview after consultant request.');
    expectCondition(preview.ghostCount === 1, `Expected one ghost preview, received ${preview.ghostCount}`);
    expectCondition(preview.ghostHeight === '420', `Expected ghost height 420, received ${preview.ghostHeight}`);
    expectCondition(String(preview.rationale).includes('Increase frame height'), 'Expected rationale text for preview.');

    await page.click('#consultant-reject');
    await waitForPreviewVisible(page, false);
    const rejected = await readConsultantDiagnostics(page);
    const afterRejectRaw = await readWorkspaceDocumentRaw(projectRoot);
    expectCondition(rejected.consultantCode === 'rejected', `Expected rejected code after reject, received ${rejected.consultantCode}`);
    expectCondition(afterRejectRaw === beforeRaw, 'Canonical document changed after reject.');
    expectCondition(String(rejected.payloadPreview).includes('"height": 96'), 'Payload preview drifted after reject.');

    await page.click('#consultant-request');
    await waitForConsultantState(page, 'preview');
    await page.click('#consultant-accept');
    await waitForEditorIdle(page);
    await waitForPreviewVisible(page, false);
    await waitForBridgeUpdateSignal(page);
    await waitForOverflowStatus(page, 'clear');

    const accepted = await readConsultantDiagnostics(page);
    const documentOnDisk = await readWorkspaceDocument(projectRoot);
    expectCondition(documentOnDisk.layout.frames[0]?.box?.height === 420, `Expected persisted frame height 420, received ${JSON.stringify(documentOnDisk.layout.frames[0]?.box)}`);
    expectCondition(accepted.previewVisible === false, 'Preview should be cleared after accept persists.');
    expectCondition(accepted.overflowStatus === 'clear', `Expected overflow to clear, received ${accepted.overflowStatus}`);
    expectCondition(String(accepted.payloadPreview).includes('"height": 420'), 'Payload preview did not reflect accepted canonical write.');
    expectCondition(globalThis.__s05HappyStderr.join('') === '', `Bridge stderr was not empty:\n${globalThis.__s05HappyStderr.join('')}`);
    console.log('S05 happy path OK: reject preserved resume.sfrb.json, accept persisted consultant resize, overflow cleared.');
    await page.close();
  } finally {
    if (child) {
      await closeBridge(child);
    }
    await provider.close();
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function verifyMissingSecretPath(browser) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'sfrb-s05-missing-secret-smoke-'));
  let child;
  try {
    await writeWorkspaceFiles(projectRoot, { title: 'S05 Missing Secret Smoke' });
    const beforeDocument = await readWorkspaceDocument(projectRoot);
    const beforeRaw = await readWorkspaceDocumentRaw(projectRoot);
    const env = { ...process.env };
    delete env.OPENAI_API_KEY;
    ({ child, url: globalThis.__s05FailureUrl } = await waitForBridgeReady(projectRoot, env));

    const page = await browser.newPage();
    await openDesignWorkspace(page, globalThis.__s05FailureUrl);
    await page.click('[data-testid="editor-frame-summaryFrame"]');
    await waitForOverflowStatus(page, 'overflow');
    await page.click('#consultant-request');
    await waitForConsultantState(page, 'error');

    const failure = await readConsultantDiagnostics(page);
    const afterDocument = await readWorkspaceDocument(projectRoot);
    const afterRaw = await readWorkspaceDocumentRaw(projectRoot);
    expectCondition(failure.previewVisible === false, 'Failure path should not show a ghost preview.');
    expectCondition(failure.consultantCode === 'configuration_missing', `Expected configuration_missing code, received ${failure.consultantCode}`);
    expectCondition(String(failure.errorText).includes('OPENAI_API_KEY'), 'Failure surface did not identify the missing env var.');
    expectCondition(JSON.stringify(afterDocument) === JSON.stringify(beforeDocument), 'Canonical document structure changed during missing-secret failure.');
    expectCondition(afterRaw === beforeRaw, 'Canonical raw file changed during missing-secret failure.');
    expectCondition(String(failure.payloadPreview).includes('"height": 96'), 'Payload preview drifted during missing-secret failure.');
    console.log('S05 failure path OK: missing secret surfaced in UI diagnostics and canonical document remained unchanged.');
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
  if (!['all', 'happy', 'failure'].includes(options.mode)) {
    throw new Error(`Unsupported --mode ${options.mode}. Expected one of: all, happy, failure.`);
  }

  await ensureBuilt();

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    if (options.mode === 'all' || options.mode === 'happy') {
      await verifyHappyPath(browser);
    }
    if (options.mode === 'all' || options.mode === 'failure') {
      await verifyMissingSecretPath(browser);
    }
    console.log(`S05 layout consultant smoke verification passed for mode=${options.mode}.`);
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
