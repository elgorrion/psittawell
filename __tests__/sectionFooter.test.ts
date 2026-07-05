import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactElement, ReactNode } from 'react';

import { Footer } from '../app/assessment/[id]/section/[sectionId]';

describe('section footer', () => {
  it('renders Previous and Next in one action row', () => {
    const element = Footer({
      assessmentId: 7,
      forwardAction: { kind: 'next', sectionId: 'section_3' },
      onFinishAssessment: jest.fn(),
      previousSectionId: 'section_1',
    }) as ReactElement;

    const actionRow = findByTestId(element, 'section-footer-actions');

    expect(actionRow?.type).toBe(View);
    expect(
      StyleSheet.flatten(
        (actionRow as ReactElement<{ style?: StyleProp<ViewStyle> }>).props.style,
      ).flexDirection,
    ).toBe('row');
    expect(collectDirectPressableLabels(actionRow)).toEqual([
      'Previous section',
      'Next section',
    ]);
  });
});

function findByTestId(
  node: ReactNode,
  testID: string,
): ReactElement<{ children?: ReactNode; testID?: string }> | null {
  if (node === null || node === undefined || typeof node !== 'object') {
    return null;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findByTestId(child, testID);

      if (match) {
        return match;
      }
    }

    return null;
  }

  if ('props' in node) {
    const element = node as ReactElement<{ children?: ReactNode; testID?: string }>;

    if (element.props.testID === testID) {
      return element;
    }

    return findByTestId(element.props.children, testID);
  }

  return null;
}

function collectDirectPressableLabels(
  node: ReactElement<{ children?: ReactNode }> | null,
): string[] {
  if (!node || !('props' in node)) {
    return [];
  }

  return childrenOf(node.props.children).flatMap((child) => {
    if (child && typeof child === 'object' && 'props' in child && child.type === Pressable) {
      const label = (child as ReactElement<{ accessibilityLabel?: string }>).props
        .accessibilityLabel;

      return typeof label === 'string' ? [label] : [];
    }

    return [];
  });
}

function childrenOf(children: ReactNode): ReactNode[] {
  if (children === null || children === undefined || typeof children === 'boolean') {
    return [];
  }

  return Array.isArray(children) ? children : [children];
}
