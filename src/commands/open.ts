import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';

import { Command } from 'commander';

type OpenOptions = {
  cwd?: string;
  port?: string | number;
  open?: boolean;
};

type BridgeReadyMessage = {
  type: 'bridge-ready';
  url: string;
  workspaceRoot: string;
  bootstrapPath: string;
  events: {
    update: string;
    error: string;
  };
};

type BridgeErrorMessage = {
  type: 'bridge-error';
  message: string;
  workspaceRoot: string;
  documentPath?: string;
  configPath?: string;
  cause?: string;
};

type BridgeWatchErrorMessage = {
  type: 'bridge-watch-error';
  message: string;
  workspaceRoot: string;
};

type BridgeMessage = BridgeReadyMessage | BridgeErrorMessage | BridgeWatchErrorMessage;

type OpenCommandRuntime = {
  log?: (message: string) => void;
  error?: (message: string) => void;
  spawnBridge?: (bridgeEntry: string, args: string[]) => ChildProcess;
  awaitShutdown?: boolean;
};

export type OpenCommandResult = {
  exitCode: number;
  child?: ChildProcess;
  ready?: BridgeReadyMessage;
};

function parsePort(port: string | number | undefined): number {
  if (port === undefined) {
    return 4173;
  }

  const parsed = typeof port === 'number' ? port : Number.parseInt(port, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`Invalid --port value "${String(port)}". Expected an integer between 0 and 65535.`);
  }

  return parsed;
}

function formatBridgeError(message: BridgeErrorMessage): string {
  const lines = [message.message];
  if (message.workspaceRoot) {
    lines.push(`Workspace root: ${message.workspaceRoot}`);
  }
  if (message.documentPath) {
    lines.push(`Document path: ${message.documentPath}`);
  }
  if (message.configPath) {
    lines.push(`Config path: ${message.configPath}`);
  }
  if (message.cause) {
    lines.push(`Cause: ${message.cause}`);
  }

  return lines.join('\n');
}

function createBridgeSpawn(bridgeEntry: string, args: string[]): ChildProcess {
  return spawn(process.execPath, [bridgeEntry, ...args], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
}

export async function runOpenCommand(
  options: OpenOptions,
  runtime: OpenCommandRuntime = {},
): Promise<OpenCommandResult> {
  const projectRoot = path.resolve(options.cwd ?? process.cwd());
  const port = parsePort(options.port);
  const log = runtime.log ?? ((message: string) => console.log(message));
  const error = runtime.error ?? ((message: string) => console.error(message));
  const bridgeEntry = path.resolve(__dirname, '..', 'bridge', 'server.mjs');
  const args = ['--cwd', projectRoot, '--port', String(port), options.open === false ? '--no-open' : '--open'];
  const child = (runtime.spawnBridge ?? createBridgeSpawn)(bridgeEntry, args);

  child.stdout?.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text.length > 0) {
      log(text);
    }
  });

  child.stderr?.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text.length > 0) {
      error(text);
    }
  });

  const ready = await new Promise<BridgeReadyMessage>((resolve, reject) => {
    let settled = false;

    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      child.off('message', onMessage);
      child.off('error', onProcessError);
      child.off('exit', onExit);
      callback();
    };

    const onMessage = (message: BridgeMessage) => {
      if (!message || typeof message !== 'object' || !('type' in message)) {
        return;
      }

      if (message.type === 'bridge-ready') {
        settle(() => resolve(message));
        return;
      }

      if (message.type === 'bridge-error') {
        settle(() => reject(new Error(formatBridgeError(message))));
        return;
      }

      if (message.type === 'bridge-watch-error') {
        error(`Bridge watcher degraded for ${message.workspaceRoot}: ${message.message}`);
      }
    };

    const onProcessError = (caughtError: Error) => {
      settle(() => reject(caughtError));
    };

    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      settle(() =>
        reject(
          new Error(
            `Bridge process exited before reporting readiness (code: ${code ?? 'null'}, signal: ${signal ?? 'none'}).`,
          ),
        ),
      );
    };

    child.on('message', onMessage);
    child.once('error', onProcessError);
    child.once('exit', onExit);
  }).catch((caughtError) => {
    child.kill();
    throw caughtError;
  });

  log(`SfRB bridge ready at ${ready.url}`);
  log(`Workspace root: ${ready.workspaceRoot}`);
  log(`Bootstrap payload: ${ready.bootstrapPath}`);
  log(`Bridge events: ${ready.events.update}, ${ready.events.error}`);

  if (runtime.awaitShutdown === false) {
    return { exitCode: 0, child, ready };
  }

  const forwardSignal = (signal: NodeJS.Signals) => {
    child.kill(signal);
  };

  process.once('SIGINT', forwardSignal);
  process.once('SIGTERM', forwardSignal);

  const exitCode = await new Promise<number>((resolve) => {
    child.once('exit', (code, signal) => {
      process.off('SIGINT', forwardSignal);
      process.off('SIGTERM', forwardSignal);
      resolve(code ?? (signal ? 1 : 0));
    });
  });

  return { exitCode, ready };
}

export function createOpenCommand(): Command {
  const command = new Command('open');

  command
    .description('Launch the local SfRB web bridge for the current workspace')
    .option('--cwd <path>', 'Workspace root to serve')
    .option('--port <port>', 'Preferred local port for the bridge', '4173')
    .option('--no-open', 'Do not open the bridge URL in a browser automatically')
    .action(async (options: OpenOptions) => {
      try {
        const result = await runOpenCommand(options);
        if (result.exitCode !== 0) {
          process.exitCode = result.exitCode;
        }
      } catch (caughtError) {
        process.exitCode = 1;
        const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
        console.error(message);
      }
    });

  return command;
}
