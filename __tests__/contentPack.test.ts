import { psittawelContentPack } from '../content/psittawel';
import {
  type ChoiceQuestion,
  type ContentPack,
  type GridQuestion,
  type MatrixQuestion,
  type MultiChoiceQuestion,
  type ScaleQuestion,
  validateContentPack,
} from '../content/schema';

describe('content pack', () => {
  it('parses and validates PsittaWel version 1', () => {
    expect(() => validateContentPack(psittawelContentPack)).not.toThrow();
    expect(psittawelContentPack.instrument).toBe('PsittaWel');
    expect(psittawelContentPack.instrument_version).toBe('1');
    expect(psittawelContentPack.sections).toHaveLength(3);
    expect(psittawelContentPack.sections[0].questions).toHaveLength(10);
    expect(psittawelContentPack.sections[1].questions).toHaveLength(7);
    expect(psittawelContentPack.sections[2].questions).toHaveLength(23);
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

  it('keeps Section 3 authored order and spot welfare mappings', () => {
    const section = psittawelContentPack.sections[2];
    const enclosureLocation = gridQuestion(section.questions[0]);
    const enclosureSize = choiceQuestion(section.questions[1]);
    const barOrientation = multiChoiceQuestion(section.questions[2]);
    const humidityTemperature = choiceQuestion(section.questions[12]);
    const uvExposure = choiceQuestion(section.questions[16]);
    const highPerch = choiceQuestion(section.questions[17]);
    const dailyMovement = choiceQuestion(section.questions[18]);
    const flySpaceSafe = gridQuestion(section.questions[20]);
    const wingTrim = choiceQuestion(section.questions[22]);

    expect(section.id).toBe('s3_housing');
    expect(section.indicator_icon).toBe('house');
    expect(section.questions.map((question) => question.id)).toEqual([
      'q_s3_enclosure_location',
      'q_s3_enclosure_size',
      'q_s3_bar_orientation',
      'q_s3_enclosure_material',
      'q_s3_perches_count',
      'q_s3_perch_variety',
      'q_s3_movement_enrichment',
      'q_s3_enrichment_material_safe',
      'q_s3_undisturbed_area',
      'q_s3_time_out_of_enclosure',
      'q_s3_indoor_space_safe',
      'q_s3_cleaning',
      'q_s3_humidity_temperature',
      'q_s3_air_refresh',
      'q_s3_outdoors_time',
      'q_s3_outdoors_safe',
      'q_s3_uv_exposure',
      'q_s3_high_perch',
      'q_s3_daily_movement',
      'q_s3_fly_opportunity',
      'q_s3_fly_space_safe',
      'q_s3_flight_ability',
      'q_s3_wing_trim',
    ]);
    expect(enclosureLocation.selection).toBe('multi');
    expect(enclosureLocation.column_groups[0].columns.map((column) => column.label)).toEqual([
      'Main enclosure',
      'Secondary enclosure(s)',
    ]);
    expect(enclosureLocation.rows[9]).toMatchObject({
      id: 'row_s3_location_other',
      label: 'Other:',
      allow_text: true,
    });
    expect(enclosureSize.options.map((option) => option.welfare_level)).toEqual([
      'optimal',
      'moderate',
      'elevated_risk',
      'high_risk',
    ]);
    expect(barOrientation.options.map((option) => option.welfare_level)).toEqual([
      'optimal',
      'good',
      'elevated_risk',
      'high_risk',
    ]);
    expect(humidityTemperature.options.map((option) => option.welfare_level)).toEqual([
      'optimal',
      'moderate',
      'moderate',
      'high_risk',
    ]);
    expect(uvExposure.options.map((option) => option.welfare_level)).toEqual([
      'optimal',
      'moderate',
      'elevated_risk',
      'high_risk',
    ]);
    expect(highPerch.options.map((option) => option.welfare_level)).toEqual([
      'optimal',
      'moderate',
      'elevated_risk',
      'high_risk',
    ]);
    expect(dailyMovement.indicator_icon).toBe('parrot');
    expect(dailyMovement.options[4]).toMatchObject({
      label: "I don't know",
      welfare_level: null,
      flags: ['dont_know'],
    });
    expect(flySpaceSafe.selection).toBe('single_per_group');
    expect(flySpaceSafe.column_groups.map((group) => group.label)).toEqual([
      'Opportunity provided',
      'Safe space',
    ]);
    expect(wingTrim.indicator_icon).toBe('parrot');
    expect(wingTrim.options.map((option) => option.welfare_level)).toEqual([
      'optimal',
      'good',
      'moderate',
      'elevated_risk',
      'high_risk',
      'high_risk',
      'high_risk',
    ]);
    expect(wingTrim.options.map((option) => option.image_ref)).toEqual([
      'img_s3_trim_no',
      'img_s3_trim_skinny',
      'img_s3_trim_transverse',
      'img_s3_trim_secondaries',
      'img_s3_trim_prim_sec',
      'img_s3_trim_unilateral',
      'img_s3_trim_deflighted',
    ]);
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

  it('rejects empty option lists for multi-choice questions', () => {
    const pack = clonePack();
    const question = multiChoiceQuestion(pack.sections[2].questions[2]);

    question.options = [];

    expect(() => validateContentPack(pack)).toThrow(
      'Question q_s3_bar_orientation must include at least one option.',
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

  it('accepts both grid selection modes', () => {
    const pack = clonePack();

    expect(gridQuestion(pack.sections[2].questions[0]).selection).toBe('multi');
    expect(gridQuestion(pack.sections[2].questions[6]).selection).toBe('single_per_group');
    expect(() => validateContentPack(pack)).not.toThrow();
  });

  it('rejects unknown grid selection values', () => {
    const pack = clonePack();
    const question = gridQuestion(pack.sections[2].questions[0]);

    question.selection = 'single' as never;

    expect(() => validateContentPack(pack)).toThrow(
      'Unknown question q_s3_enclosure_location selection',
    );
  });

  it('rejects duplicate grid column ids across column groups', () => {
    const pack = clonePack();
    const question = gridQuestion(pack.sections[2].questions[6]);

    question.column_groups[1].columns[0].id = question.column_groups[0].columns[0].id;

    expect(() => validateContentPack(pack)).toThrow(
      'Duplicate column for question q_s3_movement_enrichment id: col_s3_movement_inside_yes.',
    );
  });

  it('rejects grid rows without an allow_text boolean', () => {
    const pack = clonePack();
    const question = gridQuestion(pack.sections[2].questions[0]);

    delete (question.rows[0] as Partial<GridQuestion['rows'][number]>).allow_text;

    expect(() => validateContentPack(pack)).toThrow(
      'Question q_s3_enclosure_location row row_s3_location_living_room allow_text must be a boolean.',
    );
  });
});

function clonePack(): ContentPack {
  return JSON.parse(JSON.stringify(psittawelContentPack)) as ContentPack;
}

function choiceQuestion(question: ContentPack['sections'][number]['questions'][number]): ChoiceQuestion {
  if (question.type === 'free_text' || question.type === 'matrix' || question.type === 'grid') {
    throw new Error(`Question ${question.id} is not a choice question.`);
  }

  return question;
}

function multiChoiceQuestion(
  question: ContentPack['sections'][number]['questions'][number],
): MultiChoiceQuestion {
  if (question.type !== 'multi_choice') {
    throw new Error(`Question ${question.id} is not a multi-choice question.`);
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

function gridQuestion(question: ContentPack['sections'][number]['questions'][number]): GridQuestion {
  if (question.type !== 'grid') {
    throw new Error(`Question ${question.id} is not a grid question.`);
  }

  return question;
}
