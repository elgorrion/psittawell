import { getDatabase } from './db';
import { isQuestionVisible } from './conditionals';
import { psittawelContentPack } from '../content/psittawel';
import type { GridQuestion, MatrixQuestion, Question, Section, WelfareLevel } from '../content/schema';

export const parrotNameQuestionId = 'q_s1_name';

export type AssessmentStatus = 'draft' | 'completed';

export type WelfareSnapshot = Record<string, WelfareLevel | null>;

export type AnswerInput = {
  optionIds?: readonly string[] | null;
  freeText?: string | null;
  welfareSnapshot?: WelfareSnapshot | null;
};

export type Answer = {
  id: number;
  assessmentId: number;
  questionId: string;
  optionIds: string[];
  freeText: string | null;
  welfareSnapshot: WelfareSnapshot;
  answeredAt: string;
};

export type Assessment = {
  id: number;
  parrotId: number;
  instrumentVersion: string;
  status: AssessmentStatus;
  startedAt: string;
  completedAt: string | null;
};

export type AssessmentSummary = Assessment & {
  parrotName: string | null;
};

export type AnswerLookup = Record<
  string,
  | {
      optionIds: readonly string[];
      freeText?: string | null;
    }
  | undefined
>;

export type SectionAnswerProgress = {
  answered: number;
  total: number;
};

export function getMatrixRowAnswerQuestionId(matrixQuestionId: string, rowId: string): string {
  return `${matrixQuestionId}::${rowId}`;
}

export function getGridRowAnswerQuestionId(gridQuestionId: string, rowId: string): string {
  return `${gridQuestionId}::${rowId}`;
}

export function getGridGroupAnswerQuestionId(
  gridQuestionId: string,
  rowId: string,
  groupId: string,
): string {
  return `${gridQuestionId}::${rowId}::${groupId}`;
}

type AssessmentRow = {
  id: number;
  parrot_id: number | null;
  instrument_version: string;
  status: string;
  started_at: string;
  completed_at: string | null;
};

type AssessmentSummaryRow = AssessmentRow & {
  parrot_name: string | null;
};

type AnswerRow = {
  id: number;
  assessment_id: number;
  question_id: string;
  option_ids: string | null;
  free_text: string | null;
  welfare_snapshot: string | null;
  answered_at: string;
};

export function createDraftAssessment(instrumentVersion: string): number {
  const database = getDatabase();
  const result = database.runSync(
    'INSERT INTO assessment (instrument_version, status) VALUES (?, ?)',
    [instrumentVersion, 'draft'],
  );
  const assessmentId = Number(result.lastInsertRowId);

  setAssessmentParrotId(assessmentId, assessmentId);

  return assessmentId;
}

export function createFollowUpAssessment(
  sourceAssessmentId: number,
  sections: readonly Section[],
): number {
  const sourceAssessment = getAssessment(sourceAssessmentId);

  if (!sourceAssessment) {
    throw new Error(`Assessment ${sourceAssessmentId} could not be opened.`);
  }

  const followUpAssessmentId = createDraftAssessment(psittawelContentPack.instrument_version);
  setAssessmentParrotId(followUpAssessmentId, sourceAssessment.parrotId);
  const demographicQuestionIds = new Set(
    sections.flatMap((section) =>
      section.questions
        .filter((question) => question.demographic)
        .map((question) => question.id),
    ),
  );

  for (const answer of getAnswers(sourceAssessmentId)) {
    if (!demographicQuestionIds.has(answer.questionId)) {
      continue;
    }

    upsertAnswer(followUpAssessmentId, answer.questionId, {
      optionIds: answer.optionIds,
      freeText: answer.freeText,
      welfareSnapshot: answer.welfareSnapshot,
    });
  }

  return followUpAssessmentId;
}

export function getAssessment(id: number): Assessment | null {
  const database = getDatabase();
  const row = database.getFirstSync<AssessmentRow>(
    `
      SELECT id, parrot_id, instrument_version, status, started_at, completed_at
      FROM assessment
      WHERE id = ?
    `,
    [id],
  );

  return row ? mapAssessmentRow(row) : null;
}

