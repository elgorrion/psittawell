import { psittawelContentPack } from '../content/psittawel';
import type { ChoiceQuestion, ContentPack } from '../content/schema';
import { buildWelfareSnapshot } from '../lib/assessments';

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
