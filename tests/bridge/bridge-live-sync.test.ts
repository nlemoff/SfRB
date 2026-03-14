import { execFile, spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];

const BRIDGE_UPDATE_EVENT = 'sfrb:bridge-update';
const BRIDGE_ERROR_EVENT = 'sfrb:bridge-error';

async function makeTempProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sfrb-bridge-live-'));
  tempDirs.push(dir);
  return dir;
}

async function writeWorkspaceFiles(projectRoot: string, options: { physics?: 'document' | 'design'; title?: string; blockText?: string }) {
  const physics = options.physics ?? 'document';
  const title = options.title ?? 'Bridge Live Sync Resume';
  const blockText = options.blockText ?? 'Initial bridge text.';
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

async function waitForBridgeReady(projectRoot: string): Promise<{ child: ReturnType<typeof spawn>; url: string; stdout: string[]; stderr: string[] }> {
  const child = spawn(process.execPath, ['dist/cli.js', 'open', '--cwd', projectRoot, '--port', '0', '--no-open'], {
    cwd: process.cwd(),
    env: process.env,
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

async function getViteWebSocket(baseUrl: string): Promise<WebSocket> {
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

async function waitForCustomEvent(socket: WebSocket, eventName: string): Promise<Record<string, unknown>> {
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

async function waitForBootstrapMatch(baseUrl: string, predicate: (payload: Record<string, unknown>) => boolean): Promise<Record<string, unknown>> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    const response = await fetch(new URL('/__sfrb/bootstrap', baseUrl));
    const payload = (await response.json()) as Record<string, unknown>;
    if (predicate(payload)) {
      return payload;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for bootstrap payload to match expected state.');
}

async function closeBridge(child: ReturnType<typeof spawn>): Promise<void> {
  child.kill('SIGTERM');
  await new Promise<void>((resolve) => child.once('exit', () => resolve()));
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

describe('bridge live sync', () => {
  it('serves the browser shell and propagates ready/error transitions through the built open command path', async () => {
    const projectRoot = await makeTempProject();
    await writeWorkspaceFiles(projectRoot, {
      physics: 'document',
      title: 'Live Sync Start',
      blockText: 'Initial bridge payload text.',
    });

    const { child, url, stderr } = await waitForBridgeReady(projectRoot);
    const socket = await getViteWebSocket(url);

    try {
      const pageResponse = await fetch(url);
      const pageHtml = await pageResponse.text();
      expect(pageResponse.status).toBe(200);
      expect(pageHtml).toContain('<div id="root"></div>');
      expect(pageHtml).toContain('/src/main.tsx');

      const initialResponse = await fetch(new URL('/__sfrb/bootstrap', url));
      const initialPayload = (await initialResponse.json()) as Record<string, unknown>;
      expect(initialResponse.status).toBe(200);
      expect(initialPayload).toMatchObject({
        status: 'ready',
        physics: 'document',
        workspaceRoot: projectRoot,
      });
      expect(initialPayload.document).toMatchObject({
        metadata: {
          title: 'Live Sync Start',
        },
      });

      const updateEventPromise = waitForCustomEvent(socket, BRIDGE_UPDATE_EVENT);
      await writeWorkspaceFiles(projectRoot, {
        physics: 'design',
        title: 'Live Sync Updated',
        blockText: 'Updated text from disk.',
      });
      const updateEvent = await updateEventPromise;
      expect(updateEvent).toMatchObject({
        status: 'ready',
        documentPath: path.join(projectRoot, 'resume.sfrb.json'),
        configPath: path.join(projectRoot, 'sfrb.config.json'),
      });
      expect(updateEvent.changedPaths).toEqual(
        expect.arrayContaining([
          path.join(projectRoot, 'resume.sfrb.json'),
          path.join(projectRoot, 'sfrb.config.json'),
        ]),
      );

      const updatedPayload = await waitForBootstrapMatch(url, (payload) => {
        return payload.status === 'ready'
          && (payload.physics === 'design')
          && (payload.document as { metadata?: { title?: string } }).metadata?.title === 'Live Sync Updated';
      });
      expect(updatedPayload).toMatchObject({
        status: 'ready',
        physics: 'design',
      });
      expect(updatedPayload.document).toMatchObject({
        metadata: {
          title: 'Live Sync Updated',
        },
      });

      const errorEventPromise = waitForCustomEvent(socket, BRIDGE_ERROR_EVENT);
      await writeFile(path.join(projectRoot, 'resume.sfrb.json'), '{"version":1,"metadata":', 'utf8');
      const errorEvent = await errorEventPromise;
      expect(errorEvent).toMatchObject({
        status: 'error',
        documentPath: path.join(projectRoot, 'resume.sfrb.json'),
        configPath: path.join(projectRoot, 'sfrb.config.json'),
        name: 'DocumentParseError',
      });
      expect(errorEvent.changedPaths).toEqual(
        expect.arrayContaining([path.join(projectRoot, 'resume.sfrb.json')]),
      );

      const invalidPayload = await waitForBootstrapMatch(url, (payload) => payload.status === 'error');
      expect(invalidPayload).toMatchObject({
        status: 'error',
        workspaceRoot: projectRoot,
        documentPath: path.join(projectRoot, 'resume.sfrb.json'),
        configPath: path.join(projectRoot, 'sfrb.config.json'),
        name: 'DocumentParseError',
      });
      expect(String(invalidPayload.message)).toContain('is not valid JSON');
      expect(stderr.join('')).toBe('');
    } finally {
      socket.close();
      await closeBridge(child);
    }
  });
});
