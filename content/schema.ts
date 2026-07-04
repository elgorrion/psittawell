export const welfareLevels = [
  'optimal',
  'good',
  'moderate',
  'elevated_risk',
  'high_risk',
] as const;

export const optionFlags = [
  'dont_know',
  'vet_concern',
  'vet_urgent',
  'behaviour_urgent',
  'context_dependent',
] as const;

export const indicatorIcons = ['circle', 'parrot', 'house', 'hand'] as const;
export const conditionalOperators = ['equals', 'not_equals', 'in', 'not_in'] as const;

export type WelfareLevel = (typeof welfareLevels)[number];
export type OptionFlag = (typeof optionFlags)[number];
export type IndicatorIcon = (typeof indicatorIcons)[number];
export type ConditionalOperator = (typeof conditionalOperators)[number];

export type ContentPack = {
  instrument: string;
  instrument_version: string;
  source: {
    citation: string;
    doi: string;
    url: string;
    content_licence: string;
  };
  sections: Section[];
};

export type Section = {
  id: string;
  number: number;
  title: string;
  indicator_icon: IndicatorIcon;
  interpretation: string;
  questions: Question[];
};

export type ConditionalOn = {
  question_id: string;
  operator: ConditionalOperator;
  option_ids: string[];
};

export type BaseQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  help?: string | null;
  image_ref?: string | null;
  demographic: boolean;
  conditional_on?: ConditionalOn | null;
  indicator_icon?: IndicatorIcon;
};

export type QuestionType =
  | 'free_text'
  | 'single_choice'
  | 'multi_choice'
  | 'yes_no'
  | 'scale'
  | 'matrix';

export type FreeTextQuestion = BaseQuestion & {
  type: 'free_text';
  input: {
    multiline: boolean;
    keyboard: 'default' | 'numeric';
  };
};

export type SingleChoiceQuestion = BaseQuestion & {
  type: 'single_choice';
  options: Option[];
};

export type MultiChoiceQuestion = BaseQuestion & {
  type: 'multi_choice';
  options: Option[];
};

export type YesNoQuestion = BaseQuestion & {
  type: 'yes_no';
  options: Option[];
};

export type ScaleQuestion = BaseQuestion & {
  type: 'scale';
  options: Option[];
};

export type ChoiceQuestion =
  | SingleChoiceQuestion
  | MultiChoiceQuestion
  | YesNoQuestion
  | ScaleQuestion;

export type MatrixQuestion = BaseQuestion & {
  type: 'matrix';
  row_groups: RowGroup[];
};

export type Question = FreeTextQuestion | ChoiceQuestion | MatrixQuestion;

export type Option = {
  id: string;
  label: string | number;
  detail?: string | null;
  image_ref?: string | null;
  welfare_level: WelfareLevel | null;
  flags: OptionFlag[];
  allow_text: boolean;
};

export type RowGroup = {
  columns: Column[];
  rows: Row[];
};

export type Column = {
  id: string;
  label: string;
  welfare_level: WelfareLevel | null;
  flags: OptionFlag[];
  icon?: IndicatorIcon;
};

export type Row = {
  id: string;
  label: string;
  help?: string | null;
  image_ref?: string | null;
};

export function validateContentPack(pack: ContentPack): void {
  const sectionIds = new Set<string>();
  const questionIds = new Set<string>();
  const optionIds = new Set<string>();
  const questionOptions = new Map<string, Set<string>>();

  if (!Array.isArray(pack.sections) || pack.sections.length === 0) {
    throw new Error('Content pack must include at least one section.');
  }

  for (const section of pack.sections) {
    assertUnique(sectionIds, section.id, 'section');
    assertEnum(section.indicator_icon, indicatorIcons, `section ${section.id} indicator_icon`);

    if (!Array.isArray(section.questions) || section.questions.length === 0) {
      throw new Error(`Section ${section.id} must include at least one question.`);
    }

    for (const question of section.questions) {
      assertUnique(questionIds, question.id, 'question');
      assertEnum(question.type, questionTypes, `question ${question.id} type`);

      if (question.indicator_icon !== undefined) {
        assertEnum(question.indicator_icon, indicatorIcons, `question ${question.id} indicator_icon`);
      }

      if (question.type === 'free_text') {
        assertEnum(question.input.keyboard, inputKeyboards, `question ${question.id} input keyboard`);
        continue;
      }

      if (question.type === 'matrix') {
        validateMatrixQuestion(question);
        continue;
      }

      validateChoiceQuestion(question, optionIds, questionOptions);
    }
  }

  for (const section of pack.sections) {
    for (const question of section.questions) {
      const conditionalOn = question.conditional_on;

      if (!conditionalOn) {
        continue;
      }

      assertEnum(
        conditionalOn.operator,
        conditionalOperators,
        `question ${question.id} conditional_on operator`,
      );

      if (!Array.isArray(conditionalOn.option_ids) || conditionalOn.option_ids.length === 0) {
        throw new Error(`Question ${question.id} conditional_on must include option_ids.`);
      }

      if (
        (conditionalOn.operator === 'equals' || conditionalOn.operator === 'not_equals') &&
        conditionalOn.option_ids.length !== 1
      ) {
        throw new Error(
          `Question ${question.id} conditional_on ${conditionalOn.operator} must reference exactly one option.`,
        );
      }

      const options = questionOptions.get(conditionalOn.question_id);

      if (!questionIds.has(conditionalOn.question_id) || !options) {
        throw new Error(
          `Question ${question.id} conditional_on references missing question ${conditionalOn.question_id}.`,
        );
      }

      for (const optionId of conditionalOn.option_ids) {
        if (!options.has(optionId)) {
          throw new Error(
            `Question ${question.id} conditional_on references missing option ${optionId}.`,
          );
        }
      }
    }
  }
}

