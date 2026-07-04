import { getDatabase } from './db';
import type { Question, WelfareLevel } from '../content/schema';

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

  return Number(result.lastInsertRowId);
}

export function upsertAnswer(
  assessmentId: number,
  questionId: string,
  { optionIds = null, freeText = null, welfareSnapshot = null }: AnswerInput,
) {
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
