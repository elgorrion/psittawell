import type {
  ChoiceQuestion,
  Column,
  ColumnGroup,
  GridQuestion,
  GridRow,
  MatrixQuestion,
  Option,
  OptionFlag,
  Question,
  Row,
  RowGroup,
  Section,
  WelfareLevel,
} from '../content/schema';
import {
  countAnsweredVisibleQuestions,
  getGridGroupAnswerQuestionId,
  getGridRowAnswerQuestionId,
  getMatrixRowAnswerQuestionId,
  mapAnswersByQuestion,
  type Answer,
  type AnswerLookup,
} from './assessments';
import { isQuestionVisible } from './conditionals';

export type UrgentFlag = Extract<
  OptionFlag,
  'vet_urgent' | 'behaviour_urgent' | 'vet_concern'
>;
export type ObserveFlag = Extract<OptionFlag, 'dont_know' | 'context_dependent'>;

export type UrgentItem = {
  sectionId: string;
  sectionTitle: string;
  questionId: string;
  questionPrompt: string;
  rowLabel?: string;
  optionLabel: string;
  flags: UrgentFlag[];
};

export type AttentionItem = {
  questionId: string;
  questionPrompt: string;
  rowLabel?: string;
  optionLabel: string;
  welfareLevel: WelfareLevel;
};

export type SectionAttention = {
  sectionId: string;
  sectionTitle: string;
  items: AttentionItem[];
};

export type ObserveItem = {
  sectionId: string;
  sectionTitle: string;
  questionId: string;
  questionPrompt: string;
  rowLabel?: string;
  optionLabel: string;
  flag: ObserveFlag;
};

export type ReviewedSection = {
  sectionId: string;
  sectionTitle: string;
};

export type ResultIndicator = {
  indicatorId: string;
  sectionId: string;
  sectionTitle: string;
  questionId: string;
  questionPrompt: string;
  rowLabel?: string;
  optionLabel: string;
  welfareLevel: WelfareLevel | null;
  flags: OptionFlag[];
};

export type AssessmentResults = {
  urgent: UrgentItem[];
  attention: SectionAttention[];
  observe: ObserveItem[];
  indicators: ResultIndicator[];
  sectionsReviewed: ReviewedSection[];
};

type ResolvedSelection = {
  indicatorId: string;
  questionId: string;
  questionPrompt: string;
  rowLabel?: string;
  optionLabel: string;
  welfareLevel: WelfareLevel | null;
  flags: OptionFlag[];
};

const urgentFlagOrder = ['vet_urgent', 'behaviour_urgent', 'vet_concern'] as const;
const observeFlagOrder = ['dont_know', 'context_dependent'] as const;
const attentionLevels = new Set<WelfareLevel>([
  'moderate',
  'elevated_risk',
  'high_risk',
]);

