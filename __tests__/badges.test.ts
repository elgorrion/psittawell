import type { ReactElement, ReactNode } from 'react';
import { Text } from 'react-native';

import { FlagBadge, flagGlyphs, withFlagGlyph } from '../components/questions/Badges';

describe('flag badges', () => {
  it('composes the dont_know glyph with the translated chip text', () => {
    const glyph = flagGlyphs.dont_know;
    const element = FlagBadge({ flag: 'dont_know' }) as ReactElement;

    expect(withFlagGlyph('dont_know', 'Observe')).toBe(`${glyph} Observe`);
    expect(withFlagGlyph('vet_concern', 'Vet')).toBe('Vet');
    expect(collectText(element)).toContain(`${glyph} Observe`);
  });
});


function collectText(node: ReactNode): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return [];
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return [String(node)];
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => collectText(child));
  }

  if (typeof node === 'object' && 'props' in node) {
    const element = node as ReactElement<{ children?: ReactNode }>;
    const ownText =
      element.type === Text && typeof element.props.children === 'string'
        ? [element.props.children]
        : [];

    return [...ownText, ...collectText(element.props.children)];
  }

  return [];
}
