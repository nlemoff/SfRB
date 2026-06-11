#!/usr/bin/env node
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'dist/cli.js');

async function runCli(args, options = {}) {
  try {
    const { stdout, stderr } = await execFile(process.execPath, [cliPath, ...args], {
      cwd: repoRoot,
      env: process.env,
      ...options,
    });
    return { exitCode: 0, stdout, stderr };
  } catch (error) {
    return { exitCode: error.code ?? 1, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

async function main() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'sfrb-edit-smoke-'));

  try {
    await execFile('npm', ['run', 'build'], { cwd: repoRoot });

    const init = await runCli(['init', '--cwd', workspace, '--starter', 'blank', '--physics', 'design', '--skip-ai']);
    if (init.exitCode !== 0) {
      throw new Error(`Smoke init failed:\n${init.stderr}`);
    }

    // 1. A structured text edit persists through the canonical write path.
    const textEdit = await runCli([
      'edit',
      '--cwd',
      workspace,
      '--op',
      JSON.stringify({ op: 'set-block-text', blockId: 'summaryBlock', text: 'Edited by the CLI smoke.' }),
    ]);
    if (textEdit.exitCode !== 0) {
      throw new Error(`Expected text edit to succeed:\n${textEdit.stderr}`);
    }

    const afterText = JSON.parse(await readFile(path.join(workspace, 'resume.sfrb.json'), 'utf8'));
    const summaryBlock = afterText.semantic.blocks.find((block) => block.id === 'summaryBlock');
    if (summaryBlock?.text !== 'Edited by the CLI smoke.') {
      throw new Error(`Expected persisted block text, received: ${summaryBlock?.text}`);
    }

    // 2. A structured frame edit persists too.
    const frameEdit = await runCli([
      'edit',
      '--cwd',
      workspace,
      '--json',
      '--op',
      JSON.stringify({ op: 'set-frame-box', frameId: 'summaryFrame', box: { x: 40, y: 60, width: 520, height: 120 } }),
    ]);
    if (frameEdit.exitCode !== 0) {
      throw new Error(`Expected frame edit to succeed:\n${frameEdit.stderr}`);
    }
    const frameEnvelope = JSON.parse(frameEdit.stdout);
    if (frameEnvelope.writeOutcome !== 'written' || frameEnvelope.op !== 'set-frame-box') {
      throw new Error(`Unexpected frame edit envelope: ${frameEdit.stdout}`);
    }

    // 3. An invalid operation is a visible no-write: non-zero exit, byte-stable disk.
    const beforeRaw = await readFile(path.join(workspace, 'resume.sfrb.json'), 'utf8');
    const invalidEdit = await runCli([
      'edit',
      '--cwd',
      workspace,
      '--json',
      '--op',
      JSON.stringify({ op: 'set-block-text', blockId: 'ghostBlock', text: 'Never lands.' }),
    ]);
    if (invalidEdit.exitCode === 0) {
      throw new Error('Expected invalid edit to exit non-zero.');
    }
    const invalidEnvelope = JSON.parse(invalidEdit.stdout);
    if (invalidEnvelope.code !== 'operation_invalid' || invalidEnvelope.writeOutcome !== 'no_write') {
      throw new Error(`Unexpected invalid edit envelope: ${invalidEdit.stdout}`);
    }
    const afterRaw = await readFile(path.join(workspace, 'resume.sfrb.json'), 'utf8');
    if (afterRaw !== beforeRaw) {
      throw new Error('Invalid edit must leave the canonical document byte-stable.');
    }

    // 4. --list-ops names the full operation vocabulary.
    const listOps = await runCli(['edit', '--list-ops']);
    if (listOps.exitCode !== 0 || !listOps.stdout.includes('reconcile-freeform')) {
      throw new Error(`Expected --list-ops to include the operation vocabulary:\n${listOps.stdout}`);
    }

    console.log('CLI edit smoke verification passed.');
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
