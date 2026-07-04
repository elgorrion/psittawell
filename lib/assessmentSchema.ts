export const createAssessmentTableSql = `
  CREATE TABLE assessment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT
  );
`;

export const createAnswerTableSql = `
  CREATE TABLE answer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id INTEGER NOT NULL REFERENCES assessment(id),
    question_id TEXT NOT NULL,
    option_ids TEXT,
    free_text TEXT,
    welfare_snapshot TEXT,
    answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, question_id)
  );
`;

export const migration2Sql = `
${createAssessmentTableSql}
${createAnswerTableSql}
`;

export const addParrotIdToAssessmentSql = `
  ALTER TABLE assessment ADD COLUMN parrot_id INTEGER;
`;

export const backfillAssessmentParrotIdSql = `
  UPDATE assessment
  SET parrot_id = id
  WHERE parrot_id IS NULL;
`;

export const migration3Sql = `
${addParrotIdToAssessmentSql}
${backfillAssessmentParrotIdSql}
`;