export function buildAssessmentResults(
  sections: readonly Section[],
  answers: readonly Answer[],
): AssessmentResults {
  const answersByQuestion = mapAnswersByQuestion(answers);
  const urgent: UrgentItem[] = [];
  const observe: ObserveItem[] = [];
  const attention: SectionAttention[] = [];
  const indicators: ResultIndicator[] = [];

  for (const section of sections) {
    const sectionItems: AttentionItem[] = [];

    for (const question of section.questions) {
      if (!isQuestionVisible(question, answersByQuestion)) {
        continue;
      }

      for (const selection of resolveQuestionSelections(question, answersByQuestion)) {
        const flags = uniqueFlags(question.flags, selection.flags);
        indicators.push({
          indicatorId: selection.indicatorId,
          sectionId: section.id,
          sectionTitle: section.title,
          questionId: selection.questionId,
          questionPrompt: selection.questionPrompt,
          rowLabel: selection.rowLabel,
          optionLabel: selection.optionLabel,
          welfareLevel: selection.welfareLevel,
          flags,
        });
        const urgentFlags = urgentFlagOrder.filter((flag) => flags.includes(flag));

        if (urgentFlags.length > 0) {
          urgent.push({
            sectionId: section.id,
            sectionTitle: section.title,
            questionId: selection.questionId,
            questionPrompt: selection.questionPrompt,
            rowLabel: selection.rowLabel,
            optionLabel: selection.optionLabel,
            flags: urgentFlags,
          });
        }

        for (const flag of flags) {
          if (isObserveFlag(flag)) {
            observe.push({
              sectionId: section.id,
              sectionTitle: section.title,
              questionId: selection.questionId,
              questionPrompt: selection.questionPrompt,
              rowLabel: selection.rowLabel,
              optionLabel: selection.optionLabel,
              flag,
            });
          }
        }

        if (selection.welfareLevel !== null && attentionLevels.has(selection.welfareLevel)) {
          sectionItems.push({
            questionId: selection.questionId,
            questionPrompt: selection.questionPrompt,
            rowLabel: selection.rowLabel,
            optionLabel: selection.optionLabel,
            welfareLevel: selection.welfareLevel,
          });
        }
      }
    }

    if (sectionItems.length > 0) {
      attention.push({
        sectionId: section.id,
        sectionTitle: section.title,
        items: sectionItems,
      });
    }
  }

  return {
    urgent: orderUrgentBySeverity(urgent),
    attention,
    observe: orderByFlag(observe, observeFlagOrder),
    indicators,
    sectionsReviewed: sections
      .filter((section) => countAnsweredVisibleQuestions(section, answersByQuestion).answered > 0)
      .map((section) => ({
        sectionId: section.id,
        sectionTitle: section.title,
      })),
  };
}

function resolveQuestionSelections(
  question: Question,
  answersByQuestion: AnswerLookup,
): ResolvedSelection[] {
  if (question.type === 'free_text') {
    const answer = answersByQuestion[question.id];
    const freeText = (answer?.freeText ?? '').trim();

    return freeText.length > 0
      ? [
          {
            indicatorId: question.id,
            questionId: question.id,
            questionPrompt: question.prompt,
            optionLabel: freeText,
            welfareLevel: null,
            flags: [],
          },
        ]
      : [];
  }

  if (question.type === 'matrix') {
    return resolveMatrixSelections(question, answersByQuestion);
  }

  if (question.type === 'grid') {
    return resolveGridSelections(question, answersByQuestion);
  }

  return resolveChoiceSelections(question, answersByQuestion);
}

function resolveChoiceSelections(
  question: ChoiceQuestion,
  answersByQuestion: AnswerLookup,
): ResolvedSelection[] {
  const selectedOptionIds = answersByQuestion[question.id]?.optionIds ?? [];

  return selectedOptionIds.flatMap((optionId) => {
    const option = question.options.find((candidate) => candidate.id === optionId);

    return option
      ? [
          {
            indicatorId: getChoiceIndicatorId(question, option.id),
            questionId: question.id,
            questionPrompt: question.prompt,
            optionLabel: labelToString(option.label),
            welfareLevel: option.welfare_level,
            flags: option.flags,
          },
        ]
      : [];
  });
}

function resolveMatrixSelections(
  question: MatrixQuestion,
  answersByQuestion: AnswerLookup,
): ResolvedSelection[] {
  return question.row_groups.flatMap((rowGroup) =>
    rowGroup.rows.flatMap((row) => {
      const answerQuestionId = getMatrixRowAnswerQuestionId(question.id, row.id);
      const selectedColumnId = answersByQuestion[answerQuestionId]?.optionIds[0];
      const column = selectedColumnId
        ? rowGroup.columns.find((candidate) => candidate.id === selectedColumnId)
        : null;

      return column
        ? [
            selectionFromColumn({
              question,
              answerQuestionId,
              row,
              rowGroup,
              column,
              flags: column.flags,
            }),
          ]
        : [];
    }),
  );
}

