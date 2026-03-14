import { mountApp } from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Missing #root element for SfRB bridge app.');
}

mountApp(rootElement);
