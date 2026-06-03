import { mkdtemp, rm, access, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const tempRoot = await mkdtemp(path.join(tmpdir(), 'sfrb-package-smoke-'));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, npm_config_loglevel: 'error', ...options.env },
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `$ ${command} ${args.join(' ')}`,
        `exit ${result.status}`,
        result.stdout?.trim(),
        result.stderr?.trim(),
        result.error?.message,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  return result;
}

try {
  run('npm', ['run', 'build']);

  const pack = run('npm', ['pack', '--json', '--pack-destination', tempRoot]);
  const packResult = JSON.parse(pack.stdout)[0];
  const tarball = path.join(tempRoot, packResult.filename);

  const installRoot = path.join(tempRoot, 'install');
  run('npm', ['init', '-y'], { cwd: tempRoot });
  run('npm', ['install', '--prefix', installRoot, tarball]);

  const sfrb = path.join(installRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'sfrb.cmd' : 'sfrb');
  const help = run(sfrb, ['--help'], { cwd: installRoot });
  if (!help.stdout.includes('Straightforward Resume Builder CLI')) {
    throw new Error('Installed sfrb --help did not print the expected CLI description.');
  }

  const workspace = path.join(tempRoot, 'workspace');
  await rm(workspace, { recursive: true, force: true });
  await mkdir(workspace, { recursive: true });
  run(sfrb, ['init', '--starter', 'template', '--physics', 'document', '--skip-ai'], { cwd: workspace });
  await access(path.join(workspace, 'resume.sfrb.json'));
  await access(path.join(workspace, 'sfrb.config.json'));

  const templates = run(sfrb, ['template', 'list'], { cwd: workspace });
  for (const template of ['default', 'classic', 'modern']) {
    if (!templates.stdout.includes(template)) {
      throw new Error(`Installed sfrb template list did not include ${template}.`);
    }
  }

  const playwright = path.join(
    installRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'playwright.cmd' : 'playwright',
  );
  run(playwright, ['install', 'chromium'], { cwd: installRoot });

  run(sfrb, ['export', '--cwd', workspace, '--output', path.join(workspace, 'resume.pdf')]);
  await access(path.join(workspace, 'resume.pdf'));

  console.log(`Package install smoke passed: ${packResult.filename}`);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
