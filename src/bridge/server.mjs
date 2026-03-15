import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { readConfig, getConfigPath } = require('../config/store.js');
const {
  readWorkspaceDocument,
  getDocumentPath,
  validateDocument,
  writeDocument,
} = require('../document/store.js');
const {
  MissingWorkspaceConfigError,
  DocumentPhysicsValidationError,
  validateDocumentForPhysics,
} = require('../document/validation.js');
const { ConfigParseError, ConfigValidationError } = require('../config/store.js');
const { DocumentParseError, DocumentValidationError } = require('../document/store.js');
const {
  parseLayoutConsultantRequest,
  requestLayoutConsultantProposal,
} = require('../agent/LayoutConsultant.js');

const BRIDGE_BOOTSTRAP_PATH = '/__sfrb/bootstrap';
const BRIDGE_EDITOR_MUTATION_PATH = '/__sfrb/editor';
const BRIDGE_LAYOUT_CONSULTANT_PATH = '/__sfrb/consultant';
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

function getErrorIssues(error) {
  if (!error || typeof error !== 'object' || !('issues' in error) || !Array.isArray(error.issues)) {
    return undefined;
  }

  return error.issues
    .filter(
      (issue) => issue && typeof issue === 'object' && typeof issue.path === 'string' && typeof issue.message === 'string',
    )
    .map((issue) => ({ path: issue.path, message: issue.message }));
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
      issues: getErrorIssues(error),
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

function getMutationFailureStatusCode(error) {
  if (error instanceof DocumentPhysicsValidationError) {
    return 409;
  }

  if (
    error instanceof MissingWorkspaceConfigError ||
    error instanceof ConfigParseError ||
    error instanceof ConfigValidationError ||
    error instanceof DocumentParseError ||
    error instanceof DocumentValidationError
  ) {
    return 422;
  }

  return 500;
}

function toMutationFailure(error, workspaceRoot) {
  const baseError = toBridgeError(error, workspaceRoot);
  return {
    ok: false,
    status: 'error',
    saveState: 'error',
    code:
      error instanceof DocumentPhysicsValidationError
        ? 'physics_invalid'
        : error instanceof MissingWorkspaceConfigError ||
            error instanceof ConfigParseError ||
            error instanceof ConfigValidationError ||
            error instanceof DocumentParseError ||
            error instanceof DocumentValidationError
          ? 'document_invalid'
          : 'persistence_failed',
    canonicalBootstrapPath: BRIDGE_BOOTSTRAP_PATH,
    ...baseError,
  };
}

function toRequestFailure(workspaceRoot, message, cause) {
  return {
    ok: false,
    status: 'error',
    saveState: 'error',
    code: 'request_invalid',
    workspaceRoot,
    message,
    name: 'BridgeRequestError',
    cause,
    documentPath: getDocumentPath(workspaceRoot),
    configPath: getConfigPath(workspaceRoot),
    canonicalBootstrapPath: BRIDGE_BOOTSTRAP_PATH,
    issues: [{ path: '(body)', message }],
  };
}

function getConsultantFailureStatusCode(result) {
  switch (result.code) {
    case 'request_invalid':
      return 400;
    case 'configuration_missing':
    case 'provider_unsupported':
    case 'frame_not_found':
      return 422;
    case 'provider_unavailable':
      return 503;
    case 'malformed_provider_output':
    case 'proposal_rejected':
      return 502;
    default:
      return 500;
  }
}

function toConsultantFailure(params) {
  return {
    ok: false,
    status: params.status ?? 'error',
    code: params.code,
    workspaceRoot: params.workspaceRoot,
    message: params.message,
    name: params.name ?? 'BridgeConsultantError',
    documentPath: getDocumentPath(params.workspaceRoot),
    configPath: getConfigPath(params.workspaceRoot),
    canonicalBootstrapPath: BRIDGE_BOOTSTRAP_PATH,
    provider: params.provider,
    apiKeyEnvVar: params.apiKeyEnvVar,
    issues: params.issues,
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

async function resolveConsultantConfig(workspaceRoot) {
  const config = await readConfig(workspaceRoot);
  const provider = config.ai?.provider;
  const apiKeyEnvVar = config.ai?.apiKeyEnvVar;

  if (typeof provider !== 'string' || provider.trim().length === 0) {
    return toConsultantFailure({
      workspaceRoot,
      status: 'error',
      code: 'configuration_missing',
      message: 'Workspace AI provider is not configured for consultant requests.',
      provider: typeof provider === 'string' ? provider : undefined,
      issues: [{ path: 'ai.provider', message: 'AI provider is required for consultant requests.' }],
    });
  }

  if (typeof apiKeyEnvVar !== 'string' || apiKeyEnvVar.trim().length === 0) {
    return toConsultantFailure({
      workspaceRoot,
      status: 'error',
      code: 'configuration_missing',
      message: 'Workspace AI API key env var is not configured for consultant requests.',
      provider,
      issues: [{ path: 'ai.apiKeyEnvVar', message: 'AI API key env var is required for consultant requests.' }],
    });
  }

  const apiKey = process.env[apiKeyEnvVar];
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    return toConsultantFailure({
      workspaceRoot,
      status: 'error',
      code: 'configuration_missing',
      message: `Consultant secret ${apiKeyEnvVar} is not available in the bridge process environment.`,
      provider,
      apiKeyEnvVar,
      issues: [{ path: 'ai.apiKeyEnvVar', message: `Set ${apiKeyEnvVar} before requesting a consultant proposal.` }],
    });
  }

  return { provider, apiKeyEnvVar, apiKey };
}

async function readJsonBody(request, bodyLabel = 'Bridge request body') {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  if (rawBody.trim().length === 0) {
    throw new Error(`${bodyLabel} must be a JSON object.`);
  }

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${bodyLabel} is not valid JSON: ${detail}`);
  }
}

async function validateMutationDocument(candidate, workspaceRoot) {
  const documentPath = getDocumentPath(workspaceRoot);
  const configPath = getConfigPath(workspaceRoot);
  const document = validateDocument(candidate, documentPath);

  let config;
  try {
    config = await readConfig(workspaceRoot);
  } catch (error) {
    const fileError = error;
    if (fileError && typeof fileError === 'object' && fileError.code === 'ENOENT') {
      throw new MissingWorkspaceConfigError(workspaceRoot, documentPath);
    }
    throw error;
  }

  validateDocumentForPhysics(document, config.workspace.physics, documentPath, configPath);
  return { document, physics: config.workspace.physics };
}

function respondJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
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
    respondJson(response, statusCode, currentState);
  });

  vite.middlewares.use(BRIDGE_EDITOR_MUTATION_PATH, async (request, response, next) => {
    if (request.method !== 'POST') {
      if (request.method === 'OPTIONS') {
        response.statusCode = 204;
        response.end();
        return;
      }
      next();
      return;
    }

    try {
      const parsedBody = await readJsonBody(request, 'Bridge mutation body');
      if (!parsedBody || typeof parsedBody !== 'object' || !('document' in parsedBody)) {
        respondJson(
          response,
          400,
          toRequestFailure(options.cwd, 'Bridge mutation body must be a JSON object with a document field.', 'missing_document'),
        );
        return;
      }

      const { document, physics } = await validateMutationDocument(parsedBody.document, options.cwd);
      await writeDocument(document, options.cwd);
      respondJson(response, 200, {
        ok: true,
        status: 'saved',
        saveState: 'idle',
        workspaceRoot: options.cwd,
        documentPath: getDocumentPath(options.cwd),
        configPath: getConfigPath(options.cwd),
        physics,
        canonicalBootstrapPath: BRIDGE_BOOTSTRAP_PATH,
        savedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'Error' && error.message.startsWith('Bridge mutation body')) {
        respondJson(response, 400, toRequestFailure(options.cwd, error.message, 'invalid_json'));
        return;
      }

      respondJson(response, getMutationFailureStatusCode(error), toMutationFailure(error, options.cwd));
    }
  });

  vite.middlewares.use(BRIDGE_LAYOUT_CONSULTANT_PATH, async (request, response, next) => {
    if (request.method !== 'POST') {
      if (request.method === 'OPTIONS') {
        response.statusCode = 204;
        response.end();
        return;
      }
      next();
      return;
    }

    try {
      const parsedBody = await readJsonBody(request, 'Bridge consultant body');
      const consultantRequest = parseLayoutConsultantRequest(parsedBody);
      const consultantConfig = await resolveConsultantConfig(options.cwd);
      if ('ok' in consultantConfig && consultantConfig.ok === false) {
        respondJson(response, getConsultantFailureStatusCode(consultantConfig), consultantConfig);
        return;
      }

      const document = await readWorkspaceDocument(options.cwd);
      const result = await requestLayoutConsultantProposal({
        provider: consultantConfig.provider,
        apiKey: consultantConfig.apiKey,
        document,
        request: consultantRequest,
      });

      if (!result.ok) {
        const failure = toConsultantFailure({
          workspaceRoot: options.cwd,
          status: result.status,
          code: result.code,
          message: result.message,
          provider: result.provider,
          apiKeyEnvVar: consultantConfig.apiKeyEnvVar,
          issues: result.issues,
        });
        respondJson(response, getConsultantFailureStatusCode(failure), failure);
        return;
      }

      respondJson(response, 200, {
        ok: true,
        status: result.status,
        code: result.code,
        workspaceRoot: options.cwd,
        documentPath: getDocumentPath(options.cwd),
        configPath: getConfigPath(options.cwd),
        canonicalBootstrapPath: BRIDGE_BOOTSTRAP_PATH,
        provider: result.provider,
        apiKeyEnvVar: consultantConfig.apiKeyEnvVar,
        proposal: result.proposal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'Error' && error.message.startsWith('Bridge consultant body')) {
        const failure = toConsultantFailure({
          workspaceRoot: options.cwd,
          status: 'error',
          code: 'request_invalid',
          message: error.message,
          issues: [{ path: '(body)', message: error.message }],
        });
        respondJson(response, 400, failure);
        return;
      }

      if (error && typeof error === 'object' && error.name === 'ZodError' && Array.isArray(error.issues)) {
        const failure = toConsultantFailure({
          workspaceRoot: options.cwd,
          status: 'error',
          code: 'request_invalid',
          message: 'Bridge consultant body failed validation.',
          issues: error.issues
            .filter((issue) => issue && typeof issue.path !== 'undefined' && typeof issue.message === 'string')
            .map((issue) => ({
              path: Array.isArray(issue.path) && issue.path.length > 0 ? issue.path.join('.') : '(body)',
              message: issue.message,
            })),
        });
        respondJson(response, 400, failure);
        return;
      }

      if (isWorkspaceValidationError(error)) {
        const failure = toConsultantFailure({
          workspaceRoot: options.cwd,
          status: 'error',
          code: 'configuration_missing',
          message: error.message,
          name: error.name,
          issues: getErrorIssues(error),
        });
        respondJson(response, 422, failure);
        return;
      }

      const failure = toConsultantFailure({
        workspaceRoot: options.cwd,
        status: 'error',
        code: 'provider_unavailable',
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Error',
      });
      respondJson(response, 500, failure);
    }
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
