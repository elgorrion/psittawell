import { parseSqliteTimestamp, type Assessment } from '../lib/assessments';
import type { OptionFlag, Section, WelfareLevel } from '../content/schema';
import { buildAssessmentResults } from '../lib/results';
import { buildParrotTimeline, buildParrotTimelineDateLabels } from '../lib/trends';

describe('buildParrotTimeline', () => {
  it('builds per-indicator entries across completed assessments only', () => {
    const timeline = buildParrotTimeline(
      [
        completedAssessment(1, '2026-05-04 10:00:00'),
        completedAssessment(2, '2026-06-04 10:00:00'),
        draftAssessment(3, '2026-06-20 09:00:00'),
        completedAssessment(4, '2026-07-04 10:00:00'),
      ],
      {
        1: buildAssessmentResults(fixtureSections, [
          answer('q_body', ['opt_body_high']),
          answer('q_bar', ['opt_bar_vertical']),
          answer('q_observe', ['opt_observe_unknown']),
        ]),
        2: buildAssessmentResults(fixtureSections, [
          answer('q_body', ['opt_body_good']),
          answer('q_bar', ['opt_bar_safe']),
          answer('q_observe', ['opt_observe_clear']),
        ]),
        3: buildAssessmentResults(fixtureSections, [answer('q_draft_only', ['opt_draft_high'])]),
        4: buildAssessmentResults(fixtureSections, []),
      },
    );

    expect(timeline.dates.map((date) => date.assessmentId)).toEqual([1, 2, 4]);
    expect(timeline.indicators.map((indicator) => indicator.indicatorId)).toEqual([
      'q_body',
      'q_observe',
      'q_bar::opt_bar_vertical',
    ]);
    expect(timeline.indicators).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ indicatorId: 'q_draft_only' })]),
    );

    expect(timeline.indicators[0]).toMatchObject({
      sectionId: 's_health',
      sectionTitle: 'Physical health',
      questionId: 'q_body',
      questionPrompt: 'How is the body condition?',
      entries: [
        {
          assessmentId: 1,
          state: 'welfare_level',
          optionLabel: 'High concern',
          welfareLevel: 'high_risk',
        },
        {
          assessmentId: 2,
          state: 'welfare_level',
          optionLabel: 'Good condition',
          welfareLevel: 'good',
        },
        {
          assessmentId: 4,
          state: 'not_answered',
        },
      ],
    });
    expect(timeline.indicators[1].entries[0]).toEqual({
      assessmentId: 1,
      state: 'flag',
      optionLabel: "I don't know",
      welfareLevel: null,
      flags: ['dont_know'],
    });
    expect(timeline.indicators[2].entries).toEqual([
      {
        assessmentId: 1,
        state: 'welfare_level',
        optionLabel: 'Vertical bars',
        welfareLevel: 'high_risk',
        flags: [],
      },
      {
        assessmentId: 2,
        state: 'not_flagged',
      },
      {
        assessmentId: 4,
        state: 'not_answered',
      },
    ]);
  });

  it('returns dates but no indicator rows for a single completed assessment', () => {
    const timeline = buildParrotTimeline(
      [completedAssessment(1, '2026-05-04 10:00:00')],
      {
        1: buildAssessmentResults(fixtureSections, [answer('q_body', ['opt_body_high'])]),
      },
    );

    expect(timeline).toEqual({
      dates: [{ assessmentId: 1, date: '2026-05-04 10:00:00' }],
      indicators: [],
    });
  });

  it('tolerates an empty lineage', () => {
    expect(buildParrotTimeline([], {})).toEqual({
      dates: [],
      indicators: [],
    });
  });

  it('exposes no aggregate scoring fields', () => {
    const timeline = buildParrotTimeline(
      [
        completedAssessment(1, '2026-05-04 10:00:00'),
        completedAssessment(2, '2026-06-04 10:00:00'),
      ],
      {
        1: buildAssessmentResults(fixtureSections, [answer('q_body', ['opt_body_high'])]),
        2: buildAssessmentResults(fixtureSections, [answer('q_body', ['opt_body_good'])]),
      },
    );
    const forbiddenFieldTerms = [
      'score',
      'total',
      'percentage',
      'index',
      'average',
      'count',
    ];
    const keys = collectKeys(timeline).map((key) => key.toLowerCase());

    for (const term of forbiddenFieldTerms) {
      expect(keys.some((key) => key.includes(term))).toBe(false);
    }
  });
});

