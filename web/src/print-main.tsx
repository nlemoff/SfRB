import { mountPrintSurface, type PrintSurfaceMode } from './presentation/print-surface';

function resolvePrintSurfaceMode(search: string): PrintSurfaceMode {
  const params = new URLSearchParams(search);
  return params.get('mode') === 'artifact' ? 'artifact' : 'preview';
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Missing #root element for SfRB print surface.');
}

mountPrintSurface(rootElement, {
  mode: resolvePrintSurfaceMode(window.location.search),
});

export { resolvePrintSurfaceMode };
