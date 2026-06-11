import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { ensureBuilt } from '../utils/bridge-browser';

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

describe('CLI version flag', () => {
  beforeAll(async () => {
    await ensureBuilt();
  });

  it('reports the package.json version so the built CLI can never drift', async () => {
    const packageJsonRaw = await readFile(path.resolve(process.cwd(), 'package.json'), 'utf8');
    const packageJson = JSON.parse(packageJsonRaw) as { version: string };

    const result = await runCli(['--version']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(packageJson.version);
    expect(result.stderr).toBe('');
  });
});
