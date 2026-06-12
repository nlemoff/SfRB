import type { SemanticBlockKind } from '../../../src/document/schema';
import type { TemplateId } from '../../../src/document/templates/registry';

export type { SemanticBlockKind };

export type BlockStyle = {
  readonly fontSize: string;
  readonly fontWeight?: string;
  readonly lineHeight: string;
  readonly letterSpacing?: string;
  readonly paddingLeft?: string;
  readonly marginBottom: string;
};

export type Theme = {
  readonly id: TemplateId;
  readonly version: string;
  readonly typography: {
    readonly rootFontFamily: string;
    readonly rootColor: string;
    readonly blocks: Readonly<Record<SemanticBlockKind, BlockStyle>>;
  };
  readonly color: {
    readonly pageBackground: string;
  };
};

export function applyBlockStyle(element: HTMLElement, style: BlockStyle): void {
  element.style.fontSize = style.fontSize;
  element.style.lineHeight = style.lineHeight;
  element.style.marginBottom = style.marginBottom;
  if (style.fontWeight !== undefined) {
    element.style.fontWeight = style.fontWeight;
  }
  if (style.letterSpacing !== undefined) {
    element.style.letterSpacing = style.letterSpacing;
  }
  if (style.paddingLeft !== undefined) {
    element.style.paddingLeft = style.paddingLeft;
  }
}
