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

const psittawelUsageNotice =
  '© Andrea Piseddu, Yvonne van Zeeland and Jean-Loup Rault, 2026. All rights reserved. This document may be used for non-commercial purposes only. Any commercial use requires prior written permission. As an exception, professionals such as veterinarians and behavioural consultants may use the tool in the course of their professional practice and may charge for consultation and interpretation of results, provided that the tool itself is not sold, licensed, or otherwise commercially exploited.';

describe('content pack', () => {
  it('parses and validates PsittaWel version 1', () => {
    expect(() => validateContentPack(psittawelContentPack)).not.toThrow();
    expect(psittawelContentPack.instrument).toBe('PsittaWel');
    expect(psittawelContentPack.instrument_version).toBe('1');
    expect(psittawelContentPack.sections).toHaveLength(8);
    expect(psittawelContentPack.sections[0].questions).toHaveLength(10);
    expect(psittawelContentPack.sections[1].questions).toHaveLength(7);
    expect(psittawelContentPack.sections[2].questions).toHaveLength(23);
    expect(psittawelContentPack.sections[3].questions).toHaveLength(8);
    expect(psittawelContentPack.sections[4].questions).toHaveLength(11);
    expect(psittawelContentPack.sections[5].questions).toHaveLength(3);
    expect(psittawelContentPack.sections[6].questions).toHaveLength(10);
    expect(psittawelContentPack.sections[7].questions).toHaveLength(3);
    expect(psittawelContentPack.sections.flatMap((section) => section.questions)).toHaveLength(75);
  });

  it('keeps the source usage notice verbatim and the content licence factual', () => {
    expect(psittawelContentPack.source.usage_notice).toBe(psittawelUsageNotice);
    expect(psittawelContentPack.source.content_licence).toBe(
      '© Piseddu, van Zeeland & Rault 2026. All rights reserved, non-commercial use only. Not covered by the code licence.',
    );
    expect(psittawelContentPack.source.content_licence).not.toContain('Used with permission');
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
    expect(enclosureLocation.help).toBe(
      'If your parrot has select enclosures, please specify all locations.',
    );
    expect(enclosureLocation.note).toBe(
      "Please select only the answer options that apply to your parrot and leave the remaining ones blank.\nEnclosure: space where the parrot sleeps, eats, drinks, and stays when it can't be supervised.",
    );
    expect(enclosureLocation.note).toContain(
      'Please select only the answer options that apply to your parrot and leave the remaining ones blank.',
    );
    expect(enclosureLocation.note).toContain(
      "Enclosure: space where the parrot sleeps, eats, drinks, and stays when it can't be supervised.",
    );
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

  it('keeps Section 4 authored order, matrix row orders, and special flags', () => {
    const section = psittawelContentPack.sections[3];
    const frequency = matrixQuestion(section.questions[0]);
    const interaction = matrixQuestion(section.questions[1]);
    const foragingTime = choiceQuestion(section.questions[4]);
    const unfamiliarObjects = choiceQuestion(section.questions[6]);
    const alertness = choiceQuestion(section.questions[7]);

    expect(section.id).toBe('s4_enrichment');
    expect(section.indicator_icon).toBe('house');
    expect(section.questions.map((question) => question.id)).toEqual([
      'q_s4_enrichment_frequency',
      'q_s4_enrichment_interaction',
      'q_s4_toy_range',
      'q_s4_foraging_provision',
      'q_s4_foraging_time',
      'q_s4_toy_replacement',
      'q_s4_unfamiliar_objects',
      'q_s4_alertness',
    ]);
    expect(frequency.row_groups[0].columns.map((column) => column.welfare_level)).toEqual([
      'optimal',
      'moderate',
      'elevated_risk',
      'high_risk',
    ]);
    expect(frequency.row_groups[0].rows.map((row) => row.label)).toEqual([
      'Multiple food stations',
      'Certified chewable toys, cardboard or paper without ink, natural, not toxic and untreated cork and branches that can be safely chewed and destroyed',
      'Puzzles and problem-solving games',
      'Larger chunks of food or whole food items (with or without skewers)',
      'Scatter feeding (for example, foraging mat, spreading food out in various locations) and foraging tray or box (food mixed with inedible items)',
      'Non destructible puzzle feeders/foraging toys',
      'Destructible foraging toys',
      'Visual enrichment (for example, view out of the window)',
      'Auditory enrichment (for example, recordings of natural sounds)',
      'Interactive toys that make sounds and/or move',
    ]);
    expect(interaction.indicator_icon).toBe('parrot');
    expect(interaction.row_groups[0].rows.map((row) => row.label)).toEqual([
      'Certified chewable toys, cardboard or paper without ink, natural, not toxic and untreated cork and branches that can be safely chewed and destroyed',
      'Puzzles and problem-solving games',
      'Multiple food stations',
      'Larger chunks of food or whole food items (with or without skewers)',
      'Scatter feeding (for example, foraging mat, spreading food out in various locations) and foraging tray or box (food mixed with inedible items)',
      'Non destructible puzzle feeders/foraging toys',
      'Destructible foraging toys',
      'Visual enrichment (for example, view out of the window)',
      'Auditory enrichment (for example, recordings of natural sounds)',
      'Interactive toys that make sounds and/or move',
    ]);
    expect(interaction.row_groups[0].columns[3]).toMatchObject({
      label: 'D',
      help: "I don't know",
      welfare_level: null,
      flags: ['dont_know'],
    });
    expect(foragingTime.options.map((option) => option.welfare_level)).toEqual([
      'optimal',
      'good',
      'elevated_risk',
      'high_risk',
      null,
    ]);
    expect(unfamiliarObjects.flags).toEqual(['context_dependent']);
    expect(alertness.options[2]).toMatchObject({
      label: 'My parrot is mostly inactive or lethargic, shows little interest in its surroundings and does not respond much to things happening around it',
      welfare_level: null,
      flags: ['vet_urgent'],
    });
  });

  it('keeps Section 5 authored order, non-welfare tables, and special flags', () => {
    const section = psittawelContentPack.sections[4];
    const foodsProvided = matrixQuestion(section.questions[0]);
    const sleepTimes = multiChoiceQuestion(section.questions[4]);
    const foodWaterChange = choiceQuestion(section.questions[5]);
    const bathingProvision = gridQuestion(section.questions[7]);

    expect(section.id).toBe('s5_nutrition');
    expect(section.indicator_icon).toBe('house');
    expect(section.questions.map((question) => question.id)).toEqual([
      'q_s5_foods_provided',
      'q_s5_eats_all',
      'q_s5_diet_checked',
      'q_s5_water_refill',
      'q_s5_sleep_times',
      'q_s5_food_water_change',
      'q_s5_sleep_change',
      'q_s5_bathing_provision',
      'q_s5_bathing_behaviour',
      'q_s5_beak_maintenance',
      'q_s5_preening_change',
    ]);
    expect(foodsProvided.row_groups[0].columns.map((column) => column.label)).toEqual([
      'Main component of the diet',
      'Moderate to small quantities',
      'As treat, training reward or vehicle for medications',
      'Not provided',
    ]);
    expect(foodsProvided.row_groups[0].columns.map((column) => column.welfare_level)).toEqual([
      null,
      null,
      null,
      null,
    ]);
    expect(foodsProvided.row_groups[0].rows.map((row) => row.label)).toEqual([
      'Pellet and/or other formulated food',
      'Fresh vegetables',
      'Fresh fruits',
      'Fresh grass or sprouted seeds',
      'Grains',
      'Legumes',
      '🚩 - Other plant-based proteins (for example unsalted tofu)',
      '🦜 - Nectar',
      '🦜 - Seed mix',
      '🚩 - Nuts',
      '🚩 – Fresh eggs or dried fortified egg food',
      '🚩 - Dairy products',
      '⛔ - Other animal-based protein',
      '⛔ - Processed food specifically designed for human consumption',
    ]);
    expect(sleepTimes.options.map((option) => option.label)).toEqual([
      'Morning',
      'Midday',
      'Afternoon',
      'Evening',
      'Night',
      "I don't know",
    ]);
    expect(foodWaterChange.indicator_icon).toBe('parrot');
    expect(foodWaterChange.options[1]).toMatchObject({
      label: 'Yes',
      welfare_level: null,
      flags: ['vet_concern'],
    });
    expect(bathingProvision.selection).toBe('single_per_group');
    expect(bathingProvision.column_groups[0].columns.map((column) => column.welfare_level)).toEqual([
      null,
      null,
      null,
    ]);
    expect(bathingProvision.rows[3]).toMatchObject({
      label: 'Other:',
      allow_text: true,
      flags: ['dont_know'],
    });
  });

  it('keeps Section 6 authored order, reversed groups, and behaviour-urgent mappings', () => {
    const section = psittawelContentPack.sections[5];
    const possibilities = choiceQuestion(section.questions[0]);
    const socialInteractions = matrixQuestion(section.questions[1]);
    const behaviours = matrixQuestion(section.questions[2]);

    expect(section.id).toBe('s6_social');
    expect(section.indicator_icon).toBe('parrot');
    expect(section.questions.map((question) => question.id)).toEqual([
      'q_s6_social_possibilities',
      'q_s6_social_interactions',
      'q_s6_behaviours',
    ]);
    expect(possibilities.flags).toEqual(['context_dependent']);
    expect(possibilities.help).toBeUndefined();
    expect(possibilities.note).toBe(
      'Please note that parrots are highly social animals, and living in group is important for their welfare. However, introducing new individuals should always be carefully evaluated with an expert to ensure it is suitable and safe for all parrots involved.',
    );
    expect(possibilities.options.map((option) => option.welfare_level)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(possibilities.options.flatMap((option) => option.flags)).toEqual([]);
    expect(socialInteractions.row_groups.map((group) => group.label)).toEqual([
      null,
      null,
      null,
    ]);
    expect(socialInteractions.row_groups[0].columns.map((column) => column.label)).toEqual([
      'On all or most encounters',
      'On some encounters',
      'Rarely to never',
    ]);
    expect(socialInteractions.row_groups[1].columns.map((column) => column.label)).toEqual([
      'Rarely to never',
      'On some encounters',
      'On all or most encounters',
    ]);
    expect(socialInteractions.row_groups[1].columns.map((column) => column.welfare_level)).toEqual([
      'optimal',
      'moderate',
      'high_risk',
    ]);
    expect(socialInteractions.row_groups[2].columns[2]).toMatchObject({
      label: 'On all or most encounters',
      welfare_level: null,
      flags: ['behaviour_urgent'],
    });
    expect(behaviours.row_groups[0].rows[1].label).toBe(
      'Actively seeking or spending time in dark, enclosed, or secluded spaces such us underneath furniture, inside drawers or cabinets, behind cushions, or in boxes or clothing.',
    );
    expect(behaviours.row_groups[1].columns[3]).toMatchObject({
      label: 'Every day',
      welfare_level: null,
      flags: ['behaviour_urgent'],
    });
  });

  it('keeps Section 7 authored order, hand/parrot indicators, labels, and null columns', () => {
    const section = psittawelContentPack.sections[6];
    const hoursSurrounded = choiceQuestion(section.questions[0]);
    const allowedBehaviours = matrixQuestion(section.questions[1]);
    const interactions = matrixQuestion(section.questions[2]);
    const trainingResponse = choiceQuestion(section.questions[3]);
    const behavioursTowardsHumans = matrixQuestion(section.questions[4]);
    const displayToHowMany = matrixQuestion(section.questions[5]);
    const caregiverResponse = matrixQuestion(section.questions[6]);
    const familiarResponse = matrixQuestion(section.questions[7]);
    const maintenancePresence = matrixQuestion(section.questions[8]);
    const highLocations = matrixQuestion(section.questions[9]);

    expect(section.id).toBe('s7_human');
    expect(section.indicator_icon).toBe('hand');
    expect(section.questions.map((question) => question.id)).toEqual([
      'q_s7_hours_surrounded',
      'q_s7_allowed_behaviours',
      'q_s7_interactions',
      'q_s7_training_response',
      'q_s7_behaviours_towards_humans',
      'q_s7_display_to_how_many',
      'q_s7_caregiver_response',
      'q_s7_familiar_response',
      'q_s7_maintenance_presence',
      'q_s7_high_locations',
    ]);
    expect(hoursSurrounded.flags).toEqual(['context_dependent']);
    expect(hoursSurrounded.options.map((option) => option.label)).toEqual([
      '> 8h',
      '4h - 8h',
      '2h – 4h',
      'It varies greatly per day',
      'All time, including night',
      '<1h',
    ]);
    expect(hoursSurrounded.options.map((option) => option.welfare_level)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(allowedBehaviours.indicator_icon).toBe('hand');
    expect(interactions.indicator_icon).toBe('hand');
    expect(trainingResponse.indicator_icon).toBe('parrot');
    expect(trainingResponse.prompt).toBe('How does your parrot respond during a training session?');
    expect(trainingResponse.note).toBe('Please answer only if you train your parrot.');
    expect(behavioursTowardsHumans.indicator_icon).toBe('parrot');
    expect(behavioursTowardsHumans.row_groups.map((group) => group.label)).toEqual([
      'Indicators of a positive relationship',
      'Indicators of an inappropriate or problematic relationships',
      null,
    ]);
    expect(behavioursTowardsHumans.row_groups[0].rows[2].label).toBe(
      'Voluntarily steps up onto the hand, arm, or an offered perch without encouragement',
    );
    expect(behavioursTowardsHumans.row_groups[2].columns[3]).toMatchObject({
      label: 'Every day',
      welfare_level: null,
      flags: ['behaviour_urgent'],
    });
    expect(displayToHowMany.prompt).toBe(
      'To how many people does your parrot display each of the above selected behaviour(s)?',
    );
    expect(displayToHowMany.row_groups[0].columns.map((column) => column.welfare_level)).toEqual([
      null,
      null,
      null,
    ]);
    expect(displayToHowMany.row_groups[0].columns.flatMap((column) => column.flags)).toEqual([]);
    expect(displayToHowMany.row_groups[0].rows[2].label).toBe(
      'Voluntarily steps up onto your hand, arm, or an offered perch without encouragement',
    );
    expect(caregiverResponse.row_groups.map((group) => group.columns.at(-1))).toEqual([
      expect.objectContaining({
        label: "I don't know",
        welfare_level: null,
        flags: ['dont_know'],
      }),
      expect.objectContaining({
        label: "I don't know",
        welfare_level: null,
        flags: ['dont_know'],
      }),
      expect.objectContaining({
        label: "I don't know",
        welfare_level: null,
        flags: ['dont_know'],
      }),
    ]);
    expect(familiarResponse.row_groups[0].rows[2].label).toBe(
      'My parrot initiates physical contact itself and actively approaching them for it',
    );
    expect(maintenancePresence.row_groups.map((group) => group.columns[1].welfare_level)).toEqual([
      'high_risk',
      'elevated_risk',
      'moderate',
    ]);
    expect(highLocations.row_groups.map((group) => group.columns[1].welfare_level)).toEqual([
      'high_risk',
      'elevated_risk',
      'moderate',
    ]);
  });

  it('keeps Section 8 authored order, fear grid rows, and abnormal behaviour groups', () => {
    const section = psittawelContentPack.sections[7];
    const vocalizations = choiceQuestion(section.questions[0]);
    const fearDisplay = gridQuestion(section.questions[1]);
    const abnormalBehaviours = matrixQuestion(section.questions[2]);

    expect(section.id).toBe('s8_maladaptive');
    expect(section.indicator_icon).toBe('parrot');
    expect(section.questions.map((question) => question.id)).toEqual([
      'q_s8_vocalizations',
      'q_s8_fear_display',
      'q_s8_abnormal_behaviours',
    ]);
    expect(vocalizations.options[4]).toMatchObject({
      label: 'For the majority of the day, and sometimes incessantly for hours with no apparent reason or cause',
      welfare_level: null,
      flags: ['behaviour_urgent'],
    });
    expect(vocalizations.options[5]).toMatchObject({
      label: "I don't know",
      welfare_level: null,
      flags: ['dont_know'],
    });
    expect(fearDisplay.selection).toBe('single_per_group');
    expect(fearDisplay.column_groups).toHaveLength(1);
    expect(fearDisplay.column_groups[0].columns.map((column) => column.welfare_level)).toEqual([
      'optimal',
      'good',
      'moderate',
      'elevated_risk',
      null,
      null,
    ]);
    expect(fearDisplay.column_groups[0].columns[4].flags).toEqual(['behaviour_urgent']);
    expect(fearDisplay.column_groups[0].columns[5].flags).toEqual(['dont_know']);
    expect(fearDisplay.rows.map((row) => [row.id, row.label])).toEqual([
      ['row_s8_fear_tremors', 'Tremors or shivering, freezing, hiding, withdrawing'],
      [
        'row_s8_fear_escape',
        'Attempting to escape by flying or moving away, possibly falling off the perch, screeching/high-pitched screams',
      ],
    ]);
    expect(abnormalBehaviours.row_groups).toHaveLength(2);
    expect(abnormalBehaviours.help).toBeUndefined();
    expect(abnormalBehaviours.note).toBe(
      'Please note that interpreting abnormal behaviours can be challenging. Whether these reflect a welfare issue depends highly on species, context and frequency with which these occur. If you observe any of these behaviours in the table, seeking expert guidance is highly recommended.',
    );
    expect(abnormalBehaviours.row_groups[0].rows).toHaveLength(9);
    expect(abnormalBehaviours.row_groups[1].rows).toHaveLength(3);
    expect(abnormalBehaviours.row_groups[0].columns[1]).toMatchObject({
      label: 'Yes',
      welfare_level: null,
      flags: ['behaviour_urgent'],
    });
    expect(abnormalBehaviours.row_groups[1].columns[1]).toMatchObject({
      label: 'Yes',
      welfare_level: 'moderate',
      flags: [],
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

  it('accepts matrix row group labels when they are strings or null', () => {
    const pack = clonePack();
    const question = matrixQuestion(pack.sections[6].questions[4]);

    expect(question.row_groups.map((group) => group.label)).toEqual([
      'Indicators of a positive relationship',
      'Indicators of an inappropriate or problematic relationships',
      null,
    ]);
    expect(() => validateContentPack(pack)).not.toThrow();
  });

  it('rejects invalid matrix row group labels', () => {
    const pack = clonePack();
    const question = matrixQuestion(pack.sections[6].questions[4]);

    question.row_groups[0].label = 42 as never;

    expect(() => validateContentPack(pack)).toThrow(
      'Question q_s7_behaviours_towards_humans row group 1 label must be a string or null.',
    );
  });

  it('rejects unknown question-level flags', () => {
    const pack = clonePack();
    const question = choiceQuestion(pack.sections[3].questions[6]);

    question.flags = ['unknown' as never];

    expect(() => validateContentPack(pack)).toThrow(
      'Unknown question q_s4_unfamiliar_objects flags',
    );
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

  it('rejects unknown grid row flags', () => {
    const pack = clonePack();
    const question = gridQuestion(pack.sections[4].questions[7]);

    question.rows[3].flags = ['unknown' as never];

    expect(() => validateContentPack(pack)).toThrow(
      'Unknown question q_s5_bathing_provision row row_s5_bathing_other flags',
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
