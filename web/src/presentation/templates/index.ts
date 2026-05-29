import {
  isKnownTemplateId,
  type TemplateId,
} from '../../../../src/document/templates/registry';
import type { Theme } from '../theme';
import { defaultTheme } from './default';

const TEMPLATE_REGISTRY = {
  default: defaultTheme,
} as const satisfies Record<TemplateId, Theme>;

export function getTemplateTheme(id: TemplateId): Theme {
  return TEMPLATE_REGISTRY[id];
}

export function resolveTemplateTheme(id: string | undefined): Theme {
  if (id !== undefined && isKnownTemplateId(id)) {
    return TEMPLATE_REGISTRY[id];
  }
  return defaultTheme;
}
