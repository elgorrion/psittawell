import { psittawelContentPack } from '../content/psittawel';
import type { AnswerLookup } from '../lib/assessments';
import {
  getGridGroupAnswerQuestionId,
  getGridRowAnswerQuestionId,
  getMatrixRowAnswerQuestionId,
} from '../lib/assessments';
import { buildAssessmentFormHtml, escapeHtml } from '../lib/assessmentFormReport';
import en from '../locales/en.json';

describe('buildAssessmentFormHtml', () => {
  it('renders the complete filled instrument form without embedding photos', () => {
    const html = buildAssessmentFormHtml({
      answers: richAnswers,
      appName: 'PsittaWell',
      appVersion: '1.0.0',
      completedAtLabel: 'Jul 5, 2026, 11:30 AM',
      parrotName: 'Kiwi <script>alert("x")</script> & flock',
    });

    expect(countOccurrences(html, 'data-section-id=')).toBe(8);
    expect(countOccurrences(html, 'data-question-id=')).toBe(75);
    expect(html).toContain('Section 1: General information');
    expect(html).toContain('Section 8: Maladaptive and fear-related behaviours');
    expect(countOccurrences(html, 'data-report-kind="matrix"')).toBeGreaterThan(0);
    expect(countOccurrences(html, 'data-report-kind="grid"')).toBeGreaterThan(0);
    expect(html).toContain('@page');
    expect(html).toContain('size: A4;');
    expect(countOccurrences(html, escapeHtml(psittawelContentPack.source.usage_notice))).toBe(9);
    expect(html).toContain('Reference illustration in the printed guide.');
    expect(html).not.toMatch(/<img\b/i);
    expect(html).toContain('Kiwi &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; flock');
    expect(html).toContain('Rescue &amp; foster &lt;network&gt;');
    expect(html).not.toContain('<script>');
  });

  it('marks selected radios, checkboxes, matrix cells, grid cells, and row text fields', () => {
    const html = buildAssessmentFormHtml({
      answers: richAnswers,
      appName: 'PsittaWell',
      appVersion: '1.0.0',
      completedAtLabel: 'Jul 5, 2026, 11:30 AM',
      parrotName: 'Kiwi',
    });

    expectChoiceSelected(html, 'opt_s1_observe_4plus');
    expectChoiceSelected(html, 'opt_s2_body_condition_3');
    expectChoiceSelected(html, 'opt_s3_bar_grid_pattern');
    expectChoiceSelected(html, 'opt_s3_material_other');
    expectSelectedCell(html, 'row_signs_vomiting_regurgitation', 'col_signs_acute_yes_undx', '●');
    expectSelectedCell(html, 'row_s3_location_living_room', 'col_s3_location_main', '✓');
    expectSelectedCell(html, 'row_s3_movement_branches', 'col_s3_movement_inside_yes', '●');
    expectSelectedCell(html, 'row_s3_movement_branches', 'col_s3_movement_outside_no', '●');
    expectSelectedCell(html, 'row_s5_bathing_other', 'col_s5_bathing_less_than_weekly', '●');
    expect(html).toContain('Sunroom &lt;east&gt;');
    expect(html).toContain('Ceramic dish &amp; mist');
  });

  it('renders hidden conditional questions but does not mark stale hidden answers', () => {
    const html = buildAssessmentFormHtml({
      answers: {
        q_s2_plumage: {
          optionIds: ['opt_s2_plumage_intact'],
        },
        q_s2_plumage_head: {
          optionIds: ['opt_s2_plumage_head_yes'],
        },
      },
      appName: 'PsittaWell',
      appVersion: '1.0.0',
      completedAtLabel: 'Jul 5, 2026, 11:30 AM',
      parrotName: 'Kiwi',
    });

    expect(html).toContain('data-question-id="q_s2_plumage_head"');
    expectChoiceSelected(html, 'opt_s2_plumage_intact');
    expectChoiceNotSelected(html, 'opt_s2_plumage_head_yes');
  });

  it('does not add aggregate judgement language outside verbatim instrument content', () => {
    const html = buildAssessmentFormHtml({
      answers: richAnswers,
      appName: 'PsittaWell',
      appVersion: '1.0.0',
      completedAtLabel: 'Jul 5, 2026, 11:30 AM',
      parrotName: 'Kiwi',
    });
    const chromeOnlyHtml = stripKnownVerbatimText(html);

    expect(chromeOnlyHtml).not.toMatch(
      /\b(score|scored|total|percentage|percent|grade|graded|points|ranking|ranked|overall|verdict)\b/i,
    );
  });
});

