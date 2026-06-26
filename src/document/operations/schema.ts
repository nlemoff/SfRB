import { z, ZodError } from 'zod';

import { boxSchema, stableIdSchema, semanticBlockKindSchema } from '../schema';
import { templateIdSchema } from '../templates/registry';

const operationBlockSchema = z.strictObject({
  id: stableIdSchema,
  kind: semanticBlockKindSchema,
  text: z.string(),
});

const operationFrameSchema = z.strictObject({
  id: stableIdSchema,
  pageId: stableIdSchema,
  box: boxSchema,
  zIndex: z.number().int().min(0).optional(),
});

const operationSegmentFrameSchema = z.strictObject({
  id: stableIdSchema,
  box: boxSchema,
  zIndex: z.number().int().min(0).optional(),
});

export const editorOperationSchema = z.discriminatedUnion('op', [
  z.strictObject({
    op: z.literal('set-title'),
    title: z.string().min(1, 'Document title is required'),
  }),
  z.strictObject({
    op: z.literal('set-section-title'),
    sectionId: stableIdSchema,
    title: z.string().min(1, 'Section title is required'),
  }),
  z.strictObject({
    op: z.literal('set-template'),
    templateId: templateIdSchema,
  }),
  z.strictObject({
    op: z.literal('set-block-text'),
    blockId: stableIdSchema,
    text: z.string().min(1, 'Block text is required'),
  }),
  z.strictObject({
    op: z.literal('insert-block'),
    sectionId: stableIdSchema,
    index: z.number().int().min(0).optional(),
    block: operationBlockSchema,
    frame: operationFrameSchema.optional(),
  }),
  z.strictObject({
    op: z.literal('remove-block'),
    blockId: stableIdSchema,
  }),
  z.strictObject({
    op: z.literal('split-block'),
    blockId: stableIdSchema,
    segments: z
      .array(
        z.strictObject({
          id: stableIdSchema,
          text: z.string().min(1, 'Segment text is required'),
        }),
      )
      .min(2, 'Splitting needs at least two segments'),
    frames: z.array(operationSegmentFrameSchema).optional(),
  }),
  z.strictObject({
    op: z.literal('set-frame-box'),
    frameId: stableIdSchema,
    box: boxSchema,
    asFreeform: z.literal(true).optional(),
  }),
  z.strictObject({
    op: z.literal('move-group'),
    groupId: stableIdSchema,
    dx: z.number().finite(),
    dy: z.number().finite(),
  }),
  z.strictObject({
    op: z.literal('group-frames'),
    groupId: stableIdSchema,
    frameIds: z.array(stableIdSchema).min(2, 'Frame group needs at least two member frames'),
    locked: z.boolean().default(false),
  }),
  z.strictObject({
    op: z.literal('ungroup-frames'),
    groupId: stableIdSchema,
  }),
  z.strictObject({
    op: z.literal('set-group-locked'),
    groupId: stableIdSchema,
    locked: z.boolean(),
  }),
  z.strictObject({
    op: z.literal('reconcile-freeform'),
    outcome: z.enum(['rejoin_layout', 'keep_locked']),
    frameIds: z.array(stableIdSchema).min(1, 'Reconciliation needs at least one frame'),
  }),
]);

export type EditorOperation = z.output<typeof editorOperationSchema>;
export type EditorOperationInput = z.input<typeof editorOperationSchema>;
export type EditorOperationKind = EditorOperation['op'];

export const EDITOR_OPERATION_KINDS = editorOperationSchema.options.map(
  (option) => option.shape.op.value,
) as EditorOperationKind[];

export type OperationIssue = {
  path: string;
  message: string;
};

export class OperationParseError extends Error {
  readonly issues: OperationIssue[];

  constructor(error: ZodError) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.join('.') : '(operation)',
      message: issue.message,
    }));

    super(
      ['Editor operation failed validation:', ...issues.map((issue) => `- ${issue.path}: ${issue.message}`)].join('\n'),
    );

    this.name = 'OperationParseError';
    this.issues = issues;
  }
}

export function parseEditorOperation(input: unknown): EditorOperation {
  try {
    return editorOperationSchema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new OperationParseError(error);
    }

    throw error;
  }
}
