import { TEMPLATE_VERSIONS } from '../../../../src/document/templates/registry';
import type { Theme } from '../theme';

// Refined default: Georgia stays the lead serif (its metrics anchor the
// export-readiness expectations of the sample workspaces), with a clearer
// heading hierarchy, slightly larger body text, and ink-toned color.
export const defaultTheme: Theme = {
  id: 'default',
  version: TEMPLATE_VERSIONS.default,
  typography: {
    rootFontFamily: "'Georgia', 'Charter', 'Times New Roman', serif",
    rootColor: '#1d2733',
    blocks: {
      heading: {
        fontSize: '19px',
        fontWeight: '700',
        lineHeight: '1.25',
        letterSpacing: '-0.01em',
        marginBottom: '5px',
      },
      paragraph: {
        fontSize: '12.5px',
        lineHeight: '1.55',
        marginBottom: '5px',
      },
      bullet: {
        fontSize: '12.5px',
        lineHeight: '1.55',
        paddingLeft: '14px',
        marginBottom: '5px',
      },
      fact: {
        fontSize: '12.5px',
        lineHeight: '1.5',
        letterSpacing: '0.01em',
        marginBottom: '3px',
      },
      divider: {
        fontSize: '12px',
        lineHeight: '1',
        marginBottom: '10px',
      },
    },
  },
  color: {
    pageBackground: '#ffffff',
  },
};
