import type { Answer } from '../lib/assessments';
import {
  getGridGroupAnswerQuestionId,
  getGridRowAnswerQuestionId,
  getMatrixRowAnswerQuestionId,
} from '../lib/assessments';
import { buildAssessmentResults } from '../lib/results';
import type { OptionFlag, Section, WelfareLevel } from '../content/schema';

describe('buildAssessmentResults', () => {
  it('detects professional-review flags and orders them by urgency', () => {
    const results = buildAssessmentResults(fixtureSections, [
      answer('q_urgent', ['opt_vet_concern', 'opt_behaviour_urgent', 'opt_vet_urgent']),
    ]);

    expect(results.urgent.map((item) => item.flags)).toEqual([
      ['vet_urgent'],
      ['behaviour_urgent'],
      ['vet_concern'],
    ]);
    expect(results.urgent.map((item) => item.optionLabel)).toEqual([
      'Immediate vet review',
      'Immediate behaviour review',
      'Vet review',
    ]);
  });

  it('merges multiple urgent markers on one answer into a single entry', () => {
    const results = buildAssessmentResults(fixtureSections, [
      answer('q_urgent', ['opt_dual_urgent']),
    ]);

    expect(results.urgent).toEqual([
      expect.objectContaining({
        questionId: 'q_urgent',
        optionLabel: 'Dual marker answer',
        flags: ['behaviour_urgent', 'vet_concern'],
      }),
    ]);
  });

  it('groups attention items by section and omits optimal, good, hidden, and empty sections', () => {
    const results = buildAssessmentResults(fixtureSections, [
      answer('q_control', ['opt_hide']),
      answer('q_attention', [
        'opt_optimal',
        'opt_good',
        'opt_moderate',
        'opt_elevated',
        'opt_high',
      ]),
      answer('q_hidden', ['opt_hidden_high']),
    ]);

    expect(results.attention).toEqual([
      {
        sectionId: 's_general',
        sectionTitle: 'General welfare',
        items: [
          expect.objectContaining({
            optionLabel: 'Moderate concern',
            welfareLevel: 'moderate',
          }),
          expect.objectContaining({
            optionLabel: 'Elevated concern',
            welfareLevel: 'elevated_risk',
          }),
          expect.objectContaining({
            optionLabel: 'High concern',
            welfareLevel: 'high_risk',
          }),
        ],
      },
    ]);
    expect(results.attention.flatMap((section) => section.items)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ optionLabel: 'Optimal' }),
        expect.objectContaining({ optionLabel: 'Good' }),
        expect.objectContaining({ questionId: 'q_hidden' }),
      ]),
    );
  });

  it('detects observe items from dont_know and context-dependent flags', () => {
    const results = buildAssessmentResults(fixtureSections, [
      answer('q_observe', ['opt_dont_know']),
      answer('q_context_question', ['opt_context_answer']),
      answer(getGridRowAnswerQuestionId('q_grid_multi', 'row_grid_context'), [
        'col_grid_unknown',
      ]),
    ]);

    expect(results.observe).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: 'q_observe',
          optionLabel: "I don't know",
          flag: 'dont_know',
        }),
        expect.objectContaining({
          questionId: getGridRowAnswerQuestionId('q_grid_multi', 'row_grid_context'),
          rowLabel: 'Other row',
          optionLabel: 'Not sure',
          flag: 'dont_know',
        }),
        expect.objectContaining({
          questionId: 'q_context_question',
          optionLabel: 'Depends on context',
          flag: 'context_dependent',
        }),
        expect.objectContaining({
          questionId: getGridRowAnswerQuestionId('q_grid_multi', 'row_grid_context'),
          rowLabel: 'Other row',
          optionLabel: 'Not sure',
          flag: 'context_dependent',
        }),
      ]),
    );
  });

  it('resolves composite matrix and grid answers to row and option labels with flags', () => {
    const matrixAnswerId = getMatrixRowAnswerQuestionId('q_matrix', 'row_matrix_swelling');
    const gridAnswerId = getGridGroupAnswerQuestionId(
      'q_grid_single',
      'row_grid_flight',
      'group_outside',
    );
    const results = buildAssessmentResults(fixtureSections, [
      answer(matrixAnswerId, ['col_matrix_yes']),
      answer(gridAnswerId, ['col_outside_no']),
    ]);

    expect(results.urgent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: matrixAnswerId,
          questionPrompt: 'Does your parrot show these signs?',
          rowLabel: 'Swelling',
          optionLabel: 'Yes',
          flags: ['vet_concern'],
        }),
        expect.objectContaining({
          questionId: gridAnswerId,
          questionPrompt: 'Where can your parrot fly safely?',
          rowLabel: 'Flight time',
          optionLabel: 'Outside: No',
          flags: ['behaviour_urgent'],
        }),
      ]),
    );
    expect(results.attention).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionId: 's_composite',
          items: expect.arrayContaining([
            expect.objectContaining({
              questionId: gridAnswerId,
              rowLabel: 'Flight time',
              optionLabel: 'Outside: No',
              welfareLevel: 'high_risk',
            }),
          ]),
        }),
      ]),
    );
  });

  it('exposes no aggregate scoring fields', () => {
    const results = buildAssessmentResults(fixtureSections, [
      answer('q_attention', ['opt_high']),
    ]);
    const forbiddenFieldTerms = [
      'score',
      'count',
      'total',
      'percentage',
      'grade',
      'points',
      'average',
      'rank',
      'verdict',
    ];
    const keys = collectKeys(results).map((key) => key.toLowerCase());

    for (const term of forbiddenFieldTerms) {
      expect(keys.some((key) => key.includes(term))).toBe(false);
    }
  });

  it('tolerates empty and partially answered assessments', () => {
    expect(buildAssessmentResults(fixtureSections, [])).toEqual({
      urgent: [],
      attention: [],
      observe: [],
      sectionsReviewed: fixtureSections.map((section) => ({
        sectionId: section.id,
        sectionTitle: section.title,
      })),
    });

    expect(() =>
      buildAssessmentResults(fixtureSections, [
        answer(getMatrixRowAnswerQuestionId('q_matrix', 'row_matrix_swelling'), [
          'col_matrix_no',
        ]),
      ]),
    ).not.toThrow();
  });
});

