import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { readConfig, getConfigPath } = require('../config/store.js');
const { readWorkspaceDocument, getDocumentPath } = require('../document/store.js');
const {
  MissingWorkspaceConfigError,
  DocumentPhysicsValidationError,
} = require('../document/validation.js');
const { ConfigParseError, ConfigValidationError } = require('../config/store.js');
const { DocumentParseError, DocumentValidationError } = require('../document/store.js');

const BRIDGE_BOOTSTRAP_PATH = '/__sfrb/bootstrap';
const BRIDGE_UPDATE_EVENT = 'sfrb:bridge-update';
const BRIDGE_ERROR_EVENT = 'sfrb:bridge-error';
const runtimeDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(runtimeDirectory, '..', '..', 'web');

function parseArgs(argv) {
  const options = {
    cwd: process.cwd(),
    port: 4173,
    open: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--cwd') {
      options.cwd = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (value === '--port') {
      options.port = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (value === '--no-open') {
      options.open = false;
      continue;
    }

    if (value === '--open') {
      options.open = true;
    }
  }

  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    throw new Error(`Invalid --port value "${String(options.port)}". Expected an integer between 0 and 65535.`);
  }

  return options;
}

function sendProcessMessage(message) {
  if (typeof process.send === 'function') {
    process.send(message);
  }
}

function isWorkspaceValidationError(error) {
  return (
    error instanceof MissingWorkspaceConfigError ||
    error instanceof DocumentPhysicsValidationError ||
    error instanceof ConfigParseError ||
    error instanceof ConfigValidationError ||
    error instanceof DocumentParseError ||
    error instanceof DocumentValidationError
  );
}

function toBridgeError(error, workspaceRoot) {
  if (isWorkspaceValidationError(error)) {
    return {
      status: 'error',
      workspaceRoot,
      message: error.message,
      name: error.name,
      documentPath: error.documentPath ?? getDocumentPath(workspaceRoot),
      configPath: error.configPath ?? getConfigPath(workspaceRoot),
    };
  }

  return {
    status: 'error',
    workspaceRoot,
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : 'Error',
    documentPath: getDocumentPath(workspaceRoot),
    configPath: getConfigPath(workspaceRoot),
  };
}