const questionTypes = ['free_text', 'single_choice', 'multi_choice', 'yes_no', 'scale', 'matrix'] as const;
const inputKeyboards = ['default', 'numeric'] as const;

function validateChoiceQuestion(
  question: ChoiceQuestion,
  optionIds: Set<string>,
  questionOptions: Map<string, Set<string>>,
) {
  if (!Array.isArray(question.options) || question.options.length === 0) {
    throw new Error(`Question ${question.id} must include at least one option.`);
  }

  if (question.type === 'yes_no' && question.options.length !== 2 && question.options.length !== 3) {
    throw new Error(`Question ${question.id} yes_no must include two or three options.`);
  }

  const idsForQuestion = new Set<string>();

  for (const option of question.options) {
    assertUnique(optionIds, option.id, 'option');
    assertUnique(idsForQuestion, option.id, `option for question ${question.id}`);
    validateWelfareLevel(option.welfare_level, `option ${option.id} welfare_level`);
    validateFlags(option.flags, `option ${option.id} flags`);
  }

  questionOptions.set(question.id, idsForQuestion);
}

function validateMatrixQuestion(question: MatrixQuestion) {
  if (!Array.isArray(question.row_groups) || question.row_groups.length === 0) {
    throw new Error(`Question ${question.id} must include at least one row group.`);
  }

  const columnIds = new Set<string>();
  const rowIds = new Set<string>();

  for (const [groupIndex, rowGroup] of question.row_groups.entries()) {
    if (!Array.isArray(rowGroup.columns) || rowGroup.columns.length === 0) {
      throw new Error(`Question ${question.id} row group ${groupIndex + 1} must include columns.`);
    }

    if (!Array.isArray(rowGroup.rows) || rowGroup.rows.length === 0) {
      throw new Error(`Question ${question.id} row group ${groupIndex + 1} must include rows.`);
    }

    for (const column of rowGroup.columns) {
      assertUnique(columnIds, column.id, `column for question ${question.id}`);
      validateWelfareLevel(column.welfare_level, `column ${column.id} welfare_level`);
      validateFlags(column.flags, `column ${column.id} flags`);

      if (column.icon !== undefined) {
        assertEnum(column.icon, indicatorIcons, `column ${column.id} icon`);
      }
    }

    for (const row of rowGroup.rows) {
      assertUnique(rowIds, row.id, `row for question ${question.id}`);
    }
  }
}

function validateWelfareLevel(value: WelfareLevel | null, name: string) {
  if (value === null) {
    return;
  }

  assertEnum(value, welfareLevels, name);
}

function validateFlags(flags: OptionFlag[], name: string) {
  if (!Array.isArray(flags)) {
    throw new Error(`${name} must be an array.`);
  }

  for (const flag of flags) {
    assertEnum(flag, optionFlags, name);
  }
}

function assertUnique(values: Set<string>, value: string, name: string) {
  if (values.has(value)) {
    throw new Error(`Duplicate ${name} id: ${value}.`);
  }

  values.add(value);
}

function assertEnum<TValue extends string>(
  value: string,
  allowedValues: readonly TValue[],
  name: string,
) {
  if (!allowedValues.includes(value as TValue)) {
    throw new Error(`Unknown ${name}: ${value}.`);
  }
}
