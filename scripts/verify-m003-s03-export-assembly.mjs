#!/usr/bin/env node

/**
 * M003/S03 built-runtime smoke verifier: export assembly
 *
 * Proves the assembled path: bridge serves /print, bootstrap is ready,
 * and CLI export produces a %PDF artifact from the same workspace.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
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
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-verify-m003-s03-'));
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
        metadata: { title: 'Assembly Proof', locale: 'en' },
        semantic: {
          sections: [{ id: 'sec1', title: 'Summary', blockIds: ['b1'] }],
          blocks: [{ id: 'b1', kind: 'paragraph', text: 'M003 assembled export assembly proof.' }],
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

async function runExport(projectRoot, outputPath) {
  const child = spawn(
    process.execPath,
    [cliEntry, 'export', '--cwd', projectRoot, '--output', outputPath, '--port', '0'],
    {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  const stdout = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));

  const code = await new Promise((resolve) => {
    child.once('exit', (c) => resolve(c ?? 1));
  });

  return { exitCode: code, stdout: stdout.join('') };
}

async function main() {
  console.log('\nM003/S03: Export Assembly Verification\n');

  const projectRoot = await createTempWorkspace();
  let child;

  try {
    // Step 1: Verify bridge serves /print with canonical content
    const bridge = await startBridge(projectRoot);
    child = bridge.child;

    const printResponse = await fetch(new URL('/print', bridge.url));
    assert(printResponse.status === 200, '/print returns 200');

    const bootstrapResponse = await fetch(new URL('/__sfrb/bootstrap', bridge.url));
    const payload = await bootstrapResponse.json();
    assert(payload.status === 'ready', 'bootstrap reports ready');

    // Step 2: Verify the same workspace document includes our text
    assert(
      payload.document?.semantic?.blocks?.some((b) => b.text?.includes('M003 assembled export assembly proof.')),
      'bootstrap payload contains expected canonical text',
    );

    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
    child = null;

    // Step 3: CLI export from the same workspace
    const outputPath = path.join(projectRoot, 'assembly-proof.pdf');
    const exportResult = await runExport(projectRoot, outputPath);
    assert(exportResult.exitCode === 0, 'CLI export exits 0');

    const fileInfo = await stat(outputPath);
    assert(fileInfo.size > 0, 'PDF file is non-empty');

    const header = await readFile(outputPath, 'utf8');
    assert(header.startsWith('%PDF'), 'output starts with %PDF');
  } finally {
    if (child) {
      child.kill('SIGTERM');
      await new Promise((resolve) => child.once('exit', resolve));
    }
    await rm(projectRoot, { recursive: true, force: true });
  }

  console.log(
    exitCode === 0 ? '\nM003/S03 assembly verification passed.\n' : '\nM003/S03 assembly verification FAILED.\n',
  );
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
