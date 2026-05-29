import { describe, expect, it } from 'vitest';

import { parseDocument } from '../../src/document/schema';

function createBaseDocument() {
  return {
    metadata: {
      title: 'Template Schema Doc',
      locale: 'en-US',
    },
    semantic: {
      sections: [
        {
          id: 'summary',
          title: 'Summary',
          blockIds: ['summary-block'],
        },
      ],
      blocks: [
        {
          id: 'summary-block',
          kind: 'paragraph' as const,
          text: 'Schema-level template metadata is optional.',
        },
      ],
    },
    layout: {
      pages: [
        {
          id: 'page-1',
          size: { width: 612, height: 792 },
          margin: { top: 48, right: 48, bottom: 48, left: 48 },
        },
      ],
      frames: [
        {
          id: 'frame-summary',
          pageId: 'page-1',
          blockId: 'summary-block',
          box: { x: 48, y: 72, width: 516, height: 96 },
          zIndex: 0,
        },
      ],
    },
  };
}

describe('document schema metadata.template', () => {
  it('parses a document with no template field for back-compat with M001/M002 workspaces', () => {
    const result = parseDocument(createBaseDocument());
    expect(result.metadata.template).toBeUndefined();
  });

  it('parses a document with a known template id and version', () => {
    const input = createBaseDocument();
    const withTemplate = {
      ...input,
      metadata: { ...input.metadata, template: { id: 'default', version: '1' } },
    };

    const result = parseDocument(withTemplate);
    expect(result.metadata.template).toEqual({ id: 'default', version: '1' });
  });

  it('rejects unknown template ids at the schema boundary', () => {
    const input = createBaseDocument();
    const withUnknown = {
      ...input,
      metadata: { ...input.metadata, template: { id: 'classic-pro', version: '1' } },
    };

    expect(() => parseDocument(withUnknown)).toThrowError(/template/i);
  });

  it('rejects unrecognized keys on the template object via strictObject', () => {
    const input = createBaseDocument();
    const withExtra = {
      ...input,
      metadata: {
        ...input.metadata,
        template: { id: 'default', version: '1', author: 'someone' },
      },
    };

    expect(() => parseDocument(withExtra)).toThrowError(/unrecognized key/i);
  });

  it('rejects an empty template version string', () => {
    const input = createBaseDocument();
    const withEmptyVersion = {
      ...input,
      metadata: { ...input.metadata, template: { id: 'default', version: '' } },
    };

    expect(() => parseDocument(withEmptyVersion)).toThrowError(/version/i);
  });

  it('rejects a template object that omits the version field', () => {
    const input = createBaseDocument();
    const withoutVersion = {
      ...input,
      metadata: { ...input.metadata, template: { id: 'default' } },
    };

    expect(() => parseDocument(withoutVersion)).toThrowError(/version/i);
  });
});