describe('buildParrotTimelineDateLabels', () => {
  it('adds time suffixes to same-day date collisions', () => {
    const labels = buildParrotTimelineDateLabels(
      [
        { assessmentId: 1, date: '2026-07-04 10:00:00' },
        { assessmentId: 2, date: '2026-07-04 14:30:00' },
      ],
      'en-GB',
    );

    expect(labels).toHaveLength(2);
    expect(labels[0].label).toContain(formatDate('2026-07-04 10:00:00', 'en-GB'));
    expect(labels[0].label).toContain(formatTime('2026-07-04 10:00:00', 'en-GB'));
    expect(labels[1].label).toContain(formatDate('2026-07-04 14:30:00', 'en-GB'));
    expect(labels[1].label).toContain(formatTime('2026-07-04 14:30:00', 'en-GB'));
    expect(labels[0].label).not.toBe(labels[1].label);
  });

  it('keeps different-day labels date-only', () => {
    expect(
      buildParrotTimelineDateLabels(
        [
          { assessmentId: 1, date: '2026-07-04 10:00:00' },
          { assessmentId: 2, date: '2026-07-05 10:00:00' },
        ],
        'en-GB',
      ),
    ).toEqual([
      {
        assessmentId: 1,
        label: formatDate('2026-07-04 10:00:00', 'en-GB'),
      },
      {
        assessmentId: 2,
        label: formatDate('2026-07-05 10:00:00', 'en-GB'),
      },
    ]);
  });

  it('only adds times to the colliding labels in a mixed timeline', () => {
    const labels = buildParrotTimelineDateLabels(
      [
        { assessmentId: 1, date: '2026-07-04 10:00:00' },
        { assessmentId: 2, date: '2026-07-05 10:00:00' },
        { assessmentId: 3, date: '2026-07-04 14:30:00' },
      ],
      'en-GB',
    );

    expect(labels[0].label).toContain(formatTime('2026-07-04 10:00:00', 'en-GB'));
    expect(labels[1]).toEqual({
      assessmentId: 2,
      label: formatDate('2026-07-05 10:00:00', 'en-GB'),
    });
    expect(labels[2].label).toContain(formatTime('2026-07-04 14:30:00', 'en-GB'));
  });
});

const fixtureSections = [
  {
    id: 's_health',
    number: 1,
    title: 'Physical health',
    indicator_icon: 'parrot',
    interpretation: 'Fixture section.',
    questions: [
      {
        id: 'q_body',
        type: 'single_choice',
        prompt: 'How is the body condition?',
        demographic: false,
        conditional_on: null,
        options: [
          option('opt_body_good', 'Good condition', 'good'),
          option('opt_body_high', 'High concern', 'high_risk'),
        ],
      },
      {
        id: 'q_observe',
        type: 'single_choice',
        prompt: 'Can you observe this sign?',
        demographic: false,
        conditional_on: null,
        options: [
          option('opt_observe_clear', 'Clear answer', null),
          option('opt_observe_unknown', "I don't know", null, ['dont_know']),
        ],
      },
      {
        id: 'q_draft_only',
        type: 'single_choice',
        prompt: 'Draft-only concern',
        demographic: false,
        conditional_on: null,
        options: [option('opt_draft_high', 'Draft high', 'high_risk')],
      },
    ],
  },
  {
    id: 's_housing',
    number: 2,
    title: 'Housing',
    indicator_icon: 'house',
    interpretation: 'Fixture section.',
    questions: [
      {
        id: 'q_bar',
        type: 'multi_choice',
        prompt: 'Which bars are present?',
        demographic: false,
        conditional_on: null,
        options: [
          option('opt_bar_safe', 'Safe bars', 'optimal'),
          option('opt_bar_vertical', 'Vertical bars', 'high_risk'),
        ],
      },
    ],
  },
] satisfies Section[];

function completedAssessment(id: number, completedAt: string): Assessment {
  return {
    id,
    parrotId: 10,
    instrumentVersion: '1',
    status: 'completed',
    startedAt: completedAt,
    completedAt,
  };
}

function draftAssessment(id: number, startedAt: string): Assessment {
  return {
    id,
    parrotId: 10,
    instrumentVersion: '1',
    status: 'draft',
    startedAt,
    completedAt: null,
  };
}

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

function answer(questionId: string, optionIds: string[]) {
  return {
    id: 1,
    assessmentId: 1,
    questionId,
    optionIds,
    freeText: null,
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

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseSqliteTimestamp(value));
}

function formatTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parseSqliteTimestamp(value));
}
