#!/usr/bin/env node

/**
 * S01 built-runtime smoke verifier: print surface
 *
 * Proves the bridge serves a /print route that returns HTML referencing
 * the print surface entry point, and that the bootstrap endpoint is
 * accessible from the same runtime.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-verify-s01-'));
  await writeFile(path.join(dir, 'sfrb.config.json'), JSON.stringify({
    version: 1,
    workspace: { physics: 'document' },
  }, null, 2));
  await writeFile(path.join(dir, 'resume.sfrb.json'), JSON.stringify({
    version: 1,
    metadata: { title: 'Verify S01', locale: 'en' },
    semantic: {
      sections: [{ id: 'sec1', title: 'Summary', blockIds: ['b1'] }],
      blocks: [{ id: 'b1', kind: 'paragraph', text: 'S01 print surface verification.' }],
    },
    layout: {
      pages: [{ id: 'p1', size: { width: 612, height: 792 }, margin: { top: 36, right: 36, bottom: 36, left: 36 } }],
      frames: [],
    },
  }, null, 2));
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

async function main() {
  console.log('\nS01: Print Surface Verification\n');

  const projectRoot = await createTempWorkspace();
  let child;

  try {
    const bridge = await startBridge(projectRoot);
    child = bridge.child;

    // Verify /print route
    const printResponse = await fetch(new URL('/print', bridge.url));
    assert(printResponse.status === 200, '/print returns 200');
    const printHtml = await printResponse.text();
    assert(printHtml.includes('print-main.tsx'), '/print references print-main.tsx');
    assert(printHtml.includes('<div id="root"></div>'), '/print has root mount point');

    // Verify /print?mode=artifact route
    const artifactResponse = await fetch(new URL('/print?mode=artifact', bridge.url));
    assert(artifactResponse.status === 200, '/print?mode=artifact returns 200');

    // Verify bootstrap is accessible
    const bootstrapResponse = await fetch(new URL('/__sfrb/bootstrap', bridge.url));
    assert(bootstrapResponse.status === 200, 'bootstrap returns 200');
    const payload = await bootstrapResponse.json();
    assert(payload.status === 'ready', 'bootstrap reports ready');
    assert(payload.physics === 'document', 'bootstrap reports correct physics');

    // Verify editor still works at /
    const editorResponse = await fetch(bridge.url);
    assert(editorResponse.status === 200, 'editor at / returns 200');
    const editorHtml = await editorResponse.text();
    assert(editorHtml.includes('main.tsx'), 'editor references main.tsx');
  } finally {
    if (child) {
      child.kill('SIGTERM');
      await new Promise((resolve) => child.once('exit', resolve));
    }
    await rm(projectRoot, { recursive: true, force: true });
  }

  console.log(exitCode === 0 ? '\nS01 verification passed.\n' : '\nS01 verification FAILED.\n');
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
