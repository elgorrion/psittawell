import { psittawelContentPack } from '../content/psittawel';
import type { ChoiceQuestion, ContentPack, MatrixQuestion } from '../content/schema';
import { buildWelfareSnapshot, getMatrixRowAnswerQuestionId } from '../lib/assessments';

describe('buildWelfareSnapshot', () => {
  it('records selected welfare levels from the content pack at answer time', () => {
    const question = choiceQuestion(clonePack().sections[0].questions[7]);
    const snapshot = buildWelfareSnapshot(question, ['opt_s1_observe_4plus']);

    question.options[0].welfare_level = 'high_risk';

    expect(snapshot).toEqual({
      opt_s1_observe_4plus: 'optimal',
    });
  });

  it('records null welfare levels for non-gradient options', () => {
    const question = choiceQuestion(clonePack().sections[0].questions[9]);

    expect(buildWelfareSnapshot(question, ['opt_s1_vet_avian_dont_know'])).toEqual({
      opt_s1_vet_avian_dont_know: null,
    });
  });

  it('returns an empty snapshot when no option is selected', () => {
    const question = clonePack().sections[0].questions[0];

    expect(buildWelfareSnapshot(question, [])).toEqual({});
  });

  it('rejects unknown selected option ids', () => {
    const question = choiceQuestion(clonePack().sections[0].questions[7]);

    expect(() => buildWelfareSnapshot(question, ['opt_missing'])).toThrow(
      'Question q_s1_observe_frequency has no option opt_missing.',
    );
  });

  it('records selected matrix column welfare levels for a row answer', () => {
    const question = matrixQuestion(clonePack().sections[1].questions[5]);

    expect(buildWelfareSnapshot(question, ['col_signs_chronic_yes_dx'])).toEqual({
      col_signs_chronic_yes_dx: 'moderate',
    });
  });

  it('builds stable matrix row answer ids', () => {
    expect(
      getMatrixRowAnswerQuestionId('q_s2_signs_of_illness', 'row_signs_lameness'),
    ).toBe('q_s2_signs_of_illness::row_signs_lameness');
  });
});

function clonePack(): ContentPack {
  return JSON.parse(JSON.stringify(psittawelContentPack)) as ContentPack;
}

function choiceQuestion(question: ContentPack['sections'][number]['questions'][number]): ChoiceQuestion {
  if (question.type === 'free_text' || question.type === 'matrix') {
    throw new Error(`Question ${question.id} is not a choice question.`);
  }

  return question;
}

function matrixQuestion(question: ContentPack['sections'][number]['questions'][number]): MatrixQuestion {
  if (question.type !== 'matrix') {
    throw new Error(`Question ${question.id} is not a matrix question.`);
  }

  return question;
}
