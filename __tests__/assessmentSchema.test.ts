import {
  addParrotIdToAssessmentSql,
  backfillAssessmentParrotIdSql,
  createAnswerTableSql,
  createAssessmentTableSql,
  migration2Sql,
  migration3Sql,
} from '../lib/assessmentSchema';

describe('assessment schema', () => {
  it('defines the draft assessment table for migration 2', () => {
    expect(createAssessmentTableSql).toContain('CREATE TABLE assessment');
    expect(createAssessmentTableSql).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT');
    expect(createAssessmentTableSql).toContain('instrument_version TEXT NOT NULL');
    expect(createAssessmentTableSql).toContain("status TEXT NOT NULL DEFAULT 'draft'");
    expect(createAssessmentTableSql).toContain('started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');
    expect(createAssessmentTableSql).toContain('completed_at TEXT');
  });

  it('defines the answer table with one editable draft answer per question', () => {
    expect(createAnswerTableSql).toContain('CREATE TABLE answer');
    expect(createAnswerTableSql).toContain(
      'assessment_id INTEGER NOT NULL REFERENCES assessment(id)',
    );
    expect(createAnswerTableSql).toContain('question_id TEXT NOT NULL');
    expect(createAnswerTableSql).toContain('option_ids TEXT');
    expect(createAnswerTableSql).toContain('free_text TEXT');
    expect(createAnswerTableSql).toContain('welfare_snapshot TEXT');
    expect(createAnswerTableSql).toContain('answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');
    expect(createAnswerTableSql).toContain('UNIQUE(assessment_id, question_id)');
  });

  it('keeps migration 2 scoped to assessment persistence', () => {
    expect(migration2Sql).toContain(createAssessmentTableSql.trim());
    expect(migration2Sql).toContain(createAnswerTableSql.trim());
    expect(migration2Sql).not.toContain('app_meta');
  });

  it('defines the lineage migration as additive DDL plus a root backfill', () => {
    expect(addParrotIdToAssessmentSql).toContain(
      'ALTER TABLE assessment ADD COLUMN parrot_id INTEGER',
    );
    expect(backfillAssessmentParrotIdSql).toContain('UPDATE assessment');
    expect(backfillAssessmentParrotIdSql).toContain('SET parrot_id = id');
    expect(backfillAssessmentParrotIdSql).toContain('WHERE parrot_id IS NULL');
    expect(migration3Sql).toContain(addParrotIdToAssessmentSql.trim());
    expect(migration3Sql).toContain(backfillAssessmentParrotIdSql.trim());
  });
});
