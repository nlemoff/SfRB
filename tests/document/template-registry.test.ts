import { describe, expect, it } from 'vitest';

import {
  TEMPLATE_IDS,
  templateIdSchema,
  isKnownTemplateId,
} from '../../src/document/templates/registry';

describe('canonical template registry', () => {
  it('always includes the default template id', () => {
    expect(TEMPLATE_IDS).toContain('default');
  });

  it('templateIdSchema accepts every registered id', () => {
    for (const id of TEMPLATE_IDS) {
      expect(templateIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it('templateIdSchema rejects ids that are not in the registry', () => {
    expect(templateIdSchema.safeParse('not-a-template').success).toBe(false);
    expect(templateIdSchema.safeParse('').success).toBe(false);
    expect(templateIdSchema.safeParse(42).success).toBe(false);
  });

  it('isKnownTemplateId narrows arbitrary strings against the registry', () => {
    expect(isKnownTemplateId('default')).toBe(true);
    expect(isKnownTemplateId('not-a-template')).toBe(false);
  });
});