function resolveGridSelections(
  question: GridQuestion,
  answersByQuestion: AnswerLookup,
): ResolvedSelection[] {
  if (question.selection === 'multi') {
    const columns = question.column_groups.flatMap((columnGroup) =>
      columnGroup.columns.map((column) => ({ column, columnGroup })),
    );

    return question.rows.flatMap((row) => {
      const answerQuestionId = getGridRowAnswerQuestionId(question.id, row.id);
      const selectedColumnIds = answersByQuestion[answerQuestionId]?.optionIds ?? [];

      return selectedColumnIds.flatMap((columnId) => {
        const selected = columns.find(({ column }) => column.id === columnId);

        return selected
          ? [
              selectionFromColumn({
                question,
                answerQuestionId,
                row,
                column: selected.column,
                columnGroup: selected.columnGroup,
                flags: uniqueFlags(row.flags, selected.column.flags),
              }),
            ]
          : [];
      });
    });
  }

  return question.rows.flatMap((row) =>
    question.column_groups.flatMap((columnGroup) => {
      const answerQuestionId = getGridGroupAnswerQuestionId(question.id, row.id, columnGroup.id);
      const selectedColumnId = answersByQuestion[answerQuestionId]?.optionIds[0];
      const column = selectedColumnId
        ? columnGroup.columns.find((candidate) => candidate.id === selectedColumnId)
        : null;

      return column
        ? [
            selectionFromColumn({
              question,
              answerQuestionId,
              row,
              column,
              columnGroup,
              flags: uniqueFlags(row.flags, column.flags),
            }),
          ]
        : [];
    }),
  );
}

function selectionFromColumn({
  question,
  answerQuestionId,
  row,
  rowGroup,
  column,
  columnGroup,
  flags,
}: {
  question: MatrixQuestion | GridQuestion;
  answerQuestionId: string;
  row: Row | GridRow;
  rowGroup?: RowGroup;
  column: Column;
  columnGroup?: ColumnGroup;
  flags: readonly OptionFlag[];
}): ResolvedSelection {
  return {
    indicatorId: answerQuestionId,
    questionId: answerQuestionId,
    questionPrompt: question.prompt,
    rowLabel: rowLabel(row, rowGroup),
    optionLabel: optionLabel(column, columnGroup),
    welfareLevel: column.welfare_level,
    flags: [...flags],
  };
}

function uniqueFlags(
  ...flagGroups: readonly (readonly OptionFlag[] | undefined)[]
): OptionFlag[] {
  const flags: OptionFlag[] = [];

  for (const flagGroup of flagGroups) {
    for (const flag of flagGroup ?? []) {
      if (!flags.includes(flag)) {
        flags.push(flag);
      }
    }
  }

  return flags;
}

function rowLabel(row: Row | GridRow, rowGroup?: RowGroup): string {
  const groupLabel = rowGroup?.label?.trim() ?? '';

  return groupLabel.length > 0 ? `${groupLabel}: ${row.label}` : row.label;
}

function optionLabel(column: Column, columnGroup?: ColumnGroup): string {
  const groupLabel = columnGroup?.label.trim() ?? '';

  return groupLabel.length > 0 ? `${groupLabel}: ${column.label}` : column.label;
}

function labelToString(label: Option['label']): string {
  return typeof label === 'number' ? String(label) : label;
}

function getChoiceIndicatorId(question: ChoiceQuestion, optionId: string): string {
  return question.type === 'multi_choice' ? `${question.id}::${optionId}` : question.id;
}

function orderUrgentBySeverity(items: readonly UrgentItem[]): UrgentItem[] {
  return urgentFlagOrder.flatMap((flag) => items.filter((item) => item.flags[0] === flag));
}

function isObserveFlag(flag: OptionFlag): flag is ObserveFlag {
  return (observeFlagOrder as readonly OptionFlag[]).includes(flag);
}

function orderByFlag<T extends { flag: OptionFlag }>(
  items: readonly T[],
  flagOrder: readonly OptionFlag[],
): T[] {
  return flagOrder.flatMap((flag) => items.filter((item) => item.flag === flag));
}
