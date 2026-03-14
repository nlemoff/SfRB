import { Command } from 'commander';

import {
  PHYSICS_MODES,
  PROVIDERS,
  defaultApiKeyEnvVarForProvider,
  isPhysicsMode,
  isProvider,
} from '../config/schema';
import { ConfigValidationError, ensureConfigIsGitignored, getConfigPath, writeConfig } from '../config/store';
import { InitWizardCancelledError, runInitWizard } from '../prompts/init-wizard';

type InitOptions = {
  provider?: string;
  apiKey?: string;
  physics?: string;
  cwd?: string;
};

type InitCommandRuntime = {
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
  stderr?: NodeJS.WriteStream;
  env?: NodeJS.ProcessEnv;
  log?: (message: string) => void;
  error?: (message: string) => void;
};

type InitInputs = {
  provider: string;
  apiKey?: string;
  physics: string;
};

function redactSecret(secret: string): string {
  const trimmed = secret.trim();
  if (trimmed.length <= 4) {
    return '*'.repeat(Math.max(trimmed.length, 1));
  }

  return `${trimmed.slice(0, 3)}${'*'.repeat(Math.max(trimmed.length - 5, 3))}${trimmed.slice(-2)}`;
}

function hasAnyFlag(options: InitOptions): boolean {
  return Boolean(options.provider || options.apiKey || options.physics);
}

function getFlagInputs(options: InitOptions, error: (message: string) => void): InitInputs | null {
  const provider = options.provider;
  const physics = options.physics;

  if (!provider || !physics) {
    error(
      'Non-interactive init requires --provider, --api-key, and --physics. Re-run with the full flag set or use the interactive wizard in a TTY.',
    );
    return null;
  }

  if (isProvider(provider)) {
    const apiKey = options.apiKey?.trim();
    if (!apiKey) {
      error(`Missing API key for provider ${provider}. Pass --api-key or run the interactive wizard.`);
      return null;
    }

    return {
      provider,
      apiKey,
      physics,
    };
  }

  return {
    provider,
    apiKey: options.apiKey?.trim(),
    physics,
  };
}

function buildSummary(params: {
  projectRoot: string;
  provider: string;
  physics: string;
  apiKey: string;
  gitignore: { path: string; updated: boolean };
}) {
  return {
    path: getConfigPath(params.projectRoot),
    gitignore: {
      path: params.gitignore.path,
      updated: params.gitignore.updated,
      protects: 'sfrb.config.json',
    },
    configured: {
      provider: params.provider,
      apiKeyEnvVar: isProvider(params.provider)
        ? defaultApiKeyEnvVarForProvider(params.provider)
        : 'UNSUPPORTED_PROVIDER_API_KEY',
      physics: params.physics,
    },
    capturedApiKey: redactSecret(params.apiKey),
  };
}

export async function runInitCommand(options: InitOptions, runtime: InitCommandRuntime = {}): Promise<number> {
  const projectRoot = options.cwd ?? process.cwd();
  const log = runtime.log ?? ((message: string) => console.log(message));
  const error = runtime.error ?? ((message: string) => console.error(message));

  try {
    const inputs = hasAnyFlag(options)
      ? getFlagInputs(options, error)
      : await runInitWizard({
          stdin: runtime.stdin,
          stdout: runtime.stdout,
          env: runtime.env,
        });

    if (!inputs) {
      return 1;
    }

    const providerEnvVar = isProvider(inputs.provider)
      ? defaultApiKeyEnvVarForProvider(inputs.provider)
      : 'UNSUPPORTED_PROVIDER_API_KEY';

    const config = await writeConfig(
      {
        ai: {
          provider: inputs.provider,
          apiKeyEnvVar: providerEnvVar,
        },
        workspace: {
          physics: inputs.physics,
        },
      },
      projectRoot,
    );

    const gitignore = await ensureConfigIsGitignored(projectRoot);

    log('SfRB init complete.');
    log(
      JSON.stringify(
        buildSummary({
          projectRoot,
          provider: config.ai.provider,
          physics: config.workspace.physics,
          apiKey: inputs.apiKey ?? '',
          gitignore,
        }),
        null,
        2,
      ),
    );

    return 0;
  } catch (caughtError) {
    if (caughtError instanceof InitWizardCancelledError) {
      error(caughtError.message);
      return 1;
    }

    if (caughtError instanceof ConfigValidationError) {
      error(caughtError.message);
      return 1;
    }

    if (caughtError instanceof Error) {
      error(caughtError.message);
      return 1;
    }

    throw caughtError;
  }
}

export function createInitCommand(): Command {
  const command = new Command('init');

  command
    .description('Initialize project-local SfRB configuration')
    .option(`--provider <provider>`, `AI provider to configure (${PROVIDERS.join(' or ')})`)
    .option('--api-key <key>', 'Provider API key for non-interactive use')
    .option(`--physics <mode>`, `Workspace physics (${PHYSICS_MODES.join(' or ')})`)
    .option('--cwd <path>', 'Project root to write sfrb.config.json into')
    .action(async (options: InitOptions) => {
      const exitCode = await runInitCommand(options);
      if (exitCode !== 0) {
        process.exitCode = exitCode;
      }
    });

  return command;
}
