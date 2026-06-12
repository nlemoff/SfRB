import { z } from 'zod';

import { templateMetadataSchema } from './templates/registry';

export const DOCUMENT_SCHEMA_VERSION = 1 as const;

export const stableIdSchema = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/u, 'Stable ids must start with a letter and contain only letters, numbers, underscores, or hyphens');

export const semanticBlockKinds = ['heading', 'paragraph', 'bullet', 'fact', 'divider'] as const;
export const semanticBlockKindSchema = z.enum(semanticBlockKinds);
export const starterKinds = ['template', 'blank'] as const;
export const starterKindSchema = z.enum(starterKinds);

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

export const starterMetadataSchema = z.strictObject({
  id: stableIdSchema,
  kind: starterKindSchema,
});

export const semanticBlockSchema = z
  .strictObject({
    id: stableIdSchema,
    kind: semanticBlockKindSchema,
    text: z.string(),
    splitFrom: stableIdSchema.optional(),
  })
  .superRefine((value, context) => {
    // Dividers are the only text-free block kind; they render as a rule.
    if (value.kind !== 'divider' && value.text.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['text'],
        message: 'Block text is required',
      });
    }
  });

export const semanticSectionSchema = z.strictObject({
  id: stableIdSchema,
  title: z.string().min(1, 'Section title is required'),
  blockIds: z.array(stableIdSchema).min(1, 'Section must reference at least one block'),
});

export const framePlacementSchema = z.enum(['managed', 'free']);

export const layoutFrameSchema = z.strictObject({
  id: stableIdSchema,
  pageId: stableIdSchema,
  blockId: stableIdSchema,
  box: boxSchema,
  zIndex: z.number().int().min(0),
  placement: framePlacementSchema.default('managed'),
});

export const frameGroupSchema = z.strictObject({
  id: stableIdSchema,
  pageId: stableIdSchema,
  frameIds: z.array(stableIdSchema).min(2, 'Frame group needs at least two member frames'),
  locked: z.boolean(),
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
      starter: starterMetadataSchema.optional(),
      template: templateMetadataSchema.optional(),
    }),
    semantic: z.strictObject({
      sections: z.array(semanticSectionSchema).min(1, 'Document must contain at least one semantic section'),
      blocks: z.array(semanticBlockSchema).min(1, 'Document must contain at least one semantic block'),
    }),
    layout: z.strictObject({
      pages: z.array(pageSchema).min(1, 'Document must contain at least one layout page'),
      frames: z.array(layoutFrameSchema),
      frameGroups: z.array(frameGroupSchema).default([]),
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

    addDuplicateIdIssues(
      context,
      value.layout.frameGroups.map((group) => group.id),
      (index) => ['layout', 'frameGroups', index, 'id'],
      'frame group',
    );

    const framesById = new Map(value.layout.frames.map((frame) => [frame.id, frame]));
    const groupIdByFrameId = new Map<string, string>();

    value.layout.frameGroups.forEach((group, groupIndex) => {
      if (!pageIds.has(group.pageId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['layout', 'frameGroups', groupIndex, 'pageId'],
          message: `Frame group references missing page \"${group.pageId}\"`,
        });
      }

      group.frameIds.forEach((frameId, frameIdIndex) => {
        const frame = framesById.get(frameId);
        if (!frame) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['layout', 'frameGroups', groupIndex, 'frameIds', frameIdIndex],
            message: `Frame group references missing layout frame \"${frameId}\"`,
          });
          return;
        }

        const existingGroupId = groupIdByFrameId.get(frameId);
        if (existingGroupId !== undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['layout', 'frameGroups', groupIndex, 'frameIds', frameIdIndex],
            message: `Layout frame \"${frameId}\" already belongs to frame group \"${existingGroupId}\"`,
          });
        } else {
          groupIdByFrameId.set(frameId, group.id);
        }

        if (frame.pageId !== group.pageId) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['layout', 'frameGroups', groupIndex, 'frameIds', frameIdIndex],
            message: `Frame group member \"${frameId}\" is on page \"${frame.pageId}\" but the group targets page \"${group.pageId}\"`,
          });
        }
      });
    });
  });

export type SfrbDocument = z.output<typeof documentSchema>;
export type SfrbDocumentInput = z.input<typeof documentSchema>;
export type StarterKind = z.output<typeof starterKindSchema>;
export type StarterMetadata = z.output<typeof starterMetadataSchema>;
export type SemanticSection = z.output<typeof semanticSectionSchema>;
export type SemanticBlock = z.output<typeof semanticBlockSchema>;
export type SemanticBlockKind = z.output<typeof semanticBlockKindSchema>;
export type LayoutPage = z.output<typeof pageSchema>;
export type LayoutFrame = z.output<typeof layoutFrameSchema>;
export type LayoutFrameInput = z.input<typeof layoutFrameSchema>;
export type FramePlacement = z.output<typeof framePlacementSchema>;
export type FrameGroup = z.output<typeof frameGroupSchema>;

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
