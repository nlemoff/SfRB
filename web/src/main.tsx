// Editor shell font only — the print/artifact surface (print-main.tsx) stays
// off this import so exported PDFs never depend on the UI font.
import '@fontsource-variable/inter';
import { mountApp } from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Missing #root element for SfRB bridge app.');
}

mountApp(rootElement);
