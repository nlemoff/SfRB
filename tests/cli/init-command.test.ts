import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runInitCommand } from '../../src/commands/init';
import { getConfigPath, readConfig } from '../../src/config/store';
import { INIT_WIZARD_TEST_INPUT_ENV } from '../../src/prompts/init-wizard';

const tempDirs: string[] = [];

async function makeTempProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-init-'));
  tempDirs.push(dir);
  return dir;
}

function createIo() {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    stdout,
    stderr,
    runtime: {
      log: (message: string) => stdout.push(message),
      error: (message: string) => stderr.push(message),
    },
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('sfrb init command', () => {
  it('runs the wizard harness, persists provider/physics, and redacts the API key in output', async () => {
    const projectRoot = await makeTempProject();
    const io = createIo();
    const apiKey = 'sk-super-secret-openai';

    const exitCode = await runInitCommand(
      { cwd: projectRoot },
      {
        ...io.runtime,
        env: {
          ...process.env,
          [INIT_WIZARD_TEST_INPUT_ENV]: JSON.stringify({
            provider: 'openai',
            apiKey,
            physics: 'document',
            confirm: true,
          }),
        },
      },
    );

    expect(exitCode).toBe(0);
    await expect(readConfig(projectRoot)).resolves.toEqual({
      version: 1,
      ai: {
        provider: 'openai',
        apiKeyEnvVar: 'OPENAI_API_KEY',
      },
      workspace: {
        physics: 'document',
      },
    });

    const gitignore = await readFile(path.join(projectRoot, '.gitignore'), 'utf8');
    expect(gitignore).toContain('sfrb.config.json');

    const stdout = io.stdout.join('\n');
    expect(stdout).toContain('SfRB init complete.');
    expect(stdout).toContain('OPENAI_API_KEY');
    expect(stdout).toContain('sk-');
    expect(stdout).not.toContain(apiKey);
  });

  it('reports cancellation without writing files', async () => {
    const projectRoot = await makeTempProject();
    const io = createIo();

    const exitCode = await runInitCommand(
      { cwd: projectRoot },
      {
        ...io.runtime,
        env: {
          ...process.env,
          [INIT_WIZARD_TEST_INPUT_ENV]: JSON.stringify({
            provider: 'anthropic',
            apiKey: 'sk-ant-secret',
            physics: 'design',
            confirm: false,
          }),
        },
      },
    );

    expect(exitCode).toBe(1);
    expect(io.stderr.join('\n')).toContain('Init cancelled. No files were written.');
    await expect(access(getConfigPath(projectRoot))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('fails clearly when run without a TTY or harness input', async () => {
    const projectRoot = await makeTempProject();
    const io = createIo();

    const exitCode = await runInitCommand(
      { cwd: projectRoot },
      {
        ...io.runtime,
        stdin: { isTTY: false } as NodeJS.ReadStream,
        stdout: { isTTY: false } as NodeJS.WriteStream,
        env: { ...process.env, [INIT_WIZARD_TEST_INPUT_ENV]: undefined },
      },
    );

    expect(exitCode).toBe(1);
    expect(io.stderr.join('\n')).toContain('Interactive init requires a TTY');
  });

  it('surfaces validation errors for unsupported provider and physics flags', async () => {
    const projectRoot = await makeTempProject();
    const io = createIo();

    const exitCode = await runInitCommand(
      {
        cwd: projectRoot,
        provider: 'invalid',
        physics: 'nope',
      },
      io.runtime,
    );

    expect(exitCode).toBe(1);
    const stderr = io.stderr.join('\n');
    expect(stderr).toContain('ai.provider');
    expect(stderr).toContain('workspace.physics');
  });

  it('supports fully non-interactive init when provider, api key, and physics are provided', async () => {
    const projectRoot = await makeTempProject();
    const io = createIo();

    const exitCode = await runInitCommand(
      {
        cwd: projectRoot,
        provider: 'anthropic',
        apiKey: 'sk-ant-key-12345',
        physics: 'design',
      },
      io.runtime,
    );

    expect(exitCode).toBe(0);
    await expect(readConfig(projectRoot)).resolves.toMatchObject({
      ai: {
        provider: 'anthropic',
        apiKeyEnvVar: 'ANTHROPIC_API_KEY',
      },
      workspace: {
        physics: 'design',
      },
    });
    expect(io.stdout.join('\n')).not.toContain('sk-ant-key-12345');
  });
});
