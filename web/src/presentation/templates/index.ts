import { isKnownTemplateId, type TemplateId } from '../../../../src/document/templates/registry';
import type { Theme } from '../theme';
import { classicTheme } from './classic';
import { defaultTheme } from './default';
import { modernTheme } from './modern';

const TEMPLATE_REGISTRY = {
  default: defaultTheme,
  classic: classicTheme,
  modern: modernTheme,
} as const satisfies Record<TemplateId, Theme>;

export function listTemplateThemes(): readonly Theme[] {
  return Object.freeze([defaultTheme, classicTheme, modernTheme]);
}

export function getTemplateTheme(id: TemplateId): Theme {
  return TEMPLATE_REGISTRY[id];
}

export function resolveTemplateTheme(id: string | undefined): Theme {
  if (id !== undefined && isKnownTemplateId(id)) {
    return TEMPLATE_REGISTRY[id];
  }
  return defaultTheme;
}
