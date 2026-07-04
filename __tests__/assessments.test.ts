import { psittawelContentPack } from '../content/psittawel';
import type { ChoiceQuestion, ContentPack, GridQuestion, MatrixQuestion } from '../content/schema';
import { getDatabase } from '../lib/db';
import {
  buildWelfareSnapshot,
  completeAssessment,
  createDraftAssessment,
  createFollowUpAssessment,
  countAnsweredVisibleQuestions,
  countUnansweredVisibleQuestions,
  deleteAssessment,
  getAnswers,
  getAssessment,
  getGridGroupAnswerQuestionId,
  getGridRowAnswerQuestionId,
  getLatestCompletedAssessment,
  getMatrixRowAnswerQuestionId,
  listCompletedAssessmentsForParrot,
  listAssessments,
} from '../lib/assessments';

jest.mock('../lib/db', () => ({
  getDatabase: jest.fn(),
}));

const getDatabaseMock = getDatabase as jest.MockedFunction<typeof getDatabase>;

let fakeDatabase: FakeAssessmentDatabase;

beforeEach(() => {
  fakeDatabase = new FakeAssessmentDatabase();
  getDatabaseMock.mockReturnValue(fakeDatabase as unknown as ReturnType<typeof getDatabase>);
});

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

  it('records selected grid column welfare levels for a multi-selection row answer', () => {
    const question = gridQuestion(clonePack().sections[2].questions[0]);

    expect(buildWelfareSnapshot(question, ['col_s3_location_main'])).toEqual({
      col_s3_location_main: null,
    });
  });

  it('records selected grid column welfare levels for a single-per-group answer', () => {
    const question = gridQuestion(clonePack().sections[2].questions[6]);

    expect(buildWelfareSnapshot(question, ['col_s3_movement_inside_no'])).toEqual({
      col_s3_movement_inside_no: 'high_risk',
    });
  });

  it('builds stable matrix row answer ids', () => {
    expect(
      getMatrixRowAnswerQuestionId('q_s2_signs_of_illness', 'row_signs_lameness'),
    ).toBe('q_s2_signs_of_illness::row_signs_lameness');
  });

  it('builds stable grid answer ids', () => {
    expect(getGridRowAnswerQuestionId('q_s3_enclosure_location', 'row_s3_location_kitchen')).toBe(
      'q_s3_enclosure_location::row_s3_location_kitchen',
    );
    expect(
      getGridGroupAnswerQuestionId(
        'q_s3_movement_enrichment',
        'row_s3_movement_branches',
        'group_s3_movement_inside',
      ),
    ).toBe('q_s3_movement_enrichment::row_s3_movement_branches::group_s3_movement_inside');
  });
});

describe('createDraftAssessment', () => {
  it('sets a fresh assessment as its own parrot lineage root', () => {
    const assessmentId = createDraftAssessment(psittawelContentPack.instrument_version);

    expect(getAssessment(assessmentId)).toMatchObject({
      id: assessmentId,
      parrotId: assessmentId,
      instrumentVersion: psittawelContentPack.instrument_version,
      status: 'draft',
      completedAt: null,
    });
  });
});

describe('completeAssessment', () => {
  it('freezes a draft assessment with a completion timestamp', () => {
    fakeDatabase.assessments = [
      assessmentRow({ id: 1, status: 'draft', completed_at: null }),
    ];

    completeAssessment(1);

    expect(getAssessment(1)).toMatchObject({
      id: 1,
      status: 'completed',
      completedAt: '2026-07-04 12:00:00',
    });
  });

  it('leaves already-completed assessments unchanged', () => {
    fakeDatabase.assessments = [
      assessmentRow({
        id: 1,
        status: 'completed',
        completed_at: '2026-07-04 09:30:00',
      }),
    ];

    completeAssessment(1);

    expect(getAssessment(1)).toMatchObject({
      id: 1,
      status: 'completed',
      completedAt: '2026-07-04 09:30:00',
    });
  });
});

