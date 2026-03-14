import { z } from 'zod';

export const DOCUMENT_SCHEMA_VERSION = 1 as const;

export const stableIdSchema = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/u, 'Stable ids must start with a letter and contain only letters, numbers, underscores, or hyphens');

export const semanticBlockKinds = ['heading', 'paragraph', 'bullet', 'fact'] as const;
export const semanticBlockKindSchema = z.enum(semanticBlockKinds);

export const boxSchema = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const pageSchema = z.strictObject({
  id: stableIdSchema,
  size: z.strictObject({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  margin: z.strictObject({
    top: z.number().min(0),
    right: z.number().min(0),
    bottom: z.number().min(0),
    left: z.number().min(0),
  }),
});

export const semanticBlockSchema = z.strictObject({
  id: stableIdSchema,
  kind: semanticBlockKindSchema,
  text: z.string().min(1, 'Block text is required'),
});

export const semanticSectionSchema = z.strictObject({
  id: stableIdSchema,
  title: z.string().min(1, 'Section title is required'),
  blockIds: z.array(stableIdSchema).min(1, 'Section must reference at least one block'),
});

export const layoutFrameSchema = z.strictObject({
  id: stableIdSchema,
  pageId: stableIdSchema,
  blockId: stableIdSchema,
  box: boxSchema,
  zIndex: z.number().int().min(0),
});

function addDuplicateIdIssues(
  context: z.RefinementCtx,
  values: string[],
  pathPrefix: (index: number) => Array<string | number>,
  label: string,
): void {
  const seen = new Map<string, number>();

  values.forEach((value, index) => {
    const existingIndex = seen.get(value);
    if (existingIndex !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: pathPrefix(index),
        message: `Duplicate ${label} id \"${value}\" also used at index ${existingIndex}`,
      });
      return;
    }

    seen.set(value, index);
  });
}

export const documentSchema = z
  .strictObject({
    version: z.literal(DOCUMENT_SCHEMA_VERSION).default(DOCUMENT_SCHEMA_VERSION),
    metadata: z.strictObject({
      title: z.string().min(1, 'Document title is required'),
      locale: z.string().min(2, 'Locale must be at least 2 characters').default('en-US'),
    }),
    semantic: z.strictObject({
      sections: z.array(semanticSectionSchema).min(1, 'Document must contain at least one semantic section'),
      blocks: z.array(semanticBlockSchema).min(1, 'Document must contain at least one semantic block'),
    }),
    layout: z.strictObject({
      pages: z.array(pageSchema).min(1, 'Document must contain at least one layout page'),
      frames: z.array(layoutFrameSchema),
    }),
  })
  .superRefine((value, context) => {
    addDuplicateIdIssues(
      context,
      value.semantic.sections.map((section) => section.id),
      (index) => ['semantic', 'sections', index, 'id'],
      'section',
    );
    addDuplicateIdIssues(
      context,
      value.semantic.blocks.map((block) => block.id),
      (index) => ['semantic', 'blocks', index, 'id'],
      'block',
    );
    addDuplicateIdIssues(
      context,
      value.layout.pages.map((page) => page.id),
      (index) => ['layout', 'pages', index, 'id'],
      'page',
    );
    addDuplicateIdIssues(
      context,
      value.layout.frames.map((frame) => frame.id),
      (index) => ['layout', 'frames', index, 'id'],
      'frame',
    );

    const blockIds = new Set(value.semantic.blocks.map((block) => block.id));
    const pageIds = new Set(value.layout.pages.map((page) => page.id));
    const frameCountsByBlockId = new Map<string, number>();

    value.semantic.sections.forEach((section, sectionIndex) => {
      const seenSectionBlockIds = new Set<string>();

      section.blockIds.forEach((blockId, blockIndex) => {
        if (seenSectionBlockIds.has(blockId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['semantic', 'sections', sectionIndex, 'blockIds', blockIndex],
            message: `Section block id \"${blockId}\" must not be repeated within the same section`,
          });
        }
        seenSectionBlockIds.add(blockId);

        if (!blockIds.has(blockId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['semantic', 'sections', sectionIndex, 'blockIds', blockIndex],
            message: `Section references missing semantic block \"${blockId}\"`,
          });
        }
      });
    });

    value.semantic.blocks.forEach((block, blockIndex) => {
      const referencedBySection = value.semantic.sections.some((section) => section.blockIds.includes(block.id));
      if (!referencedBySection) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['semantic', 'blocks', blockIndex, 'id'],
          message: `Semantic block \"${block.id}\" is not referenced by any section`,
        });
      }
    });

    value.layout.frames.forEach((frame, frameIndex) => {
      if (!pageIds.has(frame.pageId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['layout', 'frames', frameIndex, 'pageId'],
          message: `Layout frame references missing page \"${frame.pageId}\"`,
        });
      }

      if (!blockIds.has(frame.blockId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['layout', 'frames', frameIndex, 'blockId'],
          message: `Layout frame references missing semantic block \"${frame.blockId}\"`,
        });
      }

      const currentCount = frameCountsByBlockId.get(frame.blockId) ?? 0;
      frameCountsByBlockId.set(frame.blockId, currentCount + 1);
      if (currentCount >= 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['layout', 'frames', frameIndex, 'blockId'],
          message: `Semantic block \"${frame.blockId}\" already has a layout frame`,
        });
      }
    });
  });

export type SfrbDocument = z.output<typeof documentSchema>;
export type SfrbDocumentInput = z.input<typeof documentSchema>;
export type SemanticSection = z.output<typeof semanticSectionSchema>;
export type SemanticBlock = z.output<typeof semanticBlockSchema>;
export type LayoutPage = z.output<typeof pageSchema>;
export type LayoutFrame = z.output<typeof layoutFrameSchema>;

export function parseDocument(input: unknown): SfrbDocument {
  return documentSchema.parse(input);
}

export function createDocumentJsonSchema(): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(documentSchema) as Record<string, unknown>;
  return {
    title: 'SfRB Document',
    ...jsonSchema,
  };
}
