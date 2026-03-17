import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { createStarterDocument } from '../../src/document/starters';

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
  starterKind?: 'template' | 'blank';
  skipAi?: boolean;
};

export type BridgeBrowserPage = {
  goto(url: string, options?: { waitUntil?: 'networkidle' | 'load' | 'domcontentloaded' }): Promise<unknown>;
  click(selector: string): Promise<unknown>;
  fill(selector: string, value: string): Promise<unknown>;
  waitForSelector(selector: string): Promise<unknown>;
  waitForFunction<R = unknown, Arg = unknown>(pageFunction: (arg: Arg) => R | Promise<R>, arg?: Arg): Promise<unknown>;
  textContent(selector: string): Promise<string | null>;
  getAttribute(selector: string, name: string): Promise<string | null>;
  locator(selector: string): {
    count(): Promise<number>;
    textContent(): Promise<string | null>;
    getAttribute(name: string): Promise<string | null>;
    evaluate<R>(pageFunction: (element: HTMLElement) => R | Promise<R>): Promise<R>;
  };
};

export type ConsultantDiagnostics = {
  consultantState: string | null;
  consultantCode: string | null;
  overflowStatus: string | null;
  overflowPx: number | null;
  previewVisible: boolean;
  frameId: string | null;
  rationale: string | null;
  errorText: string | null;
  note: string | null;
  payloadPreview: string | null;
  ghostCount: number;
  ghostFrameHeight: string | null;
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
  const blockText = options.blockText;
  const provider = options.provider ?? 'openai';
  const apiKeyEnvVar = options.apiKeyEnvVar ?? 'OPENAI_API_KEY';
  const starterKind = options.starterKind ?? 'blank';
  const skipAi = options.skipAi ?? false;

  await writeFile(
    path.join(projectRoot, 'sfrb.config.json'),
    `${JSON.stringify(
      {
        version: 1,
        ...(skipAi
          ? {}
          : {
              ai: {
                provider,
                apiKeyEnvVar,
              },
            }),
        workspace: {
          physics,
        },
      },
      null,
      2,
    )}
`,
    'utf8',
  );

  const document = createStarterDocument(starterKind, physics);
  document.metadata.title = title;

  const summaryBlock = document.semantic.blocks.find((block) => block.id === 'summaryBlock');
  if (summaryBlock && typeof blockText === 'string') {
    summaryBlock.text = blockText;
  }

  await writeFile(
    path.join(projectRoot, 'resume.sfrb.json'),
    `${JSON.stringify(document, null, 2)}
`,
    'utf8',
  );
}

export async function readWorkspaceDocument(projectRoot: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8')) as Record<string, unknown>;
}

