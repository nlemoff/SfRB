import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];
let buildReady = false;

export const BRIDGE_UPDATE_EVENT = 'sfrb:bridge-update';
export const BRIDGE_ERROR_EVENT = 'sfrb:bridge-error';
export const BRIDGE_BOOTSTRAP_PATH = '/__sfrb/bootstrap';
export const BRIDGE_EDITOR_MUTATION_PATH = '/__sfrb/editor';
export const BRIDGE_LAYOUT_CONSULTANT_PATH = '/__sfrb/consultant';

export type WorkspaceOptions = {
  physics?: 'document' | 'design';
  title?: string;
  blockText?: string;
  provider?: string;
  apiKeyEnvVar?: string;
};

export async function ensureBuilt(): Promise<void> {
  if (buildReady) {
    return;
  }

  await execFileAsync('npm', ['run', 'build'], {
    cwd: process.cwd(),
    env: process.env,
  });
  buildReady = true;
}

export async function makeTempProject(prefix = 'sfrb-bridge-browser-'): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

export async function cleanupTempProjects(): Promise<void> {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
}

export async function writeWorkspaceFiles(projectRoot: string, options: WorkspaceOptions = {}): Promise<void> {
  const physics = options.physics ?? 'document';
  const title = options.title ?? 'Bridge Browser Resume';
  const blockText = options.blockText ?? 'Initial bridge browser text.';
  const provider = options.provider ?? 'openai';
  const apiKeyEnvVar = options.apiKeyEnvVar ?? 'OPENAI_API_KEY';
  const frames = physics === 'design'
    ? [
        {
          id: 'summaryFrame',
          pageId: 'pageOne',
          blockId: 'summaryBlock',
          box: { x: 36, y: 48, width: 540, height: 96 },
          zIndex: 0,
        },
      ]
    : [];

  await writeFile(
    path.join(projectRoot, 'sfrb.config.json'),
    `${JSON.stringify(
      {
        version: 1,
        ai: {
          provider,
          apiKeyEnvVar,
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
          title,
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
              text: blockText,
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
          frames,
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

export async function readWorkspaceDocument(projectRoot: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8')) as Record<string, unknown>;
}

export async function waitForBridgeReady(
  projectRoot: string,
  options: { env?: NodeJS.ProcessEnv } = {},
): Promise<{ child: ChildProcess; url: string; stdout: string[]; stderr: string[] }> {
  const child = spawn(process.execPath, ['dist/cli.js', 'open', '--cwd', projectRoot, '--port', '0', '--no-open'], {
    cwd: process.cwd(),
    env: { ...process.env, ...options.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout: string[] = [];
  const stderr: string[] = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
  child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));

  const readyOutput = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for bridge readiness.\nstdout:\n${stdout.join('')}\nstderr:\n${stderr.join('')}`));
    }, 15000);

    child.stdout.on('data', () => {
      const combined = stdout.join('');
      if (combined.includes('SfRB bridge ready at http://') && combined.includes(`Workspace root: ${projectRoot}`)) {
        clearTimeout(timeout);
        resolve(combined);
      }
    });

    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Bridge exited before readiness with code ${code}.\nstdout:\n${stdout.join('')}\nstderr:\n${stderr.join('')}`));
    });
  });

  const urlMatch = readyOutput.match(/SfRB bridge ready at (http:\/\/[^\s]+)/);
  if (!urlMatch?.[1]) {
    throw new Error(`Could not parse bridge URL from readiness output:\n${readyOutput}`);
  }

  return { child, url: urlMatch[1], stdout, stderr };
}

export async function getViteWebSocket(baseUrl: string): Promise<WebSocket> {
  const clientSource = await fetch(new URL('/@vite/client', baseUrl)).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch /@vite/client: ${response.status}`);
    }
    return response.text();
  });

  const tokenMatch = clientSource.match(/const wsToken = "([^"]+)"/);
  if (!tokenMatch?.[1]) {
    throw new Error('Could not find Vite websocket token in /@vite/client.');
  }

  const base = new URL(baseUrl);
  const protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${base.host}/?token=${tokenMatch[1]}`, 'vite-hmr');

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out opening Vite websocket.')), 10000);
    ws.addEventListener('open', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    ws.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error('Failed to open Vite websocket.'));
    }, { once: true });
  });

  return ws;
}

export async function waitForCustomEvent(socket: WebSocket, eventName: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${eventName}.`));
    }, 15000);

    const onMessage = (message: MessageEvent) => {
      const payload = JSON.parse(String(message.data)) as Record<string, unknown>;
      if (payload.type === 'custom' && payload.event === eventName) {
        clearTimeout(timeout);
        socket.removeEventListener('message', onMessage);
        resolve((payload.data as Record<string, unknown>) ?? {});
      }
    };

    socket.addEventListener('message', onMessage);
  });
}

export async function fetchBootstrap(baseUrl: string): Promise<{ status: number; payload: Record<string, unknown> }> {
  const response = await fetch(new URL(BRIDGE_BOOTSTRAP_PATH, baseUrl));
  return {
    status: response.status,
    payload: (await response.json()) as Record<string, unknown>,
  };
}

export async function waitForBootstrapMatch(
  baseUrl: string,
  predicate: (payload: Record<string, unknown>, status: number) => boolean,
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    const next = await fetchBootstrap(baseUrl);
    if (predicate(next.payload, next.status)) {
      return next;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for bootstrap payload to match expected state.');
}

export async function postEditorMutation(
  baseUrl: string,
  document: Record<string, unknown>,
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const response = await fetch(new URL(BRIDGE_EDITOR_MUTATION_PATH, baseUrl), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ document }),
  });

  return {
    status: response.status,
    payload: (await response.json()) as Record<string, unknown>,
  };
}

export async function postConsultantRequest(
  baseUrl: string,
  request: Record<string, unknown>,
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const response = await fetch(new URL(BRIDGE_LAYOUT_CONSULTANT_PATH, baseUrl), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  return {
    status: response.status,
    payload: (await response.json()) as Record<string, unknown>,
  };
}

export async function closeBridge(child: ChildProcess): Promise<void> {
  child.kill('SIGTERM');
  await new Promise<void>((resolve) => child.once('exit', () => resolve()));
}
