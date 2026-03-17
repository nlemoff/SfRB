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
import { type StarterKind, starterKinds } from '../document/schema';

export const INIT_WIZARD_TEST_INPUT_ENV = 'SFRB_INIT_TEST_INPUT';

export type InitWizardAnswers = {
  starter: StarterKind;
  physics: PhysicsMode;
  skipAi: boolean;
  provider?: Provider;
  apiKey?: string;
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

function isStarterKind(value: unknown): value is StarterKind {
  return typeof value === 'string' && starterKinds.includes(value as StarterKind);
}

function validateHarnessInput(raw: unknown): InitWizardAnswers {
  if (!raw || typeof raw !== 'object') {
    throw new InitWizardError(
      `${INIT_WIZARD_TEST_INPUT_ENV} must be a JSON object with starter, physics, AI setup fields, and optional confirm/cancel fields.`,
    );
  }

  const input = raw as Record<string, unknown>;

  if (input.cancel === true || input.confirm === false) {
    throw new InitWizardCancelledError();
  }

  const starter = input.starter;
  if (!isStarterKind(starter)) {
    throw new InitWizardError(
      `${INIT_WIZARD_TEST_INPUT_ENV}.starter must be one of: ${starterKinds.join(', ')}`,
    );
  }

  const physics = input.physics;
  if (!isPhysicsMode(physics)) {
    throw new InitWizardError(
      `${INIT_WIZARD_TEST_INPUT_ENV}.physics must be one of: ${PHYSICS_MODES.join(', ')}`,
    );
  }

  const skipAi = input.skipAi === true;
  if (skipAi) {
    return {
      starter,
      physics,
      skipAi: true,
      confirm: true,
    };
  }

  const provider = input.provider;
  if (!isProvider(provider)) {
    throw new InitWizardError(
      `${INIT_WIZARD_TEST_INPUT_ENV}.provider must be one of: ${PROVIDERS.join(', ')}`,
    );
  }

  const apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
  if (!apiKey) {
    throw new InitWizardError(`${INIT_WIZARD_TEST_INPUT_ENV}.apiKey is required unless skipAi is true.`);
  }

  return {
    starter,
    physics,
    skipAi: false,
    provider,
    apiKey,
    confirm: true,
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

function shouldSkipAiPrompt(state: unknown): boolean {
  if (!state || typeof state !== 'object' || !('answers' in state)) {
    return false;
  }

  const answers = (state as { answers?: { skipAi?: unknown } }).answers;
  return answers?.skipAi === true;
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
      'Interactive init requires a TTY. Re-run `sfrb init` in a terminal or provide --starter, --physics, and either --skip-ai or --provider/--api-key.',
    );
  }

  const enquirer = new Enquirer<InitWizardAnswers>({ stdin, stdout });

  try {
    const answers = await enquirer.prompt([
      {
        type: 'select',
        name: 'starter',
        message: 'Which starter workspace should SfRB create?',
        choices: starterKinds.map((starter) => ({
          name: starter,
          message: starter === 'template' ? 'Template resume' : 'Blank canvas',
          hint:
            starter === 'template'
              ? 'pre-filled content you can immediately edit'
              : 'minimal valid workspace with one starter line',
        })),
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
        name: 'skipAi',
        message: 'Skip AI setup for now and create an editor-only workspace?',
        initial: true,
      },
      {
        type: 'select',
        name: 'provider',
        message: 'Which AI provider should SfRB use?',
        skip(state) {
          return shouldSkipAiPrompt(state);
        },
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
        skip(state) {
          return shouldSkipAiPrompt(state);
        },
        validate(value: string) {
          return value.trim().length > 0 || 'API key is required';
        },
        result(value: string) {
          return value.trim();
        },
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Write project-local workspace files with this setup?',
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
