#!/usr/bin/env node

/**
 * M004/S01 built-runtime smoke verifier: theme contract
 *
 * Proves the shared print surface publishes additive data-template-id /
 * data-template-version markers without disturbing the M003 trust contract,
 * for a workspace that has no explicit metadata.template (default fallback).
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

async function createTempWorkspace() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-verify-m004-s01-'));
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
        metadata: { title: 'Verify M004 S01', locale: 'en' },
        semantic: {
          sections: [{ id: 'sec1', title: 'Summary', blockIds: ['b1'] }],
          blocks: [{ id: 'b1', kind: 'paragraph', text: 'Theme contract default fallback.' }],
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

async function createTempWorkspaceWithExplicitTemplate() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-verify-m004-s01-explicit-'));
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
        metadata: {
          title: 'Verify M004 S01 (explicit)',
          locale: 'en',
          template: { id: 'default', version: '1' },
        },
        semantic: {
          sections: [{ id: 'sec1', title: 'Summary', blockIds: ['b1'] }],
          blocks: [{ id: 'b1', kind: 'paragraph', text: 'Explicit default template metadata.' }],
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

async function readPrintMarkers(page, baseUrl, mode) {
  const printUrl =
    mode === 'artifact' ? new URL('/print?mode=artifact', baseUrl).href : new URL('/print', baseUrl).href;
  await page.goto(printUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return (
      root?.getAttribute('data-export-state') !== 'blocked' || root?.getAttribute('data-blocked-reason') !== 'loading'
    );
  });
  return page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      exportState: root?.getAttribute('data-export-state') ?? null,
      overflowStatus: root?.getAttribute('data-overflow-status') ?? null,
      blockedReason: root?.getAttribute('data-blocked-reason') ?? null,
      riskCount: root?.getAttribute('data-risk-count') ?? null,
      maxOverflowPx: root?.getAttribute('data-max-overflow-px') ?? null,
      templateId: root?.getAttribute('data-template-id') ?? null,
      templateVersion: root?.getAttribute('data-template-version') ?? null,
    };
  });
}

async function main() {
  console.log('\nM004/S01: Theme Contract Verification\n');

  let browser;

  // Step 1: workspace WITHOUT metadata.template falls back to default.
  const projectRoot = await createTempWorkspace();
  let child;

  try {
    const bridge = await startBridge(projectRoot);
    child = bridge.child;

    const bootstrapResponse = await fetch(new URL('/__sfrb/bootstrap', bridge.url));
    const payload = await bootstrapResponse.json();
    assert(payload.status === 'ready', 'bootstrap reports ready for default-fallback workspace');
    assert(
      payload.document?.metadata?.template === undefined,
      'bootstrap payload omits metadata.template for back-compat workspace',
    );

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const previewMarkers = await readPrintMarkers(page, bridge.url, 'preview');
    assert(previewMarkers.templateId === 'default', '/print publishes data-template-id="default"');
    assert(previewMarkers.templateVersion === '1', '/print publishes data-template-version="1"');
    assert(previewMarkers.exportState === 'ready', '/print preserves data-export-state="ready"');
    assert(previewMarkers.overflowStatus === 'clear', '/print preserves data-overflow-status="clear"');
    assert(previewMarkers.riskCount === '0', '/print preserves data-risk-count="0"');
    assert(previewMarkers.maxOverflowPx === '0', '/print preserves data-max-overflow-px="0"');

    const artifactMarkers = await readPrintMarkers(page, bridge.url, 'artifact');
    assert(artifactMarkers.templateId === 'default', '/print?mode=artifact publishes data-template-id="default"');
    assert(artifactMarkers.templateVersion === '1', '/print?mode=artifact publishes data-template-version="1"');
    assert(artifactMarkers.exportState === 'ready', '/print?mode=artifact preserves data-export-state="ready"');

    await page.close();
  } finally {
    if (child) {
      child.kill('SIGTERM');
      await new Promise((resolve) => child.once('exit', resolve));
      child = null;
    }
    await rm(projectRoot, { recursive: true, force: true });
  }

  // Step 2: workspace WITH explicit metadata.template parses identically.
  const explicitRoot = await createTempWorkspaceWithExplicitTemplate();

  try {
    const bridge = await startBridge(explicitRoot);
    child = bridge.child;

    const bootstrapResponse = await fetch(new URL('/__sfrb/bootstrap', bridge.url));
    const payload = await bootstrapResponse.json();
    assert(payload.status === 'ready', 'bootstrap reports ready for explicit-template workspace');
    assert(
      payload.document?.metadata?.template?.id === 'default',
      'bootstrap payload preserves explicit metadata.template.id',
    );
    assert(
      payload.document?.metadata?.template?.version === '1',
      'bootstrap payload preserves explicit metadata.template.version',
    );

    const page = await browser.newPage();
    const explicitMarkers = await readPrintMarkers(page, bridge.url, 'preview');
    assert(
      explicitMarkers.templateId === 'default',
      '/print publishes data-template-id="default" for explicit workspace',
    );
    assert(explicitMarkers.exportState === 'ready', '/print preserves M003 export state for explicit workspace');
    await page.close();
  } finally {
    if (child) {
      child.kill('SIGTERM');
      await new Promise((resolve) => child.once('exit', resolve));
    }
    if (browser) {
      await browser.close();
    }
    await rm(explicitRoot, { recursive: true, force: true });
  }

  console.log(
    exitCode === 0
      ? '\nM004/S01 theme contract verification passed.\n'
      : '\nM004/S01 theme contract verification FAILED.\n',
  );
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
