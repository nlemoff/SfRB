import { z } from 'zod';

export const TEMPLATE_IDS = ['default', 'classic', 'modern'] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const TEMPLATE_VERSIONS = {
  default: '1',
  classic: '1',
  modern: '1',
} as const satisfies Record<TemplateId, string>;

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

export function currentTemplateMetadata(id: TemplateId): TemplateMetadata {
  return { id, version: TEMPLATE_VERSIONS[id] };
}
