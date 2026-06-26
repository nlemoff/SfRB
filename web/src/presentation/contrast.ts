export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export function parseHexColor(hex: string): RgbColor {
  const normalized = hex.trim().replace(/^#/u, '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/u.test(expanded)) {
    throw new Error(`Cannot parse hex color "${hex}"`);
  }

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function channelLuminance(channel: number): number {
  const scaled = channel / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: RgbColor): number {
  return 0.2126 * channelLuminance(color.r) + 0.7152 * channelLuminance(color.g) + 0.0722 * channelLuminance(color.b);
}

// WCAG 2.x contrast ratio: (L1 + 0.05) / (L2 + 0.05) with L1 the lighter.
export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(parseHexColor(foreground));
  const second = relativeLuminance(parseHexColor(background));
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}
