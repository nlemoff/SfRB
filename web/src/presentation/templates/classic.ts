import { TEMPLATE_VERSIONS } from '../../../../src/document/templates/registry';
import type { Theme } from '../theme';

export const classicTheme: Theme = {
  id: 'classic',
  version: TEMPLATE_VERSIONS.classic,
  typography: {
    rootFontFamily: "'Times New Roman', 'Liberation Serif', Times, serif",
    rootColor: '#0a0a0a',
    blocks: {
      heading: {
        fontSize: '20px',
        fontWeight: 'bold',
        lineHeight: '1.4',
        marginBottom: '6px',
      },
      paragraph: {
        fontSize: '11px',
        lineHeight: '1.6',
        marginBottom: '5px',
      },
      bullet: {
        fontSize: '11px',
        lineHeight: '1.6',
        paddingLeft: '14px',
        marginBottom: '3px',
      },
      fact: {
        fontSize: '11px',
        lineHeight: '1.6',
        marginBottom: '2px',
      },
      divider: {
        fontSize: '11px',
        lineHeight: '1',
        marginBottom: '10px',
      },
    },
  },
  color: {
    pageBackground: '#ffffff',
  },
};
