export const canvasShellStyles = [
  'display: grid',
].join('; ');

export const pageStyles = [
  'display: grid',
  'gap: 24px',
  'color: var(--sfrb-ink)',
  // The canvas is a document surface with its own serif, independent of the
  // sans-serif shell chrome. Times New Roman specifically: overflow
  // measurement expectations across tests and smoke verifiers are tuned to
  // its text metrics.
  "font-family: 'Times New Roman', Times, serif",
].join('; ');

export const documentBlockStyles = [
  'padding: 12px 14px',
  'border-radius: var(--sfrb-radius-md)',
  'border: 1px solid var(--sfrb-line-soft)',
  'background: #ffffff',
  'cursor: text',
].join('; ');

export const selectedDocumentBlockStyles = `${documentBlockStyles}; border-color: var(--sfrb-accent); box-shadow: 0 0 0 3px var(--sfrb-accent-soft);`;
export const editingDocumentBlockStyles = `${selectedDocumentBlockStyles}; background: var(--sfrb-accent-soft);`;

// Wrapper around a design page: a quiet label row plus the paper itself.
export const pageWrapperStyles = [
  'display: grid',
  'gap: 6px',
  'width: fit-content',
].join('; ');

// Paper chrome shared by the tile and freeform page canvases: white sheet,
// hairline edge, soft elevation. Geometry (width/height) stays caller-owned.
export const designPaperChromeStyles = [
  'background: #ffffff',
  'border-radius: var(--sfrb-radius-sm)',
  'box-shadow: var(--sfrb-shadow-e2), 0 0 0 1px var(--sfrb-line)',
].join('; ');

export const designFrameBaseStyles = [
  'position: absolute',
  'box-sizing: border-box',
  'padding: 6px 4px',
  'border-radius: 4px',
  'border: 1px solid rgba(130, 148, 165, 0.4)',
  'background: rgba(255, 255, 255, 0.92)',
  'overflow: hidden',
].join('; ');

export const selectedDesignFrameStyles = `${designFrameBaseStyles}; border-color: var(--sfrb-accent); box-shadow: 0 0 0 3px var(--sfrb-accent-soft);`;
export const editingDesignFrameStyles = `${selectedDesignFrameStyles}; background: var(--sfrb-accent-soft);`;
