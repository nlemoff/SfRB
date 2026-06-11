import { describe, expect, it } from 'vitest';

import { TEMPLATE_IDS } from '../../src/document/templates/registry';
import { contrastRatio, parseHexColor } from '../../web/src/presentation/contrast';
import { getTemplateTheme } from '../../web/src/presentation/templates';

const WCAG_AA_NORMAL_TEXT = 4.5;

describe('template contrast gate', () => {
  it('keeps every registered theme readable at WCAG AA for normal text', () => {
    for (const id of TEMPLATE_IDS) {
      const theme = getTemplateTheme(id);
      const ratio = contrastRatio(theme.typography.rootColor, theme.color.pageBackground);
      expect(ratio, `Theme "${id}" rootColor vs pageBackground`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    }
  });

  it('parses the color formats themes are allowed to use', () => {
    expect(parseHexColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor('#000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(() => parseHexColor('rgb(0, 0, 0)')).toThrowError(/Cannot parse hex color/);
  });

  it('computes the canonical WCAG extremes', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });
});
