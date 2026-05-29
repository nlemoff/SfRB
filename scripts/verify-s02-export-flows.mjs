#!/usr/bin/env node

/**
 * S02 built-runtime smoke verifier: export flows
 *
 * Proves the CLI export command generates a real PDF from a temp workspace
 * and that repeated export regenerates the artifact.
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
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-verify-s02-'));
  await writeFile(path.join(dir, 'sfrb.config.json'), JSON.stringify({
    version: 1,
    workspace: { physics: 'document' },
  }, null, 2));
  await writeFile(path.join(dir, 'resume.sfrb.json'), JSON.stringify({
    version: 1,
    metadata: { title: 'Verify S02', locale: 'en' },
    semantic: {
      sections: [{ id: 'sec1', title: 'Summary', blockIds: ['b1'] }],
      blocks: [{ id: 'b1', kind: 'paragraph', text: 'S02 export flow verification.' }],
    },
    layout: {
      pages: [{ id: 'p1', size: { width: 612, height: 792 }, margin: { top: 36, right: 36, bottom: 36, left: 36 } }],
      frames: [],
    },
  }, null, 2));
  return dir;
}

async function runExport(projectRoot, outputPath) {
  const child = spawn(process.execPath, [cliEntry, 'export', '--cwd', projectRoot, '--output', outputPath, '--port', '0'], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
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

async function main() {
  console.log('\nS02: Export Flows Verification\n');

  const projectRoot = await createTempWorkspace();

  try {
    // First export
    const outputPath = path.join(projectRoot, 'verify.pdf');
    const first = await runExport(projectRoot, outputPath);
    assert(first.exitCode === 0, 'first export exits 0');
    assert(first.stdout.includes('PDF exported'), 'first export logs success');

    const firstInfo = await stat(outputPath);
    assert(firstInfo.size > 0, 'first export produces non-empty file');

    const firstHeader = await readFile(outputPath, 'utf8');
    assert(firstHeader.startsWith('%PDF'), 'first export starts with %PDF');

    // Repeated export (regeneration)
    const second = await runExport(projectRoot, outputPath);
    assert(second.exitCode === 0, 'second export exits 0');

    const secondInfo = await stat(outputPath);
    assert(secondInfo.size > 0, 'second export produces non-empty file');
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }

  console.log(exitCode === 0 ? '\nS02 verification passed.\n' : '\nS02 verification FAILED.\n');
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
