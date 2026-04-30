import { z } from 'zod';

export const TEMPLATE_IDS = ['default'] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const templateIdSchema = z.enum(TEMPLATE_IDS);

export const templateMetadataSchema = z.strictObject({
  id: templateIdSchema,
  version: z
    .string()
    .min(1, 'Template version is required'),
});

export type TemplateMetadata = z.output<typeof templateMetadataSchema>;

export function isKnownTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && (TEMPLATE_IDS as readonly string[]).includes(value);
}
