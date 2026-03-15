import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runInitCommand } from '../../src/commands/init';
import { getConfigPath, readConfig } from '../../src/config/store';
import { STARTER_IDS } from '../../src/document/starters';
import { getDocumentPath, readDocument, readWorkspaceDocument } from '../../src/document/store';
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

function parseSummary(stdout: string[]): Record<string, unknown> {
  const summaryText = stdout.slice(1).join('\n');
  return JSON.parse(summaryText) as Record<string, unknown>;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('sfrb init command', () => {
  it('runs the wizard harness for an AI-skipped template workspace and materializes an editable starter document', async () => {
    const projectRoot = await makeTempProject();
    const io = createIo();

    const exitCode = await runInitCommand(
      { cwd: projectRoot },
      {
        ...io.runtime,
        env: {
          ...process.env,
          [INIT_WIZARD_TEST_INPUT_ENV]: JSON.stringify({
            starter: 'template',
            physics: 'document',
            skipAi: true,
            confirm: true,
          }),
        },
      },
    );

    expect(exitCode).toBe(0);
    await expect(readConfig(projectRoot)).resolves.toEqual({
      version: 1,
      workspace: {
        physics: 'document',
      },
    });

    const document = await readDocument(projectRoot);
    const workspaceDocument = await readWorkspaceDocument(projectRoot);
    expect(document.metadata.starter).toEqual({
      id: STARTER_IDS.template,
      kind: 'template',
    });
    expect(workspaceDocument.metadata.starter).toEqual({
      id: STARTER_IDS.template,
      kind: 'template',
    });
    expect(workspaceDocument.layout.frames).toEqual([]);

    const gitignore = await readFile(path.join(projectRoot, '.gitignore'), 'utf8');
    expect(gitignore).toContain('sfrb.config.json');

    const documentPath = getDocumentPath(projectRoot);
    const persistedDocument = await readFile(documentPath, 'utf8');
    expect(persistedDocument).toContain(`"id": "${STARTER_IDS.template}"`);

    const stdout = io.stdout.join('\n');
    expect(stdout).toContain('SfRB init complete.');
    expect(stdout).toContain('"status": "skipped"');
    expect(stdout).toContain('"kind": "template"');
    expect(stdout).toContain('resume.sfrb.json');
  });

  it('runs the wizard harness for an AI-configured blank workspace and redacts the API key in output', async () => {
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
            starter: 'blank',
            provider: 'openai',
            apiKey,
            physics: 'design',
            skipAi: false,
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
        physics: 'design',
      },
    });

    const workspaceDocument = await readWorkspaceDocument(projectRoot);
    expect(workspaceDocument.metadata.starter).toEqual({
      id: STARTER_IDS.blank,
      kind: 'blank',
    });
    expect(workspaceDocument.layout.frames).toHaveLength(workspaceDocument.semantic.blocks.length);

    const stdout = io.stdout.join('\n');
    expect(stdout).toContain('OPENAI_API_KEY');
    expect(stdout).toContain('"status": "configured"');
    expect(stdout).toContain('"kind": "blank"');
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
            starter: 'template',
            provider: 'anthropic',
            apiKey: 'sk-ant-secret',
            physics: 'design',
            skipAi: false,
            confirm: false,
          }),
        },
      },
    );

    expect(exitCode).toBe(1);
    expect(io.stderr.join('\n')).toContain('Init cancelled. No files were written.');
    await expect(access(getConfigPath(projectRoot))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(getDocumentPath(projectRoot))).rejects.toMatchObject({ code: 'ENOENT' });
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
    expect(io.stderr.join('\n')).toContain('--starter');
    expect(io.stderr.join('\n')).toContain('--skip-ai');
  });

  it('surfaces validation errors for unsupported provider and physics flags', async () => {
    const projectRoot = await makeTempProject();
    const io = createIo();

    const exitCode = await runInitCommand(
      {
        cwd: projectRoot,
        starter: 'template',
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

  it('supports fully non-interactive AI-skipped init for a blank starter', async () => {
    const projectRoot = await makeTempProject();
    const io = createIo();

    const exitCode = await runInitCommand(
      {
        cwd: projectRoot,
        starter: 'blank',
        skipAi: true,
        physics: 'document',
      },
      io.runtime,
    );

    expect(exitCode).toBe(0);
    await expect(readConfig(projectRoot)).resolves.toEqual({
      version: 1,
      workspace: {
        physics: 'document',
      },
    });

    const document = await readWorkspaceDocument(projectRoot);
    expect(document.metadata.starter).toEqual({
      id: STARTER_IDS.blank,
      kind: 'blank',
    });
    expect(document.layout.frames).toEqual([]);

    const summary = parseSummary(io.stdout);
    expect(summary).toMatchObject({
      workspace: {
        physics: 'document',
        starter: {
          kind: 'blank',
          id: STARTER_IDS.blank,
        },
      },
      ai: {
        status: 'skipped',
      },
    });
  });

  it('supports fully non-interactive configured init and keeps redaction intact', async () => {
    const projectRoot = await makeTempProject();
    const io = createIo();

    const exitCode = await runInitCommand(
      {
        cwd: projectRoot,
        starter: 'template',
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

    const document = await readWorkspaceDocument(projectRoot);
    expect(document.metadata.starter).toEqual({
      id: STARTER_IDS.template,
      kind: 'template',
    });
    expect(document.layout.frames).toHaveLength(document.semantic.blocks.length);

    const stdout = io.stdout.join('\n');
    expect(stdout).not.toContain('sk-ant-key-12345');
    expect(stdout).toContain('"status": "configured"');
    expect(stdout).toContain('"kind": "template"');
  });

  it('rejects conflicting non-interactive AI flags before writing files', async () => {
    const projectRoot = await makeTempProject();
    const io = createIo();

    const exitCode = await runInitCommand(
      {
        cwd: projectRoot,
        starter: 'template',
        physics: 'document',
        skipAi: true,
        provider: 'openai',
      },
      io.runtime,
    );

    expect(exitCode).toBe(1);
    expect(io.stderr.join('\n')).toContain('Cannot combine --skip-ai with --provider or --api-key');
    await expect(access(getConfigPath(projectRoot))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(getDocumentPath(projectRoot))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
