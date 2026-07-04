import type { ConditionalOn, Question } from '../content/schema';

export type ConditionalAnswer = {
  optionIds: readonly string[];
};

export type ConditionalAnswers = Record<string, ConditionalAnswer | undefined>;

export function isQuestionVisible(question: Question, answers: ConditionalAnswers): boolean {
  const conditionalOn = question.conditional_on;

  if (!conditionalOn) {
    return true;
  }

  return evaluateConditional(conditionalOn, answers);
}

export function evaluateConditional(
  conditionalOn: ConditionalOn,
  answers: ConditionalAnswers,
): boolean {
  const selectedOptionIds = answers[conditionalOn.question_id]?.optionIds ?? [];

  if (selectedOptionIds.length === 0) {
    return false;
  }

  const optionIds = new Set(conditionalOn.option_ids);

  switch (conditionalOn.operator) {
    case 'equals':
      return selectedOptionIds.length === 1 && selectedOptionIds[0] === conditionalOn.option_ids[0];
    case 'not_equals':
      return !(selectedOptionIds.length === 1 && selectedOptionIds[0] === conditionalOn.option_ids[0]);
    case 'in':
      return selectedOptionIds.some((optionId) => optionIds.has(optionId));
    case 'not_in':
      return selectedOptionIds.every((optionId) => !optionIds.has(optionId));
  }
}
