import { psittawelContentPack } from '../content/psittawel';
import {
  type ChoiceQuestion,
  type ContentPack,
  validateContentPack,
} from '../content/schema';

describe('content pack', () => {
  it('parses and validates PsittaWel version 1', () => {
    expect(() => validateContentPack(psittawelContentPack)).not.toThrow();
    expect(psittawelContentPack.instrument).toBe('PsittaWel');
    expect(psittawelContentPack.instrument_version).toBe('1');
    expect(psittawelContentPack.sections).toHaveLength(1);
    expect(psittawelContentPack.sections[0].questions).toHaveLength(10);
  });

  it('keeps Section 1 authored order and welfare mappings', () => {
    const section = psittawelContentPack.sections[0];
    const observeFrequency = choiceQuestion(section.questions[7]);
    const checkupFrequency = choiceQuestion(section.questions[8]);
    const avianSpecialised = choiceQuestion(section.questions[9]);

    expect(observeFrequency.options.map((option) => option.label)).toEqual([
      'Several times (4+) throughout the day',
      '2-3 times per day',
      'Once a day',
      'A few times per week',
      'Once a week or less',
    ]);
    expect(observeFrequency.options.map((option) => option.welfare_level)).toEqual([
      'optimal',
      'good',
      'moderate',
      'elevated_risk',
      'high_risk',
    ]);
    expect(checkupFrequency.options.map((option) => option.welfare_level)).toEqual([
      'optimal',
      'moderate',
      'high_risk',
    ]);
    expect(avianSpecialised.options[2]).toMatchObject({
      label: "I don't know",
      welfare_level: null,
      flags: ['dont_know'],
    });
  });

  it('rejects duplicate section ids', () => {
    const pack = clonePack();

    pack.sections.push({ ...pack.sections[0] });

    expect(() => validateContentPack(pack)).toThrow('Duplicate section id: s1_general.');
  });

  it('rejects duplicate question ids', () => {
    const pack = clonePack();

    pack.sections[0].questions[1].id = pack.sections[0].questions[0].id;

    expect(() => validateContentPack(pack)).toThrow('Duplicate question id: q_s1_name.');
  });

  it('rejects duplicate option ids', () => {
    const pack = clonePack();
    const question = choiceQuestion(pack.sections[0].questions[2]);

    question.options[1].id = question.options[0].id;

    expect(() => validateContentPack(pack)).toThrow('Duplicate option id: opt_s1_sex_female.');
  });

  it('rejects unknown enum values', () => {
    const pack = clonePack();
    const question = choiceQuestion(pack.sections[0].questions[7]);

    question.options[0].welfare_level = 'unknown' as never;

    expect(() => validateContentPack(pack)).toThrow('Unknown option opt_s1_observe_4plus welfare_level');
  });

  it('rejects conditional references to missing questions', () => {
    const pack = clonePack();

    pack.sections[0].questions[3].conditional_on = {
      question_id: 'q_missing',
      equals_option_id: 'opt_missing',
    };

    expect(() => validateContentPack(pack)).toThrow(
      'Question q_s1_age conditional_on references missing question q_missing.',
    );
  });

  it('rejects conditional references to missing options', () => {
    const pack = clonePack();

    pack.sections[0].questions[3].conditional_on = {
      question_id: 'q_s1_sex',
      equals_option_id: 'opt_missing',
    };

    expect(() => validateContentPack(pack)).toThrow(
      'Question q_s1_age conditional_on references missing option opt_missing.',
    );
  });

  it('rejects empty option lists for choice questions', () => {
    const pack = clonePack();
    const question = choiceQuestion(pack.sections[0].questions[2]);

    question.options = [];

    expect(() => validateContentPack(pack)).toThrow(
      'Question q_s1_sex must include at least one option.',
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