const richAnswers: AnswerLookup = {
  q_s1_name: {
    optionIds: [],
    freeText: 'Kiwi <script>alert("answer")</script>',
  },
  q_s1_species: {
    optionIds: [],
    freeText: 'Blue-and-yellow macaw',
  },
  q_s1_obtained_from: {
    optionIds: ['opt_s1_obtained_other'],
    freeText: 'Rescue & foster <network>',
  },
  q_s1_observe_frequency: {
    optionIds: ['opt_s1_observe_4plus'],
  },
  q_s2_plumage: {
    optionIds: ['opt_s2_plumage_mild'],
  },
  q_s2_plumage_head: {
    optionIds: ['opt_s2_plumage_head_no'],
  },
  q_s2_body_condition: {
    optionIds: ['opt_s2_body_condition_3'],
  },
  [getMatrixRowAnswerQuestionId('q_s2_signs_of_illness', 'row_signs_vomiting_regurgitation')]: {
    optionIds: ['col_signs_acute_yes_undx'],
  },
  q_s3_bar_orientation: {
    optionIds: ['opt_s3_bar_grid_pattern'],
  },
  q_s3_enclosure_material: {
    optionIds: ['opt_s3_material_stainless_steel', 'opt_s3_material_other'],
    freeText: 'Powder-coated panel',
  },
  [getGridRowAnswerQuestionId('q_s3_enclosure_location', 'row_s3_location_living_room')]: {
    optionIds: ['col_s3_location_main'],
  },
  [getGridRowAnswerQuestionId('q_s3_enclosure_location', 'row_s3_location_other')]: {
    optionIds: ['col_s3_location_secondary'],
    freeText: 'Sunroom <east>',
  },
  [getGridGroupAnswerQuestionId(
    'q_s3_movement_enrichment',
    'row_s3_movement_branches',
    'group_s3_movement_inside',
  )]: {
    optionIds: ['col_s3_movement_inside_yes'],
  },
  [getGridGroupAnswerQuestionId(
    'q_s3_movement_enrichment',
    'row_s3_movement_branches',
    'group_s3_movement_outside',
  )]: {
    optionIds: ['col_s3_movement_outside_no'],
  },
  [getGridGroupAnswerQuestionId(
    'q_s5_bathing_provision',
    'row_s5_bathing_other',
    'group_s5_bathing_frequency',
  )]: {
    optionIds: ['col_s5_bathing_less_than_weekly'],
  },
  [getGridRowAnswerQuestionId('q_s5_bathing_provision', 'row_s5_bathing_other')]: {
    optionIds: [],
    freeText: 'Ceramic dish & mist',
  },
};

function countOccurrences(value: string, search: string): number {
  return value.split(search).length - 1;
}

function expectChoiceSelected(html: string, optionId: string): void {
  expect(html).toContain(
    `<li class="choice-option choice-option-selected" data-option-id="${optionId}">`,
  );
}

function expectChoiceNotSelected(html: string, optionId: string): void {
  expect(html).toContain(`<li class="choice-option" data-option-id="${optionId}">`);
  expect(html).not.toContain(
    `<li class="choice-option choice-option-selected" data-option-id="${optionId}">`,
  );
}

function expectSelectedCell(
  html: string,
  rowId: string,
  columnId: string,
  mark: '●' | '✓',
): void {
  expect(html).toMatch(
    new RegExp(
      `<tr data-row-id="${escapeRegExp(rowId)}">[\\s\\S]*?` +
        `<td class="selection-cell selection-cell-selected" data-column-id="${escapeRegExp(
          columnId,
        )}">[\\s\\S]*?<span class="cell-mark">${escapeRegExp(mark)}</span>`,
    ),
  );
}

function stripKnownVerbatimText(html: string): string {
  const textValues = [
    ...collectStringValues(psittawelContentPack),
    en.about.instrument.developedBy,
  ].sort((left, right) => right.length - left.length);

  return textValues.reduce((nextHtml, text) => {
    const escapedText = escapeHtml(text);

    return escapedText.length > 0 ? nextHtml.split(escapedText).join(' ') : nextHtml;
  }, html);
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringValues(item));
  }

  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap((item) => collectStringValues(item));
  }

  return [];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
