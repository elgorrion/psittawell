import { Text } from 'react-native';
import type { ReactElement, ReactNode } from 'react';

import { MatrixQuestion } from '../components/questions/MatrixQuestion';
import { psittawelContentPack } from '../content/psittawel';
import type { MatrixQuestion as MatrixQuestionContent } from '../content/schema';

describe('MatrixQuestion', () => {
  it('renders row group labels as visible subheadings', () => {
    const section = psittawelContentPack.sections[6];
    const question = getMatrixQuestion(section.questions[4]);
    const element = MatrixQuestion({
      question,
      indicatorIcon: 'parrot',
      selectedColumnIdForRow: () => null,
      onSelectColumn: jest.fn(),
    }) as ReactElement;

    const text = collectText(element);

    expect(text).toContain('Indicators of a positive relationship');
    expect(text).toContain('Indicators of an inappropriate or problematic relationships');
  });
});

function getMatrixQuestion(
  question: (typeof psittawelContentPack.sections)[number]['questions'][number],
): MatrixQuestionContent {
  if (question.type !== 'matrix') {
    throw new Error(`Question ${question.id} is not a matrix question.`);
  }

  return question;
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
