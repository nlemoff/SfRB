import { Command } from 'commander';

import {
  PHYSICS_MODES,
  PROVIDERS,
  defaultApiKeyEnvVarForProvider,
  isPhysicsMode,
  isProvider,
  type PhysicsMode,
} from '../config/schema';
import { ConfigValidationError, ensureConfigIsGitignored, getConfigPath, writeConfig } from '../config/store';
import { getDocumentPath, writeDocument } from '../document/store';
import { STARTER_IDS } from '../document/starters';
import { type StarterKind, starterKinds } from '../document/schema';
import { createStarterDocument } from '../document/starters';
import { InitWizardCancelledError, runInitWizard } from '../prompts/init-wizard';

type InitOptions = {
  provider?: string;
  apiKey?: string;
  physics?: string;
  starter?: string;
  skipAi?: boolean;
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
  starter: StarterKind;
  physics: PhysicsMode;
  provider?: string;
  apiKey?: string;
  skipAi: boolean;
};

function redactSecret(secret: string): string {
  const trimmed = secret.trim();
  if (trimmed.length <= 4) {
    return '*'.repeat(Math.max(trimmed.length, 1));
  }

  return `${trimmed.slice(0, 3)}${'*'.repeat(Math.max(trimmed.length - 5, 3))}${trimmed.slice(-2)}`;
}

function hasAnyFlag(options: InitOptions): boolean {
  return Boolean(options.provider || options.apiKey || options.physics || options.starter || options.skipAi);
}

function isStarterKind(value: unknown): value is StarterKind {
  return typeof value === 'string' && starterKinds.includes(value as StarterKind);
}

function getFlagInputs(options: InitOptions, error: (message: string) => void): InitInputs | null {
  const { provider, physics, starter, skipAi } = options;

  if (!physics || !starter) {
    error(
      'Non-interactive init requires --starter and --physics, plus either --skip-ai or the configured AI path (--provider and --api-key). Re-run with the full flag set or use the interactive wizard in a TTY.',
    );
    return null;
  }

  if (!isPhysicsMode(physics)) {
    return {
      starter: isStarterKind(starter) ? starter : (starter as StarterKind),
      physics: physics as PhysicsMode,
      skipAi: Boolean(skipAi),
      provider,
      apiKey: options.apiKey?.trim(),
    };
  }

  if (!isStarterKind(starter)) {
    return {
      starter: starter as StarterKind,
      physics,
      skipAi: Boolean(skipAi),
      provider,
      apiKey: options.apiKey?.trim(),
    };
  }

  if (skipAi) {
    if (provider || options.apiKey) {
      error('Cannot combine --skip-ai with --provider or --api-key. Choose one AI path.');
      return null;
    }

    return {
      starter,
      physics,
      skipAi: true,
    };
  }

  if (!provider) {
    error('Missing AI provider. Pass --skip-ai for an editor-only workspace or provide --provider and --api-key.');
    return null;
  }

  if (isProvider(provider)) {
    const apiKey = options.apiKey?.trim();
    if (!apiKey) {
      error(`Missing API key for provider ${provider}. Pass --api-key, use --skip-ai, or run the interactive wizard.`);
      return null;
    }

    return {
      starter,
      provider,
      apiKey,
      physics,
      skipAi: false,
    };
  }

  return {
    starter,
    provider,
    apiKey: options.apiKey?.trim(),
    physics,
    skipAi: false,
  };
}

function buildConfigInput(inputs: InitInputs): unknown {
  return {
    ...(inputs.skipAi
      ? {}
      : {
          ai: {
            provider: inputs.provider ?? '',
            apiKeyEnvVar: isProvider(inputs.provider)
              ? defaultApiKeyEnvVarForProvider(inputs.provider)
              : 'UNSUPPORTED_PROVIDER_API_KEY',
          },
        }),
    workspace: {
      physics: inputs.physics,
    },
  };
}

function buildSummary(params: {
  projectRoot: string;
  starter: StarterKind;
  physics: PhysicsMode;
  gitignore: { path: string; updated: boolean };
  provider?: string;
  apiKey?: string;
}) {
  return {
    path: getConfigPath(params.projectRoot),
    documentPath: getDocumentPath(params.projectRoot),
    gitignore: {
      path: params.gitignore.path,
      updated: params.gitignore.updated,
      protects: 'sfrb.config.json',
    },
    workspace: {
      physics: params.physics,
      starter: {
        kind: params.starter,
        id: STARTER_IDS[params.starter],
      },
    },
    ai:
      params.provider && params.apiKey
        ? {
            status: 'configured',
            provider: params.provider,
            apiKeyEnvVar: isProvider(params.provider)
              ? defaultApiKeyEnvVarForProvider(params.provider)
              : 'UNSUPPORTED_PROVIDER_API_KEY',
            capturedApiKey: redactSecret(params.apiKey),
          }
        : {
            status: 'skipped',
          },
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

    const config = await writeConfig(buildConfigInput(inputs), projectRoot);
    const starterDocument = createStarterDocument(inputs.starter, config.workspace.physics);
    await writeDocument(starterDocument, projectRoot);
    const gitignore = await ensureConfigIsGitignored(projectRoot);

    log('SfRB init complete.');
    log(
      JSON.stringify(
        buildSummary({
          projectRoot,
          starter: inputs.starter,
          physics: config.workspace.physics,
          gitignore,
          provider: config.ai?.provider,
          apiKey: inputs.apiKey,
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
    .description('Initialize project-local SfRB workspace files')
    .option(`--starter <starter>`, `Starter workspace (${starterKinds.join(' or ')})`)
    .option(`--provider <provider>`, `AI provider to configure (${PROVIDERS.join(' or ')})`)
    .option('--api-key <key>', 'Provider API key for non-interactive use')
    .option('--skip-ai', 'Create an editor-only workspace without AI configuration')
    .option(`--physics <mode>`, `Workspace physics (${PHYSICS_MODES.join(' or ')})`)
    .option('--cwd <path>', 'Project root to write workspace files into')
    .action(async (options: InitOptions) => {
      const exitCode = await runInitCommand(options);
      if (exitCode !== 0) {
        process.exitCode = exitCode;
      }
    });

  return command;
}
