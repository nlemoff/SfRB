import { z } from 'zod';

import { stableIdSchema, type LayoutFrame, type LayoutPage, type SfrbDocument } from '../document/schema';

const consultantBoxSchema = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const layoutConsultantRequestSchema = z.strictObject({
  frameId: stableIdSchema,
  issue: z.strictObject({
    kind: z.literal('overflow'),
    measuredContentHeight: z.number().positive(),
    measuredAvailableHeight: z.number().positive(),
  }),
});

export const rawLayoutResizeProposalSchema = z.strictObject({
  frameId: stableIdSchema,
  box: consultantBoxSchema,
  rationale: z.string().min(1, 'Proposal rationale is required'),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type LayoutConsultantRequest = z.output<typeof layoutConsultantRequestSchema>;
export type LayoutResizeProposal = z.output<typeof rawLayoutResizeProposalSchema> & {
  kind: 'frame_resize';
};

export type LayoutConsultantFailureCode =
  | 'provider_unsupported'
  | 'provider_unavailable'
  | 'malformed_provider_output'
  | 'proposal_rejected'
  | 'frame_not_found';

export type LayoutConsultantIssue = {
  path: string;
  message: string;
};

export type LayoutConsultantSuccess = {
  ok: true;
  status: 'proposal';
  code: 'proposal_ready';
  provider: string;
  proposal: LayoutResizeProposal;
};

export type LayoutConsultantFailure = {
  ok: false;
  status: 'error' | 'unavailable';
  code: LayoutConsultantFailureCode;
  provider?: string;
  message: string;
  issues?: LayoutConsultantIssue[];
};

export type LayoutConsultantResult = LayoutConsultantSuccess | LayoutConsultantFailure;

export type LayoutConsultantInvocation = {
  provider: string;
  apiKey: string;
  document: SfrbDocument;
  request: LayoutConsultantRequest;
};

type ProviderResponse =
  | {
      ok: true;
      content: unknown;
    }
  | {
      ok: false;
      status: 'unavailable';
      message: string;
    };

type ProviderClient = {
  requestProposal: (input: LayoutConsultantInvocation & { targetFrame: LayoutFrame; targetPage: LayoutPage }) => Promise<ProviderResponse>;
};

const providerClients: Record<string, ProviderClient> = {
  openai: {
    requestProposal: async (input) => {
      const response = await requestJson({
        url: `${process.env.SFRB_OPENAI_BASE_URL ?? 'https://api.openai.com/v1'}/chat/completions`,
        headers: {
          authorization: `Bearer ${input.apiKey}`,
          'content-type': 'application/json',
        },
        body: {
          model: process.env.SFRB_CONSULTANT_OPENAI_MODEL ?? 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are an SfRB layout consultant. Reply with JSON only. Produce exactly one safe frame resize proposal for the requested frame. Keep the frameId unchanged. Use finite positive box numbers. Do not propose changes for any other frame.',
            },
            {
              role: 'user',
              content: JSON.stringify(buildProviderPromptPayload(input)),
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'layout_resize_proposal',
              strict: true,
              schema: createProposalJsonSchema(),
            },
          },
        },
      });

      if (!response.ok) {
        return response;
      }

      const content = extractOpenAiContent(response.content);
      if (content === null) {
        return {
          ok: false,
          status: 'unavailable',
          message: 'Provider response did not include a structured completion.',
        };
      }

      return { ok: true, content };
    },
  },
  anthropic: {
    requestProposal: async (input) => {
      const response = await requestJson({
        url: `${process.env.SFRB_ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1'}/messages`,
        headers: {
          'content-type': 'application/json',
          'x-api-key': input.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: {
          model: process.env.SFRB_CONSULTANT_ANTHROPIC_MODEL ?? 'claude-3-5-haiku-latest',
          max_tokens: 400,
          system:
            'You are an SfRB layout consultant. Reply with JSON only. Produce exactly one safe frame resize proposal for the requested frame. Keep the frameId unchanged. Use finite positive box numbers. Do not propose changes for any other frame.',
          messages: [
            {
              role: 'user',
              content: JSON.stringify(buildProviderPromptPayload(input)),
            },
          ],
        },
      });

      if (!response.ok) {
        return response;
      }

      const content = extractAnthropicContent(response.content);
      if (content === null) {
        return {
          ok: false,
          status: 'unavailable',
          message: 'Provider response did not include a text completion.',
        };
      }

      return { ok: true, content };
    },
  },
};

export function parseLayoutConsultantRequest(input: unknown): LayoutConsultantRequest {
  return layoutConsultantRequestSchema.parse(input);
}

export async function requestLayoutConsultantProposal(input: LayoutConsultantInvocation): Promise<LayoutConsultantResult> {
  const targetFrame = input.document.layout.frames.find((frame) => frame.id === input.request.frameId);
  if (!targetFrame) {
    return {
      ok: false,
      status: 'error',
      code: 'frame_not_found',
      provider: input.provider,
      message: `Document does not contain layout frame "${input.request.frameId}".`,
      issues: [{ path: 'frameId', message: `Missing frame "${input.request.frameId}"` }],
    };
  }

  const targetPage = input.document.layout.pages.find((page) => page.id === targetFrame.pageId);
  if (!targetPage) {
    return {
      ok: false,
      status: 'error',
      code: 'proposal_rejected',
      provider: input.provider,
      message: `Frame "${targetFrame.id}" references missing page "${targetFrame.pageId}".`,
      issues: [{ path: 'layout.frames', message: `Frame "${targetFrame.id}" references missing page "${targetFrame.pageId}"` }],
    };
  }

  const providerClient = providerClients[input.provider];
  if (!providerClient) {
    return {
      ok: false,
      status: 'error',
      code: 'provider_unsupported',
      provider: input.provider,
      message: `Layout consultant does not support provider "${input.provider}".`,
      issues: [{ path: 'ai.provider', message: `Unsupported consultant provider "${input.provider}"` }],
    };
  }

  const providerResponse = await providerClient.requestProposal({
    ...input,
    targetFrame,
    targetPage,
  });

  if (!providerResponse.ok) {
    return {
      ok: false,
      status: providerResponse.status,
      code: 'provider_unavailable',
      provider: input.provider,
      message: providerResponse.message,
    };
  }

  const parsedContent = parseProviderJson(providerResponse.content);
  if (!parsedContent.ok) {
    return {
      ok: false,
      status: 'error',
      code: 'malformed_provider_output',
      provider: input.provider,
      message: parsedContent.message,
      issues: parsedContent.issues,
    };
  }

  return validateSafeProposal({
    provider: input.provider,
    proposal: parsedContent.value,
    targetFrame,
    targetPage,
  });
}

function buildProviderPromptPayload(input: LayoutConsultantInvocation & { targetFrame: LayoutFrame; targetPage: LayoutPage }) {
  const targetBlock = input.document.semantic.blocks.find((block) => block.id === input.targetFrame.blockId);

  return {
    task: 'propose_safe_frame_resize',
    targetFrame: {
      id: input.targetFrame.id,
      pageId: input.targetFrame.pageId,
      blockId: input.targetFrame.blockId,
      box: input.targetFrame.box,
      zIndex: input.targetFrame.zIndex,
    },
    targetPage: input.targetPage,
    issue: input.request.issue,
    semanticBlock: targetBlock ?? null,
    constraints: {
      allowedOperation: 'resize_existing_frame_only',
      keepFrameId: input.targetFrame.id,
      pageBounds: {
        minX: 0,
        minY: 0,
        maxWidth: input.targetPage.size.width,
        maxHeight: input.targetPage.size.height,
      },
    },
  };
}

function createProposalJsonSchema(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['frameId', 'box', 'rationale', 'confidence'],
    properties: {
      frameId: { type: 'string' },
      box: {
        type: 'object',
        additionalProperties: false,
        required: ['x', 'y', 'width', 'height'],
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number', exclusiveMinimum: 0 },
          height: { type: 'number', exclusiveMinimum: 0 },
        },
      },
      rationale: { type: 'string' },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
    },
  };
}

