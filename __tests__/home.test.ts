import { Pressable, Text } from 'react-native';
import type { ReactElement, ReactNode } from 'react';

import {
  AssessmentRow,
  getDatabaseUnavailableMessageKey,
  getFollowUpCtaLabel,
} from '../app/index';
import type { AssessmentSummary } from '../lib/assessments';

describe('home screen helpers', () => {
  it('builds the smart follow-up CTA label from the latest completed assessment', () => {
    expect(getFollowUpCtaLabel('Mango')).toBe("Start Mango's next check");
    expect(getFollowUpCtaLabel(null)).toBe('Start the next check');
  });

  it('uses browser-specific local storage copy on web', () => {
    expect(getDatabaseUnavailableMessageKey('web')).toBe('home.databaseUnavailableWeb');
    expect(getDatabaseUnavailableMessageKey('android')).toBe('home.databaseUnavailable');
    expect(getDatabaseUnavailableMessageKey('ios')).toBe('home.databaseUnavailable');
  });

  it('renders a visible accessible delete button on assessment rows', () => {
    const element = AssessmentRow({
      assessment: assessmentSummary({
        id: 7,
        status: 'completed',
        parrotName: 'Mango',
      }),
      dateFormatter: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }),
      onDeleted: jest.fn(),
      onUnavailable: jest.fn(),
    }) as ReactElement;

    expect(collectText(element)).toContain('Delete');
    expect(collectAccessibilityLabels(element)).toContain('Delete Mango, Completed');
  });
});

function assessmentSummary(input: Partial<AssessmentSummary>): AssessmentSummary {
  return {
    id: 1,
    parrotId: 1,
    instrumentVersion: '1',
    status: 'draft',
    startedAt: '2026-07-04 09:00:00',
    completedAt: null,
    parrotName: null,
    ...input,
  };
}

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

function collectAccessibilityLabels(node: ReactNode): string[] {
  if (node === null || node === undefined || typeof node !== 'object') {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => collectAccessibilityLabels(child));
  }

  if ('props' in node) {
    const element = node as ReactElement<{
      accessibilityLabel?: string;
      children?: ReactNode;
    }>;
    const ownLabels =
      element.type === Pressable && typeof element.props.accessibilityLabel === 'string'
        ? [element.props.accessibilityLabel]
        : [];

    return [...ownLabels, ...collectAccessibilityLabels(element.props.children)];
  }

  return [];
}
