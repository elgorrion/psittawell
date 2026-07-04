import type { ConditionalOn } from '../content/schema';
import { evaluateConditional } from '../lib/conditionals';

describe('conditional visibility predicates', () => {
  it('hides dependent questions when the referenced question is unanswered', () => {
    expect(evaluateConditional(condition('not_in', ['opt_a']), {})).toBe(false);
  });

  it('evaluates equals', () => {
    expect(evaluateConditional(condition('equals', ['opt_a']), answers(['opt_a']))).toBe(true);
    expect(evaluateConditional(condition('equals', ['opt_a']), answers(['opt_b']))).toBe(false);
  });

  it('evaluates not_equals after the referenced question has been answered', () => {
    expect(evaluateConditional(condition('not_equals', ['opt_a']), answers(['opt_b']))).toBe(true);
    expect(evaluateConditional(condition('not_equals', ['opt_a']), answers(['opt_a']))).toBe(false);
  });

  it('evaluates in', () => {
    expect(evaluateConditional(condition('in', ['opt_a', 'opt_c']), answers(['opt_b', 'opt_c']))).toBe(
      true,
    );
    expect(evaluateConditional(condition('in', ['opt_a', 'opt_c']), answers(['opt_b']))).toBe(
      false,
    );
  });

  it('evaluates not_in after the referenced question has been answered', () => {
    expect(evaluateConditional(condition('not_in', ['opt_a', 'opt_c']), answers(['opt_b']))).toBe(
      true,
    );
    expect(evaluateConditional(condition('not_in', ['opt_a', 'opt_c']), answers(['opt_c']))).toBe(
      false,
    );
  });
});

function condition(operator: ConditionalOn['operator'], optionIds: string[]): ConditionalOn {
  return {
    question_id: 'q_parent',
    operator,
    option_ids: optionIds,
  };
}

function answers(optionIds: string[]) {
  return {
    q_parent: {
      optionIds,
    },
  };
}