describe('deleteAssessment', () => {
  it('removes a draft assessment and its answers without touching other rows', () => {
    fakeDatabase.assessments = [
      assessmentRow({ id: 1, status: 'draft' }),
      assessmentRow({ id: 2, status: 'completed', completed_at: '2026-07-04 11:00:00' }),
    ];
    fakeDatabase.answers = [
      answerRow({ id: 1, assessment_id: 1, question_id: 'q_s1_name', free_text: 'Mango' }),
      answerRow({
        id: 2,
        assessment_id: 1,
        question_id: 'q_s2_plumage',
        option_ids: '["opt_s2_plumage_intact"]',
      }),
      answerRow({ id: 3, assessment_id: 2, question_id: 'q_s1_name', free_text: 'Kiwi' }),
    ];

    deleteAssessment(1);

    expect(fakeDatabase.assessments.map((assessment) => assessment.id)).toEqual([2]);
    expect(fakeDatabase.answers).toEqual([
      expect.objectContaining({ id: 3, assessment_id: 2, question_id: 'q_s1_name' }),
    ]);
    expect(fakeDatabase.transactionCount).toBe(1);
  });

  it('removes a completed assessment and its answers without touching other rows', () => {
    fakeDatabase.assessments = [
      assessmentRow({ id: 1, status: 'draft' }),
      assessmentRow({ id: 2, status: 'completed', completed_at: '2026-07-04 11:00:00' }),
      assessmentRow({ id: 3, status: 'completed', completed_at: '2026-07-04 12:00:00' }),
    ];
    fakeDatabase.answers = [
      answerRow({ id: 1, assessment_id: 1, question_id: 'q_s1_name', free_text: 'Mango' }),
      answerRow({ id: 2, assessment_id: 2, question_id: 'q_s1_name', free_text: 'Kiwi' }),
      answerRow({ id: 3, assessment_id: 3, question_id: 'q_s1_name', free_text: 'Pepper' }),
    ];

    deleteAssessment(2);

    expect(fakeDatabase.assessments.map((assessment) => assessment.id)).toEqual([1, 3]);
    expect(fakeDatabase.answers.map((answer) => answer.assessment_id)).toEqual([1, 3]);
    expect(fakeDatabase.transactionCount).toBe(1);
  });
});

describe('listAssessments', () => {
  it('returns parrot names, statuses, and most-recent-first ordering', () => {
    fakeDatabase.assessments = [
      assessmentRow({
        id: 1,
        status: 'draft',
        started_at: '2026-07-04 09:00:00',
      }),
      assessmentRow({
        id: 2,
        status: 'completed',
        started_at: '2026-07-04 10:00:00',
        completed_at: '2026-07-04 11:00:00',
      }),
      assessmentRow({
        id: 3,
        status: 'draft',
        started_at: '2026-07-04 10:00:00',
      }),
    ];
    fakeDatabase.answers = [
      answerRow({ assessment_id: 1, question_id: 'q_s1_name', free_text: 'Mango' }),
      answerRow({ assessment_id: 2, question_id: 'q_s1_name', free_text: '  ' }),
      answerRow({ assessment_id: 3, question_id: 'q_s1_name', free_text: 'Kiwi' }),
    ];

    expect(listAssessments()).toEqual([
      expect.objectContaining({ id: 3, status: 'draft', parrotName: 'Kiwi' }),
      expect.objectContaining({ id: 2, status: 'completed', parrotName: null }),
      expect.objectContaining({ id: 1, status: 'draft', parrotName: 'Mango' }),
    ]);
  });
});

describe('getLatestCompletedAssessment', () => {
  it('returns null when no assessment has been completed', () => {
    fakeDatabase.assessments = [
      assessmentRow({ id: 1, status: 'draft' }),
      assessmentRow({ id: 2, status: 'completed', completed_at: null }),
    ];

    expect(getLatestCompletedAssessment()).toBeNull();
  });

  it('returns the most recently completed assessment with its parrot name', () => {
    fakeDatabase.assessments = [
      assessmentRow({
        id: 1,
        status: 'completed',
        completed_at: '2026-07-04 10:00:00',
      }),
      assessmentRow({
        id: 2,
        status: 'completed',
        completed_at: '2026-07-04 12:00:00',
      }),
      assessmentRow({
        id: 3,
        status: 'draft',
        started_at: '2026-07-04 13:00:00',
      }),
    ];
    fakeDatabase.answers = [
      answerRow({ assessment_id: 1, question_id: 'q_s1_name', free_text: 'Mango' }),
      answerRow({ assessment_id: 2, question_id: 'q_s1_name', free_text: '  Kiwi  ' }),
      answerRow({ assessment_id: 3, question_id: 'q_s1_name', free_text: 'Pepper' }),
    ];

    expect(getLatestCompletedAssessment()).toMatchObject({
      id: 2,
      status: 'completed',
      completedAt: '2026-07-04 12:00:00',
      parrotName: 'Kiwi',
    });
  });
});

