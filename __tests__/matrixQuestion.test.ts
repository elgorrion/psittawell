import { Text } from 'react-native';
import type { ReactElement, ReactNode } from 'react';

import { GridQuestion } from '../components/questions/GridQuestion';
import { MatrixQuestion } from '../components/questions/MatrixQuestion';
import { MultiChoiceQuestion } from '../components/questions/MultiChoiceQuestion';
import { psittawelContentPack } from '../content/psittawel';
import type {
  GridQuestion as GridQuestionContent,
  MatrixQuestion as MatrixQuestionContent,
  MultiChoiceQuestion as MultiChoiceQuestionContent,
} from '../content/schema';

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

  it('renders matrix column help once above the rows', () => {
    const section = psittawelContentPack.sections[3];
    const question = getMatrixQuestion(section.questions[1]);
    const element = MatrixQuestion({
      question,
      indicatorIcon: 'parrot',
      selectedColumnIdForRow: () => null,
      onSelectColumn: jest.fn(),
    }) as ReactElement;

    const text = collectText(element);

    expect(countText(text, 'A')).toBeGreaterThan(1);
    expect(
      countText(
        text,
        'Frequently and repeatedly uses the enrichment, explores and/or manipulates it extensively',
      ),
    ).toBe(1);
    expect(
      countText(
        text,
        'Occasionally interacts with the enrichment, explores and/or manipulates it briefly but ignores it at other times',
      ),
    ).toBe(1);
    expect(
      countText(
        text,
        'Does not use or interact with the enrichment at all, either ignoring it completely or actively avoiding it',
      ),
    ).toBe(1);
    expect(countText(text, "I don't know")).toBe(1);
  });
});

describe('GridQuestion', () => {
  it('renders grid column help once above the rows', () => {
    const section = psittawelContentPack.sections[2];
    const question = getGridQuestion(section.questions[0]);
    const element = GridQuestion({
      question,
      indicatorIcon: 'house',
      selectedColumnIdsForRow: () => [],
      selectedColumnIdForGroup: () => null,
      rowTextForRow: () => '',
      onToggleColumn: jest.fn(),
      onSelectColumn: jest.fn(),
      onChangeRowText: jest.fn(),
    }) as ReactElement;

    const text = collectText(element);

    expect(countText(text, 'space where the parrot stays most of time')).toBe(1);
    expect(countText(text, 'additional space(s) used occasionally')).toBe(1);
  });

  it('renders a check mark for selected multi-grid checkboxes', () => {
    const section = psittawelContentPack.sections[2];
    const question = getGridQuestion(section.questions[0]);
    const element = GridQuestion({
      question,
      indicatorIcon: 'house',
      selectedColumnIdsForRow: (rowId) =>
        rowId === 'row_s3_location_living_room' ? ['col_s3_location_main'] : [],
      selectedColumnIdForGroup: () => null,
      rowTextForRow: () => '',
      onToggleColumn: jest.fn(),
      onSelectColumn: jest.fn(),
      onChangeRowText: jest.fn(),
    }) as ReactElement;

    expect(countText(collectText(element), '✓')).toBe(1);
  });
});

describe('MultiChoiceQuestion', () => {
  it('renders a check mark for selected options', () => {
    const section = psittawelContentPack.sections[2];
    const question = getMultiChoiceQuestion(section.questions[2]);
    const element = MultiChoiceQuestion({
      question,
      indicatorIcon: 'house',
      selectedOptionIds: [question.options[0].id],
      optionText: '',
      onToggleOption: jest.fn(),
      onChangeOptionText: jest.fn(),
    }) as ReactElement;

    expect(countText(collectText(element), '✓')).toBe(1);
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

function getGridQuestion(
  question: (typeof psittawelContentPack.sections)[number]['questions'][number],
): GridQuestionContent {
  if (question.type !== 'grid') {
    throw new Error(`Question ${question.id} is not a grid question.`);
  }

  return question;
}

function getMultiChoiceQuestion(
  question: (typeof psittawelContentPack.sections)[number]['questions'][number],
): MultiChoiceQuestionContent {
  if (question.type !== 'multi_choice') {
    throw new Error(`Question ${question.id} is not a multi-choice question.`);
  }

  return question;
}

function countText(text: string[], value: string): number {
  return text.filter((item) => item === value).length;
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
    if (element.type === Text && typeof element.props.children === 'string') {
      return [element.props.children];
    }

    if (typeof element.type === 'function' && shouldRenderFunctionComponent(element.type.name)) {
      const component = element.type as (props: typeof element.props) => ReactNode;
      return collectText(component(element.props));
    }

    return collectText(element.props.children);
  }

  return [];
}

function shouldRenderFunctionComponent(name: string): boolean {
  return ['MatrixRow', 'GridRowCard', 'ColumnGroupOptions', 'GridColumnOption'].includes(name);
}
