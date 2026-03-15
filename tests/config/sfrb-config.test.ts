import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { getConfigPath, readConfig, writeConfig } from '../../src/config/store';

const tempDirs: string[] = [];

async function makeTempProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-config-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('sfrb config contract', () => {
  it('writes and reads a valid AI-configured config with stable defaults', async () => {
    const projectRoot = await makeTempProject();

    const written = await writeConfig(
      {
        ai: {
          provider: 'openai',
          apiKeyEnvVar: 'OPENAI_API_KEY',
        },
        workspace: {},
      },
      projectRoot,
    );

    expect(written).toEqual({
      version: 1,
      ai: {
        provider: 'openai',
        apiKeyEnvVar: 'OPENAI_API_KEY',
      },
      workspace: {
        physics: 'document',
      },
    });

    const configPath = getConfigPath(projectRoot);
    const persisted = await readFile(configPath, 'utf8');
    expect(persisted).toContain('"provider": "openai"');
    expect(persisted).toContain('"physics": "document"');

    await expect(readConfig(projectRoot)).resolves.toEqual(written);
  });

  it('writes and reads a valid editor-only config without AI settings', async () => {
    const projectRoot = await makeTempProject();

    const written = await writeConfig(
      {
        workspace: {
          physics: 'design',
        },
      },
      projectRoot,
    );

    expect(written).toEqual({
      version: 1,
      workspace: {
        physics: 'design',
      },
    });

    const configPath = getConfigPath(projectRoot);
    const persisted = await readFile(configPath, 'utf8');
    expect(persisted).not.toContain('"ai"');
    expect(persisted).toContain('"physics": "design"');

    await expect(readConfig(projectRoot)).resolves.toEqual(written);
  });

  it('rejects an unsupported provider through the real file boundary', async () => {
    const projectRoot = await makeTempProject();
    const configPath = getConfigPath(projectRoot);

    await writeFile(
      configPath,
      JSON.stringify(
        {
          version: 1,
          ai: {
            provider: 'invalid-provider',
            apiKeyEnvVar: 'OPENAI_API_KEY',
          },
          workspace: {
            physics: 'document',
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    await expect(readConfig(projectRoot)).rejects.toThrowError(/ai.provider/);
    await expect(readConfig(projectRoot)).rejects.toThrowError(/expected one of/);
  });

  it('rejects an unsupported physics mode through the real file boundary', async () => {
    const projectRoot = await makeTempProject();
    const configPath = getConfigPath(projectRoot);

    await writeFile(
      configPath,
      JSON.stringify(
        {
          version: 1,
          ai: {
            provider: 'anthropic',
            apiKeyEnvVar: 'ANTHROPIC_API_KEY',
          },
          workspace: {
            physics: 'floaty',
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    await expect(readConfig(projectRoot)).rejects.toThrowError(/workspace.physics/);
  });
});
