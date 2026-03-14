import { execFile, spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { beforeAll, afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];

async function makeTempProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-open-'));
  tempDirs.push(dir);
  return dir;
}

async function writeWorkspaceFiles(projectRoot: string, physics: 'document' | 'design' = 'document') {
  await writeFile(
    path.join(projectRoot, 'sfrb.config.json'),
    `${JSON.stringify(
      {
        version: 1,
        ai: {
          provider: 'openai',
          apiKeyEnvVar: 'OPENAI_API_KEY',
        },
        workspace: {
          physics,
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  await writeFile(
    path.join(projectRoot, 'resume.sfrb.json'),
    `${JSON.stringify(
      {
        version: 1,
        metadata: {
          title: 'Bridge Test Resume',
          locale: 'en-US',
        },
        semantic: {
          sections: [
            {
              id: 'summary',
              title: 'Summary',
              blockIds: ['summaryBlock'],
            },
          ],
          blocks: [
            {
              id: 'summaryBlock',
              kind: 'paragraph',
              text: 'Testing the bridge runtime.',
            },
          ],
        },
        layout: {
          pages: [
            {
              id: 'pageOne',
              size: { width: 612, height: 792 },
              margin: { top: 36, right: 36, bottom: 36, left: 36 },
            },
          ],
          frames: [],
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

beforeAll(async () => {
  await execFileAsync('npm', ['run', 'build'], {
    cwd: process.cwd(),
    env: process.env,
  });
});

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('sfrb open command', () => {
  it('is discoverable from the main CLI help output', async () => {
    const { stdout } = await execFileAsync(process.execPath, ['dist/cli.js', '--help'], {
      cwd: process.cwd(),
      env: process.env,
    });

    expect(stdout).toContain('open');
    expect(stdout).toContain('Launch the local SfRB web bridge');
  });

  it('starts the bridge against an explicit workspace root and surfaces the resolved local URL', async () => {
    const projectRoot = await makeTempProject();
    await writeWorkspaceFiles(projectRoot, 'document');

    const child = spawn(process.execPath, ['dist/cli.js', 'open', '--cwd', projectRoot, '--port', '0', '--no-open'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    child.stdout.on('data', (chunk) => stdoutChunks.push(chunk.toString()));
    child.stderr.on('data', (chunk) => stderrChunks.push(chunk.toString()));

    const readyOutput = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timed out waiting for sfrb open readiness.\nstdout:\n${stdoutChunks.join('')}\nstderr:\n${stderrChunks.join('')}`));
      }, 15000);

      child.stdout.on('data', () => {
        const combined = stdoutChunks.join('');
        if (
          combined.includes('SfRB bridge ready at http://') &&
          combined.includes(`Workspace root: ${projectRoot}`) &&
          combined.includes('Bridge events: sfrb:bridge-update, sfrb:bridge-error')
        ) {
          clearTimeout(timeout);
          resolve(combined);
        }
      });

      child.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`sfrb open exited before readiness with code ${code}.\nstdout:\n${stdoutChunks.join('')}\nstderr:\n${stderrChunks.join('')}`));
      });
    });

    const urlMatch = readyOutput.match(/SfRB bridge ready at (http:\/\/[^\s]+)/);
    expect(urlMatch?.[1]).toBeTruthy();
    expect(readyOutput).toContain(`Workspace root: ${projectRoot}`);
    expect(readyOutput).toContain('Bridge events: sfrb:bridge-update, sfrb:bridge-error');

    const bootstrapResponse = await fetch(`${urlMatch?.[1]}__sfrb/bootstrap`);
    const payload = (await bootstrapResponse.json()) as Record<string, unknown>;

    expect(bootstrapResponse.status).toBe(200);
    expect(payload).toMatchObject({
      status: 'ready',
      workspaceRoot: projectRoot,
      physics: 'document',
      documentPath: path.join(projectRoot, 'resume.sfrb.json'),
      configPath: path.join(projectRoot, 'sfrb.config.json'),
    });

    child.kill('SIGTERM');
    await new Promise<void>((resolve) => child.once('exit', () => resolve()));
    expect(stderrChunks.join('')).toBe('');
  });

  it('fails with a path-aware workspace validation message when the workspace config is missing', async () => {
    const projectRoot = await makeTempProject();
    await writeFile(
      path.join(projectRoot, 'resume.sfrb.json'),
      `${JSON.stringify(
        {
          version: 1,
          metadata: { title: 'Broken Workspace', locale: 'en-US' },
          semantic: {
            sections: [{ id: 'summary', title: 'Summary', blockIds: ['summaryBlock'] }],
            blocks: [{ id: 'summaryBlock', kind: 'paragraph', text: 'Missing config.' }],
          },
          layout: {
            pages: [{ id: 'pageOne', size: { width: 612, height: 792 }, margin: { top: 36, right: 36, bottom: 36, left: 36 } }],
            frames: [],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const { stdout, stderr } = await execFileAsync(process.execPath, ['dist/cli.js', 'open', '--cwd', projectRoot, '--port', '0', '--no-open'], {
      cwd: process.cwd(),
      env: process.env,
    }).catch((error: { stdout: string; stderr: string; code: number }) => error);

    const output = `${stdout}\n${stderr}`;
    expect(output).toContain(path.join(projectRoot, 'sfrb.config.json'));
    expect(output).toContain(path.join(projectRoot, 'resume.sfrb.json'));
    expect(output).toContain('Cannot validate');
    expect(output).not.toContain('OPENAI_API_KEY');
  });
});
