import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  cleanupTempProjects,
  ensureBuilt,
  makeTempProject,
  readWorkspaceDocument,
  writeWorkspaceFiles,
} from '../utils/bridge-browser';

type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

async function runCli(args: string[]): Promise<CliResult> {
  const child = spawn(process.execPath, ['dist/cli.js', ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout: string[] = [];
  const stderr: string[] = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
  child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));

  const exitCode = await new Promise<number>((resolve) => {
    child.once('exit', (code) => resolve(code ?? 1));
  });

  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') };
}

describe('CLI template command', () => {
  beforeAll(async () => {
    await ensureBuilt();
  });

  afterEach(async () => {
    await cleanupTempProjects();
  });

  it('lists every registered template id with version', async () => {
    const result = await runCli(['template', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/^default\t1$/m);
    expect(result.stdout).toMatch(/^classic\t1$/m);
    expect(result.stdout).toMatch(/^modern\t1$/m);
  });

  it('prints registered template metadata as JSON via show', async () => {
    const result = await runCli(['template', 'show', 'classic']);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual({ id: 'classic', version: '1' });
  });

  it('rejects show for an unknown template id with non-zero exit', async () => {
    const result = await runCli(['template', 'show', 'definitely-not-a-template']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unknown template id');
  });

  it('persists metadata.template through the canonical write path on apply', async () => {
    const projectRoot = await makeTempProject('sfrb-template-apply-');
    await writeWorkspaceFiles(projectRoot, { physics: 'document', blockText: 'Apply persists.' });

    const result = await runCli(['template', 'apply', 'classic', '--cwd', projectRoot]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Applied template classic');

    const persisted = await readWorkspaceDocument(projectRoot);
    expect(persisted.metadata).toMatchObject({
      template: { id: 'classic', version: '1' },
    });
  });

  it('rejects apply for an unknown template id without modifying the workspace', async () => {
    const projectRoot = await makeTempProject('sfrb-template-apply-bad-');
    await writeWorkspaceFiles(projectRoot, { physics: 'document', blockText: 'Original.' });

    const before = await readWorkspaceDocument(projectRoot);
    const result = await runCli(['template', 'apply', 'fictional', '--cwd', projectRoot]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unknown template id');

    const after = await readWorkspaceDocument(projectRoot);
    expect(after).toEqual(before);
  });

  it('fails apply cleanly when the workspace config is missing', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-template-apply-noconfig-'));
    try {
      const result = await runCli(['template', 'apply', 'classic', '--cwd', tempDir]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/config|workspace|enoent/i);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('fails apply cleanly when the workspace document is missing', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-template-apply-no-doc-'));
    try {
      await writeFile(
        path.join(tempDir, 'sfrb.config.json'),
        JSON.stringify({ version: 1, workspace: { physics: 'document' } }, null, 2),
        'utf8',
      );

      const result = await runCli(['template', 'apply', 'classic', '--cwd', tempDir]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/document|enoent/i);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
}, { timeout: 60000 });