export async function readWorkspaceDocumentRaw(projectRoot: string): Promise<string> {
  return readFile(path.join(projectRoot, 'resume.sfrb.json'), 'utf8');
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

export async function waitForEditorIdle(page: BridgeBrowserPage): Promise<void> {
  await page.waitForFunction(() => {
    return document.querySelector('#editor-save-status')?.getAttribute('data-save-state') === 'idle';
  });
}

export type FirstRunGuidanceDiagnostics = {
  starterKind: string | null;
  starterId: string | null;
  starterGuidance: string | null;
  aiStatus: string | null;
  aiNote: string | null;
  tileAvailability: string | null;
  consultantState: string | null;
  consultantCode: string | null;
};

export async function openWorkspace(page: BridgeBrowserPage, url: string, physics: 'document' | 'design'): Promise<void> {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector(`#editor-canvas[data-physics-mode="${physics}"]`);
  await page.waitForSelector('[data-testid="first-run-guidance"]');
}

export async function readFirstRunGuidance(page: BridgeBrowserPage): Promise<FirstRunGuidanceDiagnostics> {
  return {
    starterKind: await page.textContent('#starter-kind'),
    starterId: await page.textContent('#starter-id'),
    starterGuidance: await page.textContent('#starter-guidance'),
    aiStatus: await page.textContent('#workspace-ai-status'),
    aiNote: await page.textContent('#workspace-ai-note'),
    tileAvailability: await page.textContent('#tile-lens-availability'),
    consultantState: await page.getAttribute('#consultant-status', 'data-consultant-state'),
    consultantCode: await page.getAttribute('#consultant-panel', 'data-consultant-code'),
  };
}

export async function openDesignWorkspace(page: BridgeBrowserPage, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('#editor-canvas[data-physics-mode="design"]');
}

export async function selectConsultantFrame(page: BridgeBrowserPage, frameId = 'summaryFrame'): Promise<void> {
  await page.click(`[data-testid="editor-frame-${frameId}"]`);
}

export async function waitForOverflowStatus(page: BridgeBrowserPage, expected: 'overflow' | 'clear' | 'settling' | 'idle'): Promise<void> {
  await page.waitForFunction((expectedStatus: string) => {
    return document.querySelector('#consultant-overflow-status')?.getAttribute('data-overflow-status') === expectedStatus;
  }, expected);
}

export async function waitForConsultantState(page: BridgeBrowserPage, expected: string): Promise<void> {
  await page.waitForFunction((expectedState: string) => {
    return document.querySelector('#consultant-status')?.getAttribute('data-consultant-state') === expectedState;
  }, expected);
}

export async function waitForPreviewVisibility(page: BridgeBrowserPage, visible: boolean): Promise<void> {
  await page.waitForFunction((expectedVisibility: string) => {
    return document.querySelector('#consultant-preview-state')?.getAttribute('data-preview-visible') === expectedVisibility;
  }, String(visible));
}

export async function waitForBridgeUpdateSignal(page: BridgeBrowserPage): Promise<void> {
  await page.waitForFunction(() => {
    const signal = document.querySelector('#bridge-last-signal')?.textContent ?? '';
    return signal.includes('sfrb:bridge-update') && signal.includes('resume.sfrb.json');
  });
}

export async function requestConsultantPreview(page: BridgeBrowserPage): Promise<void> {
  await page.click('#consultant-request');
}

export async function rejectConsultantPreview(page: BridgeBrowserPage): Promise<void> {
  await page.click('#consultant-reject');
}

export async function acceptConsultantPreview(page: BridgeBrowserPage): Promise<void> {
  await page.click('#consultant-accept');
}

export async function readConsultantDiagnostics(page: BridgeBrowserPage, frameId = 'summaryFrame'): Promise<ConsultantDiagnostics> {
  const overflowPx = await page.getAttribute('#consultant-measurements', 'data-overflow-px');
  const errorNode = page.locator('#consultant-error');
  const ghost = page.locator(`[data-testid="consultant-ghost-preview-${frameId}"]`);
  const ghostCount = await ghost.count();

  return {
    consultantState: await page.getAttribute('#consultant-status', 'data-consultant-state'),
    consultantCode: await page.getAttribute('#consultant-panel', 'data-consultant-code'),
    overflowStatus: await page.getAttribute('#consultant-overflow-status', 'data-overflow-status'),
    overflowPx: overflowPx === null || overflowPx === '' ? null : Number(overflowPx),
    previewVisible: (await page.getAttribute('#consultant-preview-state', 'data-preview-visible')) === 'true',
    frameId: await page.getAttribute('#consultant-frame-id', 'data-frame-id'),
    rationale: await page.textContent('#consultant-rationale'),
    errorText: await errorNode.evaluate((element) => {
      if (element.hidden) {
        return null;
      }
      return element.textContent;
    }),
    note: await page.textContent('#consultant-state-note'),
    payloadPreview: await page.locator('#bridge-payload-preview').textContent(),
    ghostCount,
    ghostFrameHeight: ghostCount > 0 ? await ghost.getAttribute('data-frame-height') : null,
  };
}

export async function createOpenAiStubServer(
  handler: (request: http.IncomingMessage, response: http.ServerResponse<http.IncomingMessage>) => void,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = http.createServer((request, response) => {
    if (request.method !== 'POST' || request.url !== '/chat/completions') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    handler(request, response);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve stub provider address.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

export async function closeBridge(child: ChildProcess): Promise<void> {
  child.kill('SIGTERM');
  await new Promise<void>((resolve) => child.once('exit', () => resolve()));
}
