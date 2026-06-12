export const canvasShellStyles = [
  'display: grid',
  'gap: 18px',
].join('; ');

export const canvasStatusStyles = [
  'display: grid',
  'grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))',
  'gap: 16px',
  'padding: 18px 20px',
  'border-radius: 18px',
  'background: rgba(15, 23, 42, 0.04)',
  'border: 1px solid rgba(148, 163, 184, 0.24)',
].join('; ');

export const pageStyles = [
  'padding: 28px',
  'border-radius: 24px',
  'background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96))',
  'color: #0f172a',
  'box-shadow: 0 18px 60px rgba(15, 23, 42, 0.12)',
  'display: grid',
  'gap: 24px',
  // The canvas is a document surface with its own serif, independent of the
  // sans-serif shell chrome. Times New Roman specifically: overflow
  // measurement expectations across tests and smoke verifiers are tuned to
  // its text metrics.
  "font-family: 'Times New Roman', Times, serif",
].join('; ');

export const documentBlockStyles = [
  'padding: 16px 18px',
  'border-radius: 18px',
  'border: 1px solid rgba(148, 163, 184, 0.22)',
  'background: rgba(255, 255, 255, 0.88)',
  'cursor: text',
  'transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease',
].join('; ');

export const selectedDocumentBlockStyles = `${documentBlockStyles}; border-color: rgba(59, 130, 246, 0.65); box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2); transform: translateY(-1px);`;
export const editingDocumentBlockStyles = `${selectedDocumentBlockStyles}; background: rgba(239, 246, 255, 0.96);`;

export const designPageStyles = [
  'position: relative',
  'width: fit-content',
  'padding: 22px',
  'border-radius: 24px',
  'background: rgba(255, 255, 255, 0.92)',
  'box-shadow: 0 16px 50px rgba(15, 23, 42, 0.14)',
].join('; ');

export const designFrameBaseStyles = [
  'position: absolute',
  'box-sizing: border-box',
  'padding: 6px 4px',
  'border-radius: 10px',
  'border: 1px solid rgba(148, 163, 184, 0.45)',
  'background: rgba(255, 255, 255, 0.92)',
  'box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06)',
  'overflow: hidden',
  'transition: box-shadow 120ms ease, border-color 120ms ease',
].join('; ');

export const selectedDesignFrameStyles = `${designFrameBaseStyles}; border-color: rgba(37, 99, 235, 0.72); box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.26), 0 16px 36px rgba(15, 23, 42, 0.18);`;
export const editingDesignFrameStyles = `${selectedDesignFrameStyles}; background: rgba(239, 246, 255, 0.95);`;