function extractOpenAiContent(input: unknown): unknown | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const content = (input as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content;
  }

  return null;
}

function extractAnthropicContent(input: unknown): unknown | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const content = (input as { content?: Array<{ type?: string; text?: string }> }).content;
  if (!Array.isArray(content)) {
    return null;
  }

  const text = content
    .filter((entry) => entry && typeof entry === 'object' && entry.type === 'text' && typeof entry.text === 'string')
    .map((entry) => entry.text)
    .join('')
    .trim();

  return text.length > 0 ? text : null;
}

function parseProviderJson(input: unknown):
  | { ok: true; value: z.output<typeof rawLayoutResizeProposalSchema> }
  | { ok: false; message: string; issues?: LayoutConsultantIssue[] } {
  let parsedInput = input;
  if (typeof input === 'string') {
    try {
      parsedInput = JSON.parse(input);
    } catch (error) {
      return {
        ok: false,
        message: `Provider returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
        issues: [{ path: '(provider)', message: 'Response was not valid JSON' }],
      };
    }
  }

  const parsed = rawLayoutResizeProposalSchema.safeParse(parsedInput);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Provider returned a malformed resize proposal.',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join('.') : '(provider)',
        message: issue.message,
      })),
    };
  }

  return { ok: true, value: parsed.data };
}

function validateSafeProposal(input: {
  provider: string;
  proposal: z.output<typeof rawLayoutResizeProposalSchema>;
  targetFrame: LayoutFrame;
  targetPage: LayoutPage;
}): LayoutConsultantResult {
  const issues: LayoutConsultantIssue[] = [];

  if (input.proposal.frameId !== input.targetFrame.id) {
    issues.push({
      path: 'frameId',
      message: `Proposal targeted frame "${input.proposal.frameId}" but request targeted "${input.targetFrame.id}".`,
    });
  }

  const { x, y, width, height } = input.proposal.box;
  if (x < 0) {
    issues.push({ path: 'box.x', message: 'Proposed frame x must be greater than or equal to 0.' });
  }
  if (y < 0) {
    issues.push({ path: 'box.y', message: 'Proposed frame y must be greater than or equal to 0.' });
  }
  if (x + width > input.targetPage.size.width) {
    issues.push({ path: 'box.width', message: 'Proposed frame width exceeds page bounds.' });
  }
  if (y + height > input.targetPage.size.height) {
    issues.push({ path: 'box.height', message: 'Proposed frame height exceeds page bounds.' });
  }

  if (issues.length > 0) {
    return {
      ok: false,
      status: 'error',
      code: 'proposal_rejected',
      provider: input.provider,
      message: 'Provider proposal failed local safety validation.',
      issues,
    };
  }

  return {
    ok: true,
    status: 'proposal',
    code: 'proposal_ready',
    provider: input.provider,
    proposal: {
      kind: 'frame_resize',
      frameId: input.targetFrame.id,
      box: input.proposal.box,
      rationale: input.proposal.rationale,
      confidence: input.proposal.confidence,
    },
  };
}

async function requestJson(input: {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}): Promise<ProviderResponse> {
  try {
    const response = await fetch(input.url, {
      method: 'POST',
      headers: input.headers,
      body: JSON.stringify(input.body),
    });

    if (!response.ok) {
      return {
        ok: false,
        status: 'unavailable',
        message: `Provider request failed with status ${response.status}.`,
      };
    }

    return {
      ok: true,
      content: (await response.json()) as unknown,
    };
  } catch (error) {
    return {
      ok: false,
      status: 'unavailable',
      message: `Provider request failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
