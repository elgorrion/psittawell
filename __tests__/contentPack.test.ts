import { psittawelContentPack } from '../content/psittawel';
import {
  type ChoiceQuestion,
  type ContentPack,
  type MatrixQuestion,
  type ScaleQuestion,
  validateContentPack,
} from '../content/schema';

describe('content pack', () => {
  it('parses and validates PsittaWel version 1', () => {
    expect(() => validateContentPack(psittawelContentPack)).not.toThrow();
    expect(psittawelContentPack.instrument).toBe('PsittaWel');
    expect(psittawelContentPack.instrument_version).toBe('1');
    expect(psittawelContentPack.sections).toHaveLength(2);
    expect(psittawelContentPack.sections[0].questions).toHaveLength(10);
    expect(psittawelContentPack.sections[1].questions).toHaveLength(7);
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

  it('keeps Section 2 authored order, scale details, and matrix mappings', () => {
    const section = psittawelContentPack.sections[1];
    const bodyCondition = scaleQuestion(section.questions[3]);
    const signsOfIllness = matrixQuestion(section.questions[5]);
    const medication = choiceQuestion(section.questions[6]);

    expect(section.id).toBe('s2_physical_health');
    expect(section.indicator_icon).toBe('parrot');
    expect(section.questions.map((question) => question.id)).toEqual([
      'q_s2_plumage',
      'q_s2_plumage_head',
      'q_s2_droppings',
      'q_s2_body_condition',
      'q_s2_disease_diagnosed',
      'q_s2_signs_of_illness',
      'q_s2_medication',
    ]);
    expect(bodyCondition.options.map((option) => option.label)).toEqual([
      "I can't calculate the score because my parrot doesn't accept handling and I don't feel comfortable insisting.",
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
    expect(bodyCondition.options.map((option) => option.welfare_level)).toEqual([
      null,
      null,
      'elevated_risk',
      'optimal',
      'elevated_risk',
      'high_risk',
    ]);
    expect(bodyCondition.options[3].detail).toBe(
      'Breast bone easily felt but not sharp · Breast muscle rounded',
    );
    expect(signsOfIllness.row_groups).toHaveLength(2);
    expect(signsOfIllness.row_groups[0].columns.map((column) => column.id)).toEqual([
      'col_signs_acute_no',
      'col_signs_acute_yes_dx',
      'col_signs_acute_yes_undx',
      'col_signs_acute_unsure',
    ]);
    expect(signsOfIllness.row_groups[0].rows).toHaveLength(11);
    expect(signsOfIllness.row_groups[1].rows).toHaveLength(11);
    expect(signsOfIllness.row_groups[1].rows[10]).toMatchObject({
      id: 'row_signs_feet',
      label: 'Swelling, ulcers, and/or other lesions under the feet',
      image_ref: 'img_s2_signs_feet',
    });
    expect(medication.options[1].label).toBe(
      'No, my parrot has not been seen by a veterinarian, but my it is receiving over-the-counter medications or other types of care interventions (without consultation of a veterinarian)',
    );
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
      operator: 'equals',
      option_ids: ['opt_missing'],
    };

    expect(() => validateContentPack(pack)).toThrow(
      'Question q_s1_age conditional_on references missing question q_missing.',
    );
  });

  it('rejects conditional references to missing options', () => {
    const pack = clonePack();

    pack.sections[0].questions[3].conditional_on = {
      question_id: 'q_s1_sex',
      operator: 'equals',
      option_ids: ['opt_missing'],
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

  it('rejects invalid conditional operators', () => {
    const pack = clonePack();

    pack.sections[0].questions[3].conditional_on = {
      question_id: 'q_s1_sex',
      operator: 'outside' as never,
      option_ids: ['opt_s1_sex_female'],
    };

    expect(() => validateContentPack(pack)).toThrow(
      'Unknown question q_s1_age conditional_on operator',
    );
  });

  it('rejects duplicate matrix column ids across a whole matrix', () => {
    const pack = clonePack();
    const question = matrixQuestion(pack.sections[1].questions[5]);

    question.row_groups[1].columns[0].id = question.row_groups[0].columns[0].id;

    expect(() => validateContentPack(pack)).toThrow(
      'Duplicate column for question q_s2_signs_of_illness id: col_signs_acute_no.',
    );
  });

  it('rejects unknown matrix column flags', () => {
    const pack = clonePack();
    const question = matrixQuestion(pack.sections[1].questions[5]);

    question.row_groups[0].columns[0].flags = ['unknown' as never];

    expect(() => validateContentPack(pack)).toThrow('Unknown column col_signs_acute_no flags');
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

function scaleQuestion(question: ContentPack['sections'][number]['questions'][number]): ScaleQuestion {
  if (question.type !== 'scale') {
    throw new Error(`Question ${question.id} is not a scale question.`);
  }

  return question;
}

function matrixQuestion(question: ContentPack['sections'][number]['questions'][number]): MatrixQuestion {
  if (question.type !== 'matrix') {
    throw new Error(`Question ${question.id} is not a matrix question.`);
  }

  return question;
}