describe('listCompletedAssessmentsForParrot', () => {
  it('returns only completed assessments in the requested lineage oldest first', () => {
    fakeDatabase.assessments = [
      assessmentRow({
        id: 1,
        parrot_id: 20,
        status: 'completed',
        started_at: '2026-05-04 09:00:00',
        completed_at: '2026-05-04 10:00:00',
      }),
      assessmentRow({
        id: 2,
        parrot_id: 20,
        status: 'draft',
        started_at: '2026-07-04 09:00:00',
      }),
      assessmentRow({
        id: 3,
        parrot_id: 20,
        status: 'completed',
        started_at: '2026-06-04 09:00:00',
        completed_at: '2026-06-04 10:00:00',
      }),
      assessmentRow({
        id: 4,
        parrot_id: 99,
        status: 'completed',
        started_at: '2026-04-04 09:00:00',
        completed_at: '2026-04-04 10:00:00',
      }),
    ];

    expect(listCompletedAssessmentsForParrot(20).map((assessment) => assessment.id)).toEqual([
      1,
      3,
    ]);
  });
});

describe('createFollowUpAssessment', () => {
  it('creates a fresh current-version draft with only present demographic answers', () => {
    fakeDatabase.assessments = [
      assessmentRow({
        id: 1,
        instrument_version: 'legacy',
        status: 'completed',
        completed_at: '2026-07-04 11:00:00',
      }),
    ];
    fakeDatabase.answers = [
      answerRow({
        id: 1,
        assessment_id: 1,
        question_id: 'q_s1_name',
        free_text: 'Mango',
        welfare_snapshot: '{}',
      }),
      answerRow({
        id: 2,
        assessment_id: 1,
        question_id: 'q_s1_species',
        free_text: 'African grey',
        welfare_snapshot: '{}',
      }),
      answerRow({
        id: 3,
        assessment_id: 1,
        question_id: 'q_s1_sex',
        option_ids: '["opt_s1_sex_female"]',
        welfare_snapshot: '{"opt_s1_sex_female":null}',
      }),
      answerRow({
        id: 4,
        assessment_id: 1,
        question_id: 'q_s1_age',
        free_text: '8 years',
        welfare_snapshot: '{}',
      }),
      answerRow({
        id: 5,
        assessment_id: 1,
        question_id: 'q_s1_duration',
        free_text: '3 years',
        welfare_snapshot: '{}',
      }),
      answerRow({
        id: 6,
        assessment_id: 1,
        question_id: 'q_s1_rearing',
        option_ids: '["opt_s1_rearing_parent"]',
        welfare_snapshot: '{"opt_s1_rearing_parent":null}',
      }),
      answerRow({
        id: 7,
        assessment_id: 1,
        question_id: 'q_s1_obtained_from',
        option_ids: '["opt_s1_obtained_breeder"]',
        welfare_snapshot: '{"opt_s1_obtained_breeder":null}',
      }),
      answerRow({
        id: 8,
        assessment_id: 1,
        question_id: 'q_s2_plumage',
        option_ids: '["opt_s2_plumage_intact"]',
        welfare_snapshot: '{"opt_s2_plumage_intact":"optimal"}',
      }),
      answerRow({
        id: 9,
        assessment_id: 1,
        question_id: 'q_s3_time_out_of_enclosure',
        option_ids: '["opt_s3_time_out_daily_3h_or_less"]',
        welfare_snapshot: '{"opt_s3_time_out_daily_3h_or_less":"moderate"}',
      }),
    ];

    const followUpId = createFollowUpAssessment(1, psittawelContentPack.sections);
    const followUpAssessment = getAssessment(followUpId);
    const followUpAnswers = answersByQuestionId(getAnswers(followUpId));

    expect(followUpId).not.toBe(1);
    expect(followUpAssessment).toMatchObject({
      id: followUpId,
      parrotId: 1,
      instrumentVersion: psittawelContentPack.instrument_version,
      status: 'draft',
      completedAt: null,
    });
    expect(Object.keys(followUpAnswers).sort()).toEqual([
      'q_s1_age',
      'q_s1_duration',
      'q_s1_name',
      'q_s1_obtained_from',
      'q_s1_rearing',
      'q_s1_sex',
      'q_s1_species',
    ]);
    expect(followUpAnswers.q_s1_name.freeText).toBe('Mango');
    expect(followUpAnswers.q_s1_species.freeText).toBe('African grey');
    expect(followUpAnswers.q_s1_sex.optionIds).toEqual(['opt_s1_sex_female']);
    expect(followUpAnswers.q_s1_age.freeText).toBe('8 years');
    expect(followUpAnswers.q_s1_duration.freeText).toBe('3 years');
    expect(followUpAnswers.q_s1_rearing.optionIds).toEqual(['opt_s1_rearing_parent']);
    expect(followUpAnswers.q_s1_obtained_from.optionIds).toEqual([
      'opt_s1_obtained_breeder',
    ]);
    expect(followUpAnswers.q_s2_plumage).toBeUndefined();
    expect(followUpAnswers.q_s3_time_out_of_enclosure).toBeUndefined();
    expect(getAssessment(1)).toMatchObject({ id: 1, status: 'completed' });
  });

  it('inherits one parrot lineage across a chain of follow-up assessments', () => {
    fakeDatabase.assessments = [
      assessmentRow({
        id: 1,
        parrot_id: 81,
        status: 'completed',
        completed_at: '2026-07-04 11:00:00',
      }),
    ];

    const secondAssessmentId = createFollowUpAssessment(1, psittawelContentPack.sections);
    const thirdAssessmentId = createFollowUpAssessment(
      secondAssessmentId,
      psittawelContentPack.sections,
    );

    expect(getAssessment(1)?.parrotId).toBe(81);
    expect(getAssessment(secondAssessmentId)?.parrotId).toBe(81);
    expect(getAssessment(thirdAssessmentId)?.parrotId).toBe(81);
  });

  it('copies only the demographic answers that exist on a partial source', () => {
    fakeDatabase.assessments = [
      assessmentRow({
        id: 4,
        status: 'draft',
      }),
    ];
    fakeDatabase.answers = [
      answerRow({
        id: 1,
        assessment_id: 4,
        question_id: 'q_s1_name',
        free_text: 'Kiwi',
        welfare_snapshot: '{}',
      }),
      answerRow({
        id: 2,
        assessment_id: 4,
        question_id: 'q_s1_age',
        free_text: 'unknown',
        welfare_snapshot: '{}',
      }),
      answerRow({
        id: 3,
        assessment_id: 4,
        question_id: 'q_s2_plumage',
        option_ids: '["opt_s2_plumage_intact"]',
        welfare_snapshot: '{"opt_s2_plumage_intact":"optimal"}',
      }),
    ];

    const followUpId = createFollowUpAssessment(4, psittawelContentPack.sections);

    expect(Object.keys(answersByQuestionId(getAnswers(followUpId))).sort()).toEqual([
      'q_s1_age',
      'q_s1_name',
    ]);
  });
});