export function listAssessments(): AssessmentSummary[] {
  const database = getDatabase();
  const rows = database.getAllSync<AssessmentSummaryRow>(
    `
      SELECT
        assessment.id,
        assessment.parrot_id,
        assessment.instrument_version,
        assessment.status,
        assessment.started_at,
        assessment.completed_at,
        NULLIF(TRIM(name_answer.free_text), '') AS parrot_name
      FROM assessment
      LEFT JOIN answer AS name_answer
        ON name_answer.assessment_id = assessment.id
        AND name_answer.question_id = ?
      ORDER BY assessment.started_at DESC, assessment.id DESC
    `,
    [parrotNameQuestionId],
  );

  return rows.map((row) => ({
    ...mapAssessmentRow(row),
    parrotName: row.parrot_name,
  }));
}

export function getLatestCompletedAssessment(): AssessmentSummary | null {
  const database = getDatabase();
  const row = database.getFirstSync<AssessmentSummaryRow>(
    `
      SELECT
        assessment.id,
        assessment.parrot_id,
        assessment.instrument_version,
        assessment.status,
        assessment.started_at,
        assessment.completed_at,
        NULLIF(TRIM(name_answer.free_text), '') AS parrot_name
      FROM assessment
      LEFT JOIN answer AS name_answer
        ON name_answer.assessment_id = assessment.id
        AND name_answer.question_id = ?
      WHERE assessment.status = ? AND assessment.completed_at IS NOT NULL
      ORDER BY assessment.completed_at DESC, assessment.id DESC
      LIMIT 1
    `,
    [parrotNameQuestionId, 'completed'],
  );

  return row
    ? {
        ...mapAssessmentRow(row),
        parrotName: row.parrot_name,
      }
    : null;
}

export function listCompletedAssessmentsForParrot(parrotId: number): Assessment[] {
  const database = getDatabase();
  const rows = database.getAllSync<AssessmentRow>(
    `
      SELECT id, parrot_id, instrument_version, status, started_at, completed_at
      FROM assessment
      WHERE parrot_id = ? AND status = ?
      ORDER BY COALESCE(completed_at, started_at) ASC, id ASC
    `,
    [parrotId, 'completed'],
  );

  return rows.map(mapAssessmentRow);
}

export function deleteAssessment(id: number): void {
  const database = getDatabase();

  database.withTransactionSync(() => {
    database.runSync('DELETE FROM answer WHERE assessment_id = ?', [id]);
    database.runSync('DELETE FROM assessment WHERE id = ?', [id]);
  });
}

export function completeAssessment(id: number): void {
  const database = getDatabase();

  database.runSync(
    `
      UPDATE assessment
      SET status = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = ?
    `,
    ['completed', id, 'draft'],
  );
}

export function upsertAnswer(
  assessmentId: number,
  questionId: string,
  { optionIds = null, freeText = null, welfareSnapshot = null }: AnswerInput,
) {
  const assessment = getAssessment(assessmentId);

  if (assessment?.status !== 'draft') {
    return;
  }

  const database = getDatabase();

  database.runSync(
    `
      INSERT INTO answer (assessment_id, question_id, option_ids, free_text, welfare_snapshot)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(assessment_id, question_id) DO UPDATE SET
        option_ids = excluded.option_ids,
        free_text = excluded.free_text,
        welfare_snapshot = excluded.welfare_snapshot,
        answered_at = CURRENT_TIMESTAMP
    `,
    [
      assessmentId,
      questionId,
      optionIds === null ? null : JSON.stringify(optionIds),
      freeText,
      welfareSnapshot === null ? null : JSON.stringify(welfareSnapshot),
    ],
  );
}

export function getAnswers(assessmentId: number): Answer[] {
  const database = getDatabase();
  const rows = database.getAllSync<AnswerRow>(
    `
      SELECT id, assessment_id, question_id, option_ids, free_text, welfare_snapshot, answered_at
      FROM answer
      WHERE assessment_id = ?
      ORDER BY id ASC
    `,
    [assessmentId],
  );

  return rows.map((row) => ({
    id: row.id,
    assessmentId: row.assessment_id,
    questionId: row.question_id,
    optionIds: parseStringArray(row.option_ids),
    freeText: row.free_text,
    welfareSnapshot: parseWelfareSnapshot(row.welfare_snapshot),
    answeredAt: row.answered_at,
  }));
}

export function mapAnswersByQuestion(answers: readonly Answer[]): AnswerLookup {
  return answers.reduce<AnswerLookup>((nextAnswers, answer) => {
    nextAnswers[answer.questionId] = {
      optionIds: answer.optionIds,
      freeText: answer.freeText,
    };

    return nextAnswers;
  }, {});
}

export function countAnsweredVisibleQuestions(
  section: Section,
  answers: AnswerLookup,
): SectionAnswerProgress {
  const visibleQuestions = section.questions.filter((question) => isQuestionVisible(question, answers));
  const answered = visibleQuestions.filter((question) => isQuestionAnswered(question, answers)).length;

  return {
    answered,
    total: visibleQuestions.length,
  };
}

