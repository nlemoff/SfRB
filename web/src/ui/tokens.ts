// Shared design tokens for the editor shell, canvas chrome, and the print
// preview surface. The print surface is a separate document that never loads
// the shell stylesheet, so these JS constants are the single source of truth;
// rootTokensCss() mirrors them as CSS custom properties for stylesheets and
// inline styles in the shell document.
export const palette = {
  ink: '#1d2733',
  inkSoft: '#4a5a6a',
  inkFaint: '#8294a5',
  paper: '#fbfaf7',
  panel: '#ffffff',
  line: '#dfe5ea',
  lineSoft: '#ecf0f3',
  desk: '#eceef0',
  accent: '#1f6feb',
  accentSoft: '#e7f0fe',
  good: '#1a7f37',
  goodSoft: '#e6f4ea',
  warn: '#9a6700',
  warnSoft: '#fff8e1',
  bad: '#cf222e',
  badSoft: '#ffebe9',
  defer: '#6e40c9',
  deferSoft: '#f3eefc',
} as const;

export const typeScale = {
  xs: '12px',
  sm: '13px',
  md: '15px',
  lg: '19px',
  xl: '24px',
} as const;

export const radius = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  pill: '999px',
} as const;

export const shadow = {
  e1: '0 1px 2px rgba(29, 39, 51, 0.06)',
  e2: '0 1px 2px rgba(29, 39, 51, 0.08), 0 8px 24px rgba(29, 39, 51, 0.1)',
  e3: '0 12px 28px rgba(29, 39, 51, 0.16), 0 32px 80px rgba(29, 39, 51, 0.18)',
} as const;

export const motion = {
  fast: '120ms',
  base: '160ms',
  slow: '200ms',
  ease: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
} as const;

export const fonts = {
  sans: "'Inter Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace",
} as const;

export function rootTokensCss(): string {
  return `
  :root {
    --sfrb-ink: ${palette.ink};
    --sfrb-ink-soft: ${palette.inkSoft};
    --sfrb-ink-faint: ${palette.inkFaint};
    --sfrb-paper: ${palette.paper};
    --sfrb-panel: ${palette.panel};
    --sfrb-line: ${palette.line};
    --sfrb-line-soft: ${palette.lineSoft};
    --sfrb-desk: ${palette.desk};
    --sfrb-accent: ${palette.accent};
    --sfrb-accent-soft: ${palette.accentSoft};
    --sfrb-good: ${palette.good};
    --sfrb-good-soft: ${palette.goodSoft};
    --sfrb-warn: ${palette.warn};
    --sfrb-warn-soft: ${palette.warnSoft};
    --sfrb-bad: ${palette.bad};
    --sfrb-bad-soft: ${palette.badSoft};
    --sfrb-defer: ${palette.defer};
    --sfrb-defer-soft: ${palette.deferSoft};
    --sfrb-type-xs: ${typeScale.xs};
    --sfrb-type-sm: ${typeScale.sm};
    --sfrb-type-md: ${typeScale.md};
    --sfrb-type-lg: ${typeScale.lg};
    --sfrb-type-xl: ${typeScale.xl};
    --sfrb-radius-sm: ${radius.sm};
    --sfrb-radius-md: ${radius.md};
    --sfrb-radius-lg: ${radius.lg};
    --sfrb-radius-pill: ${radius.pill};
    --sfrb-shadow-e1: ${shadow.e1};
    --sfrb-shadow-e2: ${shadow.e2};
    --sfrb-shadow-e3: ${shadow.e3};
    --sfrb-dur-fast: ${motion.fast};
    --sfrb-dur-base: ${motion.base};
    --sfrb-dur-slow: ${motion.slow};
    --sfrb-ease: ${motion.ease};
    --sfrb-font-sans: ${fonts.sans};
    --sfrb-font-mono: ${fonts.mono};
  }
`;
}

export function motionOK(): boolean {
  return window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
}