const fixtureSections = [
  {
    id: 's_general',
    number: 1,
    title: 'General welfare',
    indicator_icon: 'parrot',
    interpretation: 'Fixture section.',
    questions: [
      {
        id: 'q_control',
        type: 'single_choice',
        prompt: 'Control question',
        demographic: false,
        conditional_on: null,
        options: [
          option('opt_show', 'Show hidden', null),
          option('opt_hide', 'Hide hidden', null),
        ],
      },
      {
        id: 'q_urgent',
        type: 'multi_choice',
        prompt: 'Which signs are present?',
        demographic: false,
        conditional_on: null,
        options: [
          option('opt_vet_concern', 'Vet review', null, ['vet_concern']),
          option('opt_behaviour_urgent', 'Immediate behaviour review', null, [
            'behaviour_urgent',
          ]),
          option('opt_vet_urgent', 'Immediate vet review', null, ['vet_urgent']),
          option('opt_dual_urgent', 'Dual marker answer', null, [
            'vet_concern',
            'behaviour_urgent',
          ]),
        ],
      },
      {
        id: 'q_attention',
        type: 'multi_choice',
        prompt: 'Select welfare indicators',
        demographic: false,
        conditional_on: null,
        options: [
          option('opt_optimal', 'Optimal', 'optimal'),
          option('opt_good', 'Good', 'good'),
          option('opt_moderate', 'Moderate concern', 'moderate'),
          option('opt_elevated', 'Elevated concern', 'elevated_risk'),
          option('opt_high', 'High concern', 'high_risk'),
        ],
      },
      {
        id: 'q_observe',
        type: 'single_choice',
        prompt: 'Can you identify this behaviour?',
        demographic: false,
        conditional_on: null,
        options: [option('opt_dont_know', "I don't know", null, ['dont_know'])],
      },
      {
        id: 'q_context_question',
        type: 'single_choice',
        prompt: 'Does this depend on the individual parrot?',
        flags: ['context_dependent'],
        demographic: false,
        conditional_on: null,
        options: [option('opt_context_answer', 'Depends on context', 'optimal')],
      },
      {
        id: 'q_hidden',
        type: 'single_choice',
        prompt: 'Hidden conditional question',
        demographic: false,
        conditional_on: {
          question_id: 'q_control',
          operator: 'equals',
          option_ids: ['opt_show'],
        },
        options: [option('opt_hidden_high', 'Hidden high concern', 'high_risk')],
      },
    ],
  },
  {
    id: 's_empty',
    number: 2,
    title: 'No highlighted items',
    indicator_icon: 'circle',
    interpretation: 'Fixture section.',
    questions: [
      {
        id: 'q_good_only',
        type: 'single_choice',
        prompt: 'Good-only question',
        demographic: false,
        conditional_on: null,
        options: [option('opt_good_only', 'Good only', 'good')],
      },
    ],
  },
  {
    id: 's_composite',
    number: 3,
    title: 'Composite answers',
    indicator_icon: 'parrot',
    interpretation: 'Fixture section.',
    questions: [
      {
        id: 'q_matrix',
        type: 'matrix',
        prompt: 'Does your parrot show these signs?',
        demographic: false,
        conditional_on: null,
        row_groups: [
          {
            label: null,
            columns: [
              column('col_matrix_no', 'No', 'optimal'),
              column('col_matrix_yes', 'Yes', null, ['vet_concern']),
            ],
            rows: [
              {
                id: 'row_matrix_swelling',
                label: 'Swelling',
                help: null,
                image_ref: null,
              },
            ],
          },
        ],
      },
      {
        id: 'q_grid_multi',
        type: 'grid',
        selection: 'multi',
        prompt: 'Which rows need more observation?',
        demographic: false,
        conditional_on: null,
        column_groups: [
          {
            id: 'group_grid_multi',
            label: '',
            help: null,
            columns: [column('col_grid_unknown', 'Not sure', null, ['dont_know'])],
          },
        ],
        rows: [
          {
            id: 'row_grid_context',
            label: 'Other row',
            help: null,
            image_ref: null,
            allow_text: false,
            flags: ['context_dependent'],
          },
        ],
      },
      {
        id: 'q_grid_single',
        type: 'grid',
        selection: 'single_per_group',
        prompt: 'Where can your parrot fly safely?',
        demographic: false,
        conditional_on: null,
        column_groups: [
          {
            id: 'group_outside',
            label: 'Outside',
            help: null,
            columns: [
              column('col_outside_yes', 'Yes', 'optimal'),
              column('col_outside_no', 'No', 'high_risk', ['behaviour_urgent']),
            ],
          },
        ],
        rows: [
          {
            id: 'row_grid_flight',
            label: 'Flight time',
            help: null,
            image_ref: null,
            allow_text: false,
          },
        ],
      },
    ],
  },
] satisfies Section[];

function option(
  id: string,
  label: string,
  welfareLevel: WelfareLevel | null,
  flags: OptionFlag[] = [],
) {
  return {
    id,
    label,
    welfare_level: welfareLevel,
    flags,
    allow_text: false,
  };
}

function column(
  id: string,
  label: string,
  welfareLevel: WelfareLevel | null,
  flags: OptionFlag[] = [],
) {
  return {
    id,
    label,
    welfare_level: welfareLevel,
    flags,
  };
}

function answer(questionId: string, optionIds: string[] = [], freeText: string | null = null): Answer {
  return {
    id: 1,
    assessmentId: 1,
    questionId,
    optionIds,
    freeText,
    welfareSnapshot: {},
    answeredAt: '2026-07-04 12:00:00',
  };
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectKeys(item));
  }

  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => [key, ...collectKeys(child)]);
  }

  return [];
}