describe('countAnsweredVisibleQuestions', () => {
  it('counts only currently-visible questions', () => {
    const section = clonePack().sections[1];

    expect(
      countAnsweredVisibleQuestions(section, {
        q_s2_plumage: {
          optionIds: ['opt_s2_plumage_intact'],
          freeText: '',
        },
      }),
    ).toEqual({ answered: 1, total: 6 });

    expect(
      countAnsweredVisibleQuestions(section, {
        q_s2_plumage: {
          optionIds: ['opt_s2_plumage_mild'],
          freeText: '',
        },
        q_s2_plumage_head: {
          optionIds: ['opt_s2_plumage_head_no'],
          freeText: '',
        },
      }),
    ).toEqual({ answered: 2, total: 7 });
  });

  it('counts a matrix question only when every row has an answer', () => {
    const section = clonePack().sections[1];
    const question = matrixQuestion(section.questions[5]);
    const [firstRow] = question.row_groups[0].rows;

    expect(
      countAnsweredVisibleQuestions(section, {
        [getMatrixRowAnswerQuestionId(question.id, firstRow.id)]: {
          optionIds: ['col_signs_acute_no'],
          freeText: '',
        },
      }),
    ).toEqual({ answered: 0, total: 6 });

    const matrixAnswers = Object.fromEntries(
      question.row_groups.flatMap((rowGroup) =>
        rowGroup.rows.map((row) => [
          getMatrixRowAnswerQuestionId(question.id, row.id),
          { optionIds: [rowGroup.columns[0].id], freeText: '' },
        ]),
      ),
    );

    expect(countAnsweredVisibleQuestions(section, matrixAnswers)).toEqual({
      answered: 1,
      total: 6,
    });
  });

  it('counts a multi-selection grid when any row has a selection', () => {
    const section = clonePack().sections[2];
    const question = gridQuestion(section.questions[0]);

    expect(countAnsweredVisibleQuestions(section, {})).toEqual({ answered: 0, total: 23 });

    expect(
      countAnsweredVisibleQuestions(section, {
        [getGridRowAnswerQuestionId(question.id, 'row_s3_location_kitchen')]: {
          optionIds: ['col_s3_location_main', 'col_s3_location_secondary'],
          freeText: '',
        },
      }),
    ).toEqual({ answered: 1, total: 23 });
  });

  it('counts a single-per-group grid only when every row and group has an answer', () => {
    const section = clonePack().sections[2];
    const question = gridQuestion(section.questions[6]);
    const firstAnswerKey = getGridGroupAnswerQuestionId(
      question.id,
      question.rows[0].id,
      question.column_groups[0].id,
    );

    expect(
      countAnsweredVisibleQuestions(section, {
        [firstAnswerKey]: {
          optionIds: [question.column_groups[0].columns[0].id],
          freeText: '',
        },
      }),
    ).toEqual({ answered: 0, total: 23 });

    const gridAnswers = Object.fromEntries(
      question.rows.flatMap((row) =>
        question.column_groups.map((columnGroup) => [
          getGridGroupAnswerQuestionId(question.id, row.id, columnGroup.id),
          { optionIds: [columnGroup.columns[0].id], freeText: '' },
        ]),
      ),
    );

    expect(countAnsweredVisibleQuestions(section, gridAnswers)).toEqual({
      answered: 1,
      total: 23,
    });
  });
});