async function readBridgePayload(workspaceRoot) {
  const document = await readWorkspaceDocument(workspaceRoot);
  const config = await readConfig(workspaceRoot);

  return {
    status: 'ready',
    workspaceRoot,
    documentPath: getDocumentPath(workspaceRoot),
    configPath: getConfigPath(workspaceRoot),
    physics: config.workspace.physics,
    document,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let currentState;

  try {
    currentState = await readBridgePayload(options.cwd);
  } catch (error) {
    const bridgeError = toBridgeError(error, options.cwd);
    sendProcessMessage({
      type: 'bridge-error',
      workspaceRoot: bridgeError.workspaceRoot,
      message: bridgeError.message,
      documentPath: bridgeError.documentPath,
      configPath: bridgeError.configPath,
      cause: bridgeError.name,
    });
    process.exitCode = 1;
    return;
  }

  const vite = await createServer({
    root: webRoot,
    appType: 'custom',
    clearScreen: false,
    configFile: false,
    optimizeDeps: {
      noDiscovery: true,
      entries: [],
    },
    server: {
      host: '127.0.0.1',
      open: options.open,
      port: options.port,
      strictPort: false,
    },
  });

  vite.middlewares.use(BRIDGE_BOOTSTRAP_PATH, (_request, response) => {
    const statusCode = currentState.status === 'ready' ? 200 : 409;
    response.statusCode = statusCode;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(`${JSON.stringify(currentState, null, 2)}\n`);
  });

  vite.middlewares.use(async (request, response, next) => {
    if (request.method !== 'GET' || request.url === undefined || request.url !== '/') {
      next();
      return;
    }

    try {
      const template = await readFile(path.join(webRoot, 'index.html'), 'utf8');
      const html = await vite.transformIndexHtml(request.url, template);
      response.statusCode = 200;
      response.setHeader('content-type', 'text/html; charset=utf-8');
      response.end(html);
    } catch (error) {
      next(error);
    }
  });

  try {
    await vite.listen();
  } catch (error) {
    await vite.close();
    sendProcessMessage({
      type: 'bridge-error',
      workspaceRoot: options.cwd,
      message: error instanceof Error ? error.message : String(error),
      documentPath: getDocumentPath(options.cwd),
      configPath: getConfigPath(options.cwd),
      cause: error instanceof Error ? error.name : 'Error',
    });
    process.exitCode = 1;
    return;
  }

  const address = vite.resolvedUrls?.local[0] ?? `http://127.0.0.1:${options.port}/`;
  sendProcessMessage({
    type: 'bridge-ready',
    url: address,
    workspaceRoot: options.cwd,
    bootstrapPath: BRIDGE_BOOTSTRAP_PATH,
    events: {
      update: BRIDGE_UPDATE_EVENT,
      error: BRIDGE_ERROR_EVENT,
    },
  });

  const watchers = [];
  const closeWatchers = () => {
    for (const watcher of watchers) {
      watcher.close();
    }
    watchers.length = 0;
  };

  let reloadTimer;
  const pendingChangedPaths = new Set();
  const scheduleReload = (changedPath) => {
    pendingChangedPaths.add(changedPath);
    if (reloadTimer) {
      clearTimeout(reloadTimer);
    }

    reloadTimer = setTimeout(async () => {
      const changedPaths = Array.from(pendingChangedPaths);
      const eventContext = {
        changedPath: changedPaths[changedPaths.length - 1],
        changedPaths,
        documentPath: getDocumentPath(options.cwd),
        configPath: getConfigPath(options.cwd),
      };

      pendingChangedPaths.clear();

      try {
        currentState = await readBridgePayload(options.cwd);
        vite.ws.send({
          type: 'custom',
          event: BRIDGE_UPDATE_EVENT,
          data: {
            ...eventContext,
            status: currentState.status,
          },
        });
      } catch (error) {
        currentState = toBridgeError(error, options.cwd);
        vite.ws.send({
          type: 'custom',
          event: BRIDGE_ERROR_EVENT,
          data: {
            ...currentState,
            changedPath: eventContext.changedPath,
            changedPaths: eventContext.changedPaths,
          },
        });
      }
    }, 50);
  };

  const watchFile = (filePath) => {
    const watcher = watch(filePath, { persistent: true }, () => {
      scheduleReload(filePath);
    });

    watcher.on('error', (error) => {
      const message = error instanceof Error ? error.message : String(error);
      sendProcessMessage({ type: 'bridge-watch-error', workspaceRoot: options.cwd, message });
      vite.ws.send({
        type: 'custom',
        event: BRIDGE_ERROR_EVENT,
        data: {
          status: 'error',
          workspaceRoot: options.cwd,
          message: `Bridge watch failed for ${filePath}: ${message}`,
          documentPath: getDocumentPath(options.cwd),
          configPath: getConfigPath(options.cwd),
          watchedPath: filePath,
        },
      });
    });

    watchers.push(watcher);
  };

  try {
    watchFile(getDocumentPath(options.cwd));
    watchFile(getConfigPath(options.cwd));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    closeWatchers();
    await vite.close();
    sendProcessMessage({
      type: 'bridge-error',
      workspaceRoot: options.cwd,
      message: `Failed to watch workspace files: ${message}`,
      documentPath: getDocumentPath(options.cwd),
      configPath: getConfigPath(options.cwd),
      cause: error instanceof Error ? error.name : 'Error',
    });
    process.exitCode = 1;
    return;
  }

  const shutdown = async (signal) => {
    if (reloadTimer) {
      clearTimeout(reloadTimer);
      reloadTimer = undefined;
    }
    closeWatchers();
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
    await vite.close();
    process.exit(signal === 'SIGTERM' ? 143 : 130);
  };

  const onSigint = () => {
    shutdown('SIGINT').catch((error) => {
      console.error(error);
      process.exit(130);
    });
  };

  const onSigterm = () => {
    shutdown('SIGTERM').catch((error) => {
      console.error(error);
      process.exit(143);
    });
  };

  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);
}

main().catch((error) => {
  sendProcessMessage({
    type: 'bridge-error',
    workspaceRoot: process.cwd(),
    message: error instanceof Error ? error.message : String(error),
    cause: error instanceof Error ? error.name : 'Error',
  });
  console.error(error);
  process.exit(1);
});
