import { z } from 'zod';

export const PROVIDERS = ['openai', 'anthropic'] as const;
export const PHYSICS_MODES = ['document', 'design'] as const;

export type Provider = (typeof PROVIDERS)[number];
export type PhysicsMode = (typeof PHYSICS_MODES)[number];

const providerEnvVarMap = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
} as const satisfies Record<Provider, string>;

const aiConfigSchema = z
  .object({
    provider: z.enum(PROVIDERS),
    apiKeyEnvVar: z.string().min(1, 'API key env var is required'),
  })
  .superRefine((value, context) => {
    const expectedEnvVar = providerEnvVarMap[value.provider];

    if (value.apiKeyEnvVar !== expectedEnvVar) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['apiKeyEnvVar'],
        message: `Expected ${expectedEnvVar} for provider ${value.provider}`,
      });
    }
  });

export const sfrbConfigSchema = z.object({
  version: z.literal(1).default(1),
  ai: aiConfigSchema.optional(),
  workspace: z.object({
    physics: z.enum(PHYSICS_MODES).default('document'),
  }),
});

export type SfrbConfig = z.output<typeof sfrbConfigSchema>;
export type SfrbConfigInput = z.input<typeof sfrbConfigSchema>;
export type SfrbAiConfig = z.output<typeof aiConfigSchema>;

export function isProvider(value: unknown): value is Provider {
  return typeof value === 'string' && PROVIDERS.includes(value as Provider);
}

export function isPhysicsMode(value: unknown): value is PhysicsMode {
  return typeof value === 'string' && PHYSICS_MODES.includes(value as PhysicsMode);
}

export function defaultApiKeyEnvVarForProvider(provider: Provider): string {
  return providerEnvVarMap[provider];
}

export function parseSfrbConfig(input: unknown): SfrbConfig {
  return sfrbConfigSchema.parse(input);
}
