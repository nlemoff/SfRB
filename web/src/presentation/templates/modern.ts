import { TEMPLATE_VERSIONS } from '../../../../src/document/templates/registry';
import type { Theme } from '../theme';

export const modernTheme: Theme = {
  id: 'modern',
  version: TEMPLATE_VERSIONS.modern,
  typography: {
    rootFontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    rootColor: '#222222',
    blocks: {
      heading: {
        fontSize: '16px',
        fontWeight: '600',
        lineHeight: '1.25',
        marginBottom: '4px',
      },
      paragraph: {
        fontSize: '11px',
        lineHeight: '1.45',
        marginBottom: '4px',
      },
      bullet: {
        fontSize: '11px',
        lineHeight: '1.45',
        paddingLeft: '10px',
        marginBottom: '3px',
      },
      fact: {
        fontSize: '11px',
        lineHeight: '1.45',
        marginBottom: '2px',
      },
    },
  },
  color: {
    pageBackground: '#ffffff',
  },
};
