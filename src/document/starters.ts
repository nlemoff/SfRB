import type { PhysicsMode } from '../config/schema';
import { parseDocument, type LayoutFrame, type SemanticBlock, type SemanticSection, type SfrbDocument, type StarterKind } from './schema';

const DEFAULT_PAGE = {
  id: 'pageOne',
  size: { width: 612, height: 792 },
  margin: { top: 36, right: 36, bottom: 36, left: 36 },
} as const;

const STARTER_IDS = {
  template: 'starterTemplateV1',
  blank: 'starterBlankV1',
} as const satisfies Record<StarterKind, string>;

const BLANK_BLOCK_ID = 'summaryBlock';
const BLANK_SECTION_ID = 'summary';
const BLANK_FRAME_ID = 'summaryFrame';

function createTemplateContent(): { title: string; sections: SemanticSection[]; blocks: SemanticBlock[] } {
  const blocks: SemanticBlock[] = [
    {
      id: 'heroNameBlock',
      kind: 'heading',
      text: 'Alex Carter',
    },
    {
      id: 'heroSummaryBlock',
      kind: 'paragraph',
      text: 'Product-minded operator who turns messy workflow problems into calm, local-first tools.',
    },
    {
      id: 'experienceLeadBlock',
      kind: 'bullet',
      text: 'Led a resume tooling refresh that cut onboarding friction and kept document state inspectable end to end.',
    },
    {
      id: 'experienceSystemsBlock',
      kind: 'bullet',
      text: 'Built schema-backed editing flows with path-aware validation so browser and CLI stayed aligned.',
    },
    {
      id: 'skillsBlock',
      kind: 'fact',
      text: 'TypeScript · Node.js · Vite · Product systems · Local-first UX',
    },
  ];

  return {
    title: 'Alex Carter Resume',
    sections: [
      {
        id: 'heroSection',
        title: 'Profile',
        blockIds: ['heroNameBlock', 'heroSummaryBlock'],
      },
      {
        id: 'experienceSection',
        title: 'Experience Highlights',
        blockIds: ['experienceLeadBlock', 'experienceSystemsBlock'],
      },
      {
        id: 'skillsSection',
        title: 'Skills',
        blockIds: ['skillsBlock'],
      },
    ],
    blocks,
  };
}

function createBlankContent(): { title: string; sections: SemanticSection[]; blocks: SemanticBlock[] } {
  return {
    title: 'Untitled Resume',
    sections: [
      {
        id: BLANK_SECTION_ID,
        title: 'Summary',
        blockIds: [BLANK_BLOCK_ID],
      },
    ],
    blocks: [
      {
        id: BLANK_BLOCK_ID,
        kind: 'paragraph',
        text: 'Add your first line here.',
      },
    ],
  };
}

function createFramesForBlocks(blockIds: string[], options?: { blank?: boolean }): LayoutFrame[] {
  if (options?.blank) {
    return [
      {
        id: BLANK_FRAME_ID,
        pageId: DEFAULT_PAGE.id,
        blockId: BLANK_BLOCK_ID,
        box: { x: 36, y: 48, width: 540, height: 96 },
        zIndex: 0,
      },
    ];
  }

  return [
    {
      id: 'heroNameFrame',
      pageId: DEFAULT_PAGE.id,
      blockId: 'heroNameBlock',
      box: { x: 36, y: 32, width: 540, height: 44 },
      zIndex: 0,
    },
    {
      id: 'heroSummaryFrame',
      pageId: DEFAULT_PAGE.id,
      blockId: 'heroSummaryBlock',
      box: { x: 36, y: 84, width: 540, height: 72 },
      zIndex: 1,
    },
    {
      id: 'experienceLeadFrame',
      pageId: DEFAULT_PAGE.id,
      blockId: 'experienceLeadBlock',
      box: { x: 36, y: 176, width: 540, height: 72 },
      zIndex: 2,
    },
    {
      id: 'experienceSystemsFrame',
      pageId: DEFAULT_PAGE.id,
      blockId: 'experienceSystemsBlock',
      box: { x: 36, y: 256, width: 540, height: 72 },
      zIndex: 3,
    },
    {
      id: 'skillsFrame',
      pageId: DEFAULT_PAGE.id,
      blockId: 'skillsBlock',
      box: { x: 36, y: 352, width: 540, height: 40 },
      zIndex: 4,
    },
  ].filter((frame) => blockIds.includes(frame.blockId));
}

export function createStarterDocument(kind: StarterKind, physics: PhysicsMode): SfrbDocument {
  const content = kind === 'template' ? createTemplateContent() : createBlankContent();

  return parseDocument({
    version: 1,
    metadata: {
      title: content.title,
      locale: 'en-US',
      starter: {
        id: STARTER_IDS[kind],
        kind,
      },
    },
    semantic: {
      sections: content.sections,
      blocks: content.blocks,
    },
    layout: {
      pages: [DEFAULT_PAGE],
      frames: physics === 'design'
        ? createFramesForBlocks(
            content.blocks.map((block) => block.id),
            { blank: kind === 'blank' },
          )
        : [],
    },
  });
}

export function createTemplateStarterDocument(physics: PhysicsMode): SfrbDocument {
  return createStarterDocument('template', physics);
}

export function createBlankStarterDocument(physics: PhysicsMode): SfrbDocument {
  return createStarterDocument('blank', physics);
}

export { STARTER_IDS };
