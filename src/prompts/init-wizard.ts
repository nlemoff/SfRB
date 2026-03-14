import Enquirer from 'enquirer';

import {
  PHYSICS_MODES,
  PROVIDERS,
  type PhysicsMode,
  type Provider,
  defaultApiKeyEnvVarForProvider,
  isPhysicsMode,
  isProvider,
} from '../config/schema';

export const INIT_WIZARD_TEST_INPUT_ENV = 'SFRB_INIT_TEST_INPUT';

export type InitWizardAnswers = {
  provider: Provider;
  apiKey: string;
  physics: PhysicsMode;
  confirm: boolean;
};

type InitWizardRuntime = {
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
  env?: NodeJS.ProcessEnv;
};

class InitWizardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InitWizardError';
  }
}

export class InitWizardCancelledError extends InitWizardError {
  constructor() {
    super('Init cancelled. No files were written.');
    this.name = 'InitWizardCancelledError';
  }
}

function validateHarnessInput(raw: unknown): InitWizardAnswers {
  if (!raw || typeof raw !== 'object') {
    throw new InitWizardError(
      `${INIT_WIZARD_TEST_INPUT_ENV} must be a JSON object with provider, apiKey, physics, and optional confirm fields.`,
    );
  }

  const input = raw as Record<string, unknown>;

  if (input.cancel === true || input.confirm === false) {
    throw new InitWizardCancelledError();
  }

  const provider = input.provider;
  if (!isProvider(provider)) {
    throw new InitWizardError(
      `${INIT_WIZARD_TEST_INPUT_ENV}.provider must be one of: ${PROVIDERS.join(', ')}`,
    );
  }

  const apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
  if (!apiKey) {
    throw new InitWizardError(`${INIT_WIZARD_TEST_INPUT_ENV}.apiKey is required.`);
  }

  const physics = input.physics;
  if (!isPhysicsMode(physics)) {
    throw new InitWizardError(
      `${INIT_WIZARD_TEST_INPUT_ENV}.physics must be one of: ${PHYSICS_MODES.join(', ')}`,
    );
  }

  return {
    provider,
    apiKey,
    physics,
    confirm: input.confirm !== false,
  };
}

function readHarnessAnswers(env: NodeJS.ProcessEnv): InitWizardAnswers | null {
  const raw = env[INIT_WIZARD_TEST_INPUT_ENV];
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InitWizardError(`${INIT_WIZARD_TEST_INPUT_ENV} must contain valid JSON.`);
  }

  return validateHarnessInput(parsed);
}

export async function runInitWizard(runtime: InitWizardRuntime = {}): Promise<InitWizardAnswers> {
  const env = runtime.env ?? process.env;
  const stdin = runtime.stdin ?? process.stdin;
  const stdout = runtime.stdout ?? process.stdout;

  const harnessAnswers = readHarnessAnswers(env);
  if (harnessAnswers) {
    return harnessAnswers;
  }

  if (!stdin.isTTY || !stdout.isTTY) {
    throw new InitWizardError(
      'Interactive init requires a TTY. Re-run `sfrb init` in a terminal or provide --provider, --api-key, and --physics.',
    );
  }

  const enquirer = new Enquirer<InitWizardAnswers>({ stdin, stdout });

  try {
    const answers = await enquirer.prompt([
      {
        type: 'select',
        name: 'provider',
        message: 'Which AI provider should SfRB use?',
        choices: PROVIDERS.map((provider) => ({
          name: provider,
          message: provider === 'openai' ? 'OpenAI' : 'Anthropic',
          hint: `stores ${defaultApiKeyEnvVarForProvider(provider)}`,
        })),
      },
      {
        type: 'password',
        name: 'apiKey',
        message: 'Paste the provider API key (captured only for validation and redacted summaries)',
        validate(value: string) {
          return value.trim().length > 0 || 'API key is required';
        },
        result(value: string) {
          return value.trim();
        },
      },
      {
        type: 'select',
        name: 'physics',
        message: 'Which workspace physics fits this project?',
        choices: PHYSICS_MODES.map((physics) => ({
          name: physics,
          message: physics === 'document' ? 'Document' : 'Design',
          hint:
            physics === 'document'
              ? 'structured editing and linear flows'
              : 'spatial editing and visual iteration',
        })),
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Write project-local sfrb.config.json with this setup?',
        initial: true,
      },
    ]);

    if (!answers.confirm) {
      throw new InitWizardCancelledError();
    }

    return answers;
  } catch (error) {
    if (error === '') {
      throw new InitWizardCancelledError();
    }

    throw error;
  }
}
