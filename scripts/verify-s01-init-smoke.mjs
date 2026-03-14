#!/usr/bin/env node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';

const execFile = promisify(execFileCallback);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

async function main() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'sfrb-smoke-'));
  const apiKey = 'sk-smoke-secret-001';

  try {
    await execFile('npm', ['run', 'build'], { cwd: repoRoot });

    const { stdout, stderr } = await execFile(
      process.execPath,
      [path.join(repoRoot, 'dist/cli.js'), 'init', '--cwd', workspace],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          SFRB_INIT_TEST_INPUT: JSON.stringify({
            provider: 'anthropic',
            apiKey,
            physics: 'design',
            confirm: true,
          }),
        },
      },
    );

    if (stderr.trim().length > 0) {
      throw new Error(`Expected empty stderr from smoke init, received:\n${stderr}`);
    }

    if (stdout.includes(apiKey)) {
      throw new Error('Smoke init echoed the raw API key.');
    }

    const configPath = path.join(workspace, 'sfrb.config.json');
    const gitignorePath = path.join(workspace, '.gitignore');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    const gitignore = await readFile(gitignorePath, 'utf8');

    if (config.ai?.provider !== 'anthropic') {
      throw new Error(`Expected provider anthropic, received ${config.ai?.provider}`);
    }

    if (config.ai?.apiKeyEnvVar !== 'ANTHROPIC_API_KEY') {
      throw new Error(`Expected ANTHROPIC_API_KEY, received ${config.ai?.apiKeyEnvVar}`);
    }

    if (config.workspace?.physics !== 'design') {
      throw new Error(`Expected design physics, received ${config.workspace?.physics}`);
    }

    if (!gitignore.includes('sfrb.config.json')) {
      throw new Error('.gitignore does not protect sfrb.config.json');
    }

    console.log('S01 init smoke check passed.');
    console.log(`Workspace: ${workspace}`);
    console.log(`Config: ${configPath}`);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

await main();