describe('countUnansweredVisibleQuestions', () => {
  it('derives unanswered totals from the same visible-question progress rule', () => {
    const section = clonePack().sections[1];
    const progress = countAnsweredVisibleQuestions(section, {
      q_s2_plumage: {
        optionIds: ['opt_s2_plumage_mild'],
        freeText: '',
      },
      q_s2_plumage_head: {
        optionIds: ['opt_s2_plumage_head_no'],
        freeText: '',
      },
    });

    expect(countUnansweredVisibleQuestions([section], {
      q_s2_plumage: {
        optionIds: ['opt_s2_plumage_mild'],
        freeText: '',
      },
      q_s2_plumage_head: {
        optionIds: ['opt_s2_plumage_head_no'],
        freeText: '',
      },
    })).toBe(progress.total - progress.answered);
  });

  it('keeps matrix and grid counting identical to section progress', () => {
    const matrixSection = clonePack().sections[1];
    const matrix = matrixQuestion(matrixSection.questions[5]);
    const matrixAnswers = Object.fromEntries(
      matrix.row_groups.flatMap((rowGroup) =>
        rowGroup.rows.map((row) => [
          getMatrixRowAnswerQuestionId(matrix.id, row.id),
          { optionIds: [rowGroup.columns[0].id], freeText: '' },
        ]),
      ),
    );

    expect(countUnansweredVisibleQuestions([matrixSection], matrixAnswers)).toBe(5);

    const gridSection = clonePack().sections[2];
    const multiGrid = gridQuestion(gridSection.questions[0]);
    const singlePerGroupGrid = gridQuestion(gridSection.questions[6]);
    const gridAnswers = {
      [getGridRowAnswerQuestionId(multiGrid.id, 'row_s3_location_kitchen')]: {
        optionIds: ['col_s3_location_main'],
        freeText: '',
      },
      ...Object.fromEntries(
        singlePerGroupGrid.rows.flatMap((row) =>
          singlePerGroupGrid.column_groups.map((columnGroup) => [
            getGridGroupAnswerQuestionId(singlePerGroupGrid.id, row.id, columnGroup.id),
            { optionIds: [columnGroup.columns[0].id], freeText: '' },
          ]),
        ),
      ),
    };

    expect(countUnansweredVisibleQuestions([gridSection], gridAnswers)).toBe(21);
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

function gridQuestion(question: ContentPack['sections'][number]['questions'][number]): GridQuestion {
  if (question.type !== 'grid') {
    throw new Error(`Question ${question.id} is not a grid question.`);
  }

  return question;
}

function answersByQuestionId(answers: ReturnType<typeof getAnswers>) {
  return Object.fromEntries(answers.map((answer) => [answer.questionId, answer]));
}

type AssessmentTableRow = {
  id: number;
  parrot_id: number | null;
  instrument_version: string;
  status: string;
  started_at: string;
  completed_at: string | null;
};

type AnswerTableRow = {
  id: number;
  assessment_id: number;
  question_id: string;
  option_ids: string | null;
  free_text: string | null;
  welfare_snapshot: string | null;
  answered_at: string;
};

type AssessmentRowInput = Partial<AssessmentTableRow> & {
  id: number;
};

type AnswerRowInput = Partial<AnswerTableRow> & {
  assessment_id: number;
  question_id: string;
};

class FakeAssessmentDatabase {
  assessments: AssessmentTableRow[] = [];
  answers: AnswerTableRow[] = [];
  transactionCount = 0;

  withTransactionSync(task: () => void) {
    this.transactionCount += 1;
    task();
  }

  runSync(sql: string, params: unknown[] = []) {
    if (sql.includes('INSERT INTO assessment')) {
      const [instrumentVersion, status] = params;
      const nextId = Math.max(0, ...this.assessments.map((assessment) => assessment.id)) + 1;

      this.assessments.push(
        assessmentRow({
          id: nextId,
          parrot_id: null,
          instrument_version: String(instrumentVersion),
          status: String(status),
          started_at: '2026-07-04 12:00:00',
        }),
      );

      return { lastInsertRowId: nextId };
    }

    if (sql.includes('SET parrot_id = ?')) {
      const [parrotId, id] = params;
      const assessment = this.assessments.find((row) => row.id === id);

      if (assessment) {
        assessment.parrot_id = Number(parrotId);
      }

      return { lastInsertRowId: 0 };
    }

    if (sql.includes('SET status = ?')) {
      const [nextStatus, id, currentStatus] = params;
      const assessment = this.assessments.find(
        (row) => row.id === id && row.status === currentStatus,
      );

      if (assessment) {
        assessment.status = String(nextStatus);
        assessment.completed_at = '2026-07-04 12:00:00';
      }

      return { lastInsertRowId: 0 };
    }

    if (sql.includes('INSERT INTO answer')) {
      const [assessmentId, questionId, optionIds, freeText, welfareSnapshot] = params;
      const existingAnswer = this.answers.find(
        (answer) =>
          answer.assessment_id === assessmentId && answer.question_id === questionId,
      );

      if (existingAnswer) {
        existingAnswer.option_ids = nullableString(optionIds);
        existingAnswer.free_text = nullableString(freeText);
        existingAnswer.welfare_snapshot = nullableString(welfareSnapshot);
        existingAnswer.answered_at = '2026-07-04 12:00:00';
      } else {
        const nextId = Math.max(0, ...this.answers.map((answer) => answer.id)) + 1;

        this.answers.push(
          answerRow({
            id: nextId,
            assessment_id: Number(assessmentId),
            question_id: String(questionId),
            option_ids: nullableString(optionIds),
            free_text: nullableString(freeText),
            welfare_snapshot: nullableString(welfareSnapshot),
            answered_at: '2026-07-04 12:00:00',
          }),
        );
      }

      return { lastInsertRowId: 0 };
    }

    if (sql.includes('DELETE FROM answer')) {
      const [assessmentId] = params;
      this.answers = this.answers.filter(
        (answer) => answer.assessment_id !== Number(assessmentId),
      );

      return { lastInsertRowId: 0 };
    }

    if (sql.includes('DELETE FROM assessment')) {
      const [id] = params;
      this.assessments = this.assessments.filter(
        (assessment) => assessment.id !== Number(id),
      );

      return { lastInsertRowId: 0 };
    }

    throw new Error(`Unsupported runSync SQL: ${sql}`);
  }

  getFirstSync<TRow>(sql: string, params: unknown[] = []): TRow | null {
    if (sql.includes('FROM assessment') && sql.includes('LEFT JOIN answer')) {
      const [nameQuestionId, status] = params;
      const latestCompletedAssessment = this.assessments
        .filter(
          (assessment) =>
            assessment.status === status && assessment.completed_at !== null,
        )
        .sort((left, right) => {
          const dateOrder = (right.completed_at ?? '').localeCompare(left.completed_at ?? '');
          return dateOrder !== 0 ? dateOrder : right.id - left.id;
        })[0];

      if (!latestCompletedAssessment) {
        return null;
      }

      const name = this.answers.find(
        (answer) =>
          answer.assessment_id === latestCompletedAssessment.id &&
          answer.question_id === nameQuestionId,
      )?.free_text;

      return {
        ...latestCompletedAssessment,
        parrot_name: name && name.trim().length > 0 ? name.trim() : null,
      } as TRow;
    }

    if (sql.includes('FROM assessment') && sql.includes('WHERE id = ?')) {
      const [id] = params;
      return (this.assessments.find((row) => row.id === id) ?? null) as TRow | null;
    }

    throw new Error(`Unsupported getFirstSync SQL: ${sql}`);
  }

  getAllSync<TRow>(sql: string, params: unknown[] = []): TRow[] {
    if (sql.includes('FROM answer') && sql.includes('WHERE assessment_id = ?')) {
      const [assessmentId] = params;

      return this.answers
        .filter((answer) => answer.assessment_id === assessmentId)
        .sort((left, right) => left.id - right.id) as TRow[];
    }

    if (sql.includes('FROM assessment') && sql.includes('LEFT JOIN answer')) {
      const [nameQuestionId] = params;

      return this.assessments
        .map((assessment) => {
          const name = this.answers.find(
            (answer) =>
              answer.assessment_id === assessment.id && answer.question_id === nameQuestionId,
          )?.free_text;

          return {
            ...assessment,
            parrot_name: name && name.trim().length > 0 ? name.trim() : null,
          };
        })
        .sort((left, right) => {
          const dateOrder = right.started_at.localeCompare(left.started_at);
          return dateOrder !== 0 ? dateOrder : right.id - left.id;
        }) as TRow[];
    }

    if (sql.includes('FROM assessment') && sql.includes('WHERE parrot_id = ?')) {
      const [parrotId, status] = params;

      return this.assessments
        .filter((assessment) => assessment.parrot_id === parrotId && assessment.status === status)
        .sort((left, right) => {
          const leftDate = left.completed_at ?? left.started_at;
          const rightDate = right.completed_at ?? right.started_at;
          const dateOrder = leftDate.localeCompare(rightDate);
          return dateOrder !== 0 ? dateOrder : left.id - right.id;
        }) as TRow[];
    }

    throw new Error(`Unsupported getAllSync SQL: ${sql}`);
  }
}

function nullableString(value: unknown): string | null {
  return value === null ? null : String(value);
}

function assessmentRow(input: AssessmentRowInput): AssessmentTableRow {
  return {
    parrot_id: input.parrot_id === undefined ? input.id : input.parrot_id,
    instrument_version: '1',
    status: 'draft',
    started_at: '2026-07-04 09:00:00',
    completed_at: null,
    ...input,
  };
}

function answerRow(input: AnswerRowInput): AnswerTableRow {
  return {
    id: input.assessment_id,
    option_ids: null,
    free_text: null,
    welfare_snapshot: null,
    answered_at: '2026-07-04 09:00:00',
    ...input,
  };
}

function matrixQuestion(question: ContentPack['sections'][number]['questions'][number]): MatrixQuestion {
  if (question.type !== 'matrix') {
    throw new Error(`Question ${question.id} is not a matrix question.`);
  }

  return question;
}
