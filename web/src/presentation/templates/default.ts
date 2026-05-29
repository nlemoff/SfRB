import { TEMPLATE_VERSIONS } from '../../../../src/document/templates/registry';
import type { Theme } from '../theme';

export const defaultTheme: Theme = {
  id: 'default',
  version: TEMPLATE_VERSIONS.default,
  typography: {
    rootFontFamily: "'Georgia', 'Times New Roman', serif",
    rootColor: '#1a1a1a',
    blocks: {
      heading: {
        fontSize: '18px',
        fontWeight: 'bold',
        lineHeight: '1.3',
        marginBottom: '4px',
      },
      paragraph: {
        fontSize: '12px',
        lineHeight: '1.5',
        marginBottom: '4px',
      },
      bullet: {
        fontSize: '12px',
        lineHeight: '1.5',
        paddingLeft: '12px',
        marginBottom: '4px',
      },
      fact: {
        fontSize: '12px',
        lineHeight: '1.5',
        marginBottom: '2px',
      },
    },
  },
  color: {
    pageBackground: '#ffffff',
  },
};