export function countUnansweredVisibleQuestions(
  sections: readonly Section[],
  answers: AnswerLookup,
): number {
  return sections.reduce((unansweredCount, section) => {
    const progress = countAnsweredVisibleQuestions(section, answers);

    return unansweredCount + Math.max(0, progress.total - progress.answered);
  }, 0);
}

export function buildWelfareSnapshot(
  question: Question,
  optionIds: readonly string[] | null | undefined,
): WelfareSnapshot {
  const selectedOptionIds = optionIds ?? [];

  if (selectedOptionIds.length === 0) {
    return {};
  }

  if (question.type === 'free_text') {
    throw new Error(`Question ${question.id} does not have selectable options.`);
  }

  const welfareByOptionId = new Map<string, WelfareLevel | null>();

  if (question.type === 'matrix') {
    for (const rowGroup of question.row_groups) {
      for (const column of rowGroup.columns) {
        welfareByOptionId.set(column.id, column.welfare_level);
      }
    }
  } else if (question.type === 'grid') {
    for (const columnGroup of question.column_groups) {
      for (const column of columnGroup.columns) {
        welfareByOptionId.set(column.id, column.welfare_level);
      }
    }
  } else {
    for (const option of question.options) {
      welfareByOptionId.set(option.id, option.welfare_level);
    }
  }

  return selectedOptionIds.reduce<WelfareSnapshot>((snapshot, optionId) => {
    if (!welfareByOptionId.has(optionId)) {
      throw new Error(`Question ${question.id} has no option ${optionId}.`);
    }

    snapshot[optionId] = welfareByOptionId.get(optionId) ?? null;
    return snapshot;
  }, {});
}

function isQuestionAnswered(question: Question, answers: AnswerLookup): boolean {
  if (question.type === 'free_text') {
    return (answers[question.id]?.freeText ?? '').trim().length > 0;
  }

  if (question.type === 'matrix') {
    return getMatrixRowIds(question).every((rowId) =>
      isChoiceAnswered(answers[getMatrixRowAnswerQuestionId(question.id, rowId)]),
    );
  }

  if (question.type === 'grid') {
    return isGridQuestionAnswered(question, answers);
  }

  return isChoiceAnswered(answers[question.id]);
}

function isChoiceAnswered(answer: AnswerLookup[string]): boolean {
  return (answer?.optionIds.length ?? 0) > 0;
}

function getMatrixRowIds(question: MatrixQuestion): string[] {
  return question.row_groups.flatMap((rowGroup) => rowGroup.rows.map((row) => row.id));
}

function isGridQuestionAnswered(question: GridQuestion, answers: AnswerLookup): boolean {
  if (question.selection === 'multi') {
    return question.rows.some((row) =>
      isChoiceAnswered(answers[getGridRowAnswerQuestionId(question.id, row.id)]),
    );
  }

  return question.rows.every((row) =>
    question.column_groups.every((columnGroup) =>
      isChoiceAnswered(
        answers[getGridGroupAnswerQuestionId(question.id, row.id, columnGroup.id)],
      ),
    ),
  );
}

function mapAssessmentRow(row: AssessmentRow): Assessment {
  return {
    id: row.id,
    parrotId: row.parrot_id ?? row.id,
    instrumentVersion: row.instrument_version,
    status: parseAssessmentStatus(row.status),
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function setAssessmentParrotId(assessmentId: number, parrotId: number): void {
  const database = getDatabase();

  database.runSync(
    `
      UPDATE assessment
      SET parrot_id = ?
      WHERE id = ?
    `,
    [parrotId, assessmentId],
  );
}

function parseAssessmentStatus(status: string): AssessmentStatus {
  if (status === 'draft' || status === 'completed') {
    return status;
  }

  throw new Error(`Unsupported assessment status: ${status}.`);
}

function parseStringArray(value: string | null): string[] {
  if (value === null) {
    return [];
  }

  const parsed: unknown = JSON.parse(value);

  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
    throw new Error('Stored option_ids must be a JSON array of strings.');
  }

  return parsed;
}

function parseWelfareSnapshot(value: string | null): WelfareSnapshot {
  if (value === null) {
    return {};
  }

  const parsed: unknown = JSON.parse(value);

  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('Stored welfare_snapshot must be a JSON object.');
  }

  return parsed as WelfareSnapshot;
}
