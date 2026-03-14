import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const BRIDGE_UPDATE_EVENT = 'sfrb:bridge-update';
const BRIDGE_ERROR_EVENT = 'sfrb:bridge-error';

async function writeWorkspaceFiles(projectRoot, { physics = 'document', title = 'Smoke Resume', blockText = 'Smoke test content.' } = {}) {
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

async function waitForBridgeReady(projectRoot) {
  const child = spawn(process.execPath, ['dist/cli.js', 'open', '--cwd', projectRoot, '--port', '0', '--no-open'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout = [];
  const stderr = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
  child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));

  const readyOutput = await new Promise((resolve, reject) => {
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

async function getViteWebSocket(baseUrl) {
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
  const socket = new WebSocket(`${protocol}//${base.host}/?token=${tokenMatch[1]}`, 'vite-hmr');

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out opening Vite websocket.')), 10000);
    socket.addEventListener('open', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    socket.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error('Failed to open Vite websocket.'));
    }, { once: true });
  });

  return socket;
}

async function waitForCustomEvent(socket, eventName) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${eventName}.`)), 15000);
    const onMessage = (message) => {
      const payload = JSON.parse(String(message.data));
      if (payload.type === 'custom' && payload.event === eventName) {
        clearTimeout(timeout);
        socket.removeEventListener('message', onMessage);
        resolve(payload.data ?? {});
      }
    };

    socket.addEventListener('message', onMessage);
  });
}

async function waitForBootstrapMatch(baseUrl, predicate) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    const response = await fetch(new URL('/__sfrb/bootstrap', baseUrl));
    const payload = await response.json();
    if (predicate(payload, response.status)) {
      return { payload, status: response.status };
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for bootstrap payload transition.');
}

async function closeBridge(child) {
  child.kill('SIGTERM');
  await new Promise((resolve) => child.once('exit', () => resolve()));
}

const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'sfrb-s03-smoke-'));
let child;
let socket;

try {
  await writeWorkspaceFiles(projectRoot, {
    physics: 'document',
    title: 'Smoke Start',
    blockText: 'Initial smoke payload.',
  });

  ({ child, url: globalThis.__bridgeUrl, stderr: globalThis.__bridgeStderr } = await waitForBridgeReady(projectRoot));
  socket = await getViteWebSocket(globalThis.__bridgeUrl);

  const initial = await fetch(new URL('/__sfrb/bootstrap', globalThis.__bridgeUrl)).then((response) => response.json());
  if (initial.status !== 'ready' || initial.physics !== 'document') {
    throw new Error(`Initial bootstrap payload was not ready/document. Received: ${JSON.stringify(initial, null, 2)}`);
  }
  console.log(`Initial payload OK: ${initial.document.metadata.title} (${initial.physics})`);

  const updateEventPromise = waitForCustomEvent(socket, BRIDGE_UPDATE_EVENT);
  await writeWorkspaceFiles(projectRoot, {
    physics: 'design',
    title: 'Smoke Updated',
    blockText: 'Updated from disk without restart.',
  });
  const updateEvent = await updateEventPromise;
  const updated = await waitForBootstrapMatch(globalThis.__bridgeUrl, (payload) => payload.status === 'ready' && payload.physics === 'design');
  console.log(`Update event OK: ${(updateEvent.changedPaths ?? [updateEvent.changedPath]).join(', ')}`);
  console.log(`Updated payload OK: ${updated.payload.document.metadata.title} (${updated.payload.physics})`);

  const errorEventPromise = waitForCustomEvent(socket, BRIDGE_ERROR_EVENT);
  await writeFile(path.join(projectRoot, 'resume.sfrb.json'), '{"version":1,"metadata":', 'utf8');
  const errorEvent = await errorEventPromise;
  const invalid = await waitForBootstrapMatch(globalThis.__bridgeUrl, (payload, status) => payload.status === 'error' && status === 409);
  console.log(`Error event OK: ${errorEvent.name} from ${(errorEvent.changedPaths ?? [errorEvent.changedPath]).join(', ')}`);
  console.log(`Invalid payload OK: HTTP ${invalid.status} ${invalid.payload.name}`);

  const stderrText = globalThis.__bridgeStderr.join('');
  if (stderrText.length > 0) {
    throw new Error(`Bridge stderr was not empty:\n${stderrText}`);
  }

  console.log('S03 open smoke verification passed.');
} finally {
  socket?.close();
  if (child) {
    await closeBridge(child);
  }
  await rm(projectRoot, { recursive: true, force: true });
}
