import { runDatabaseMigrations } from '../lib/db';

describe('database migrations', () => {
  it('applies the full migration chain from an empty version without losing seeded rows', () => {
    const answerRow = {
      id: 5,
      assessment_id: 7,
      question_id: 'q_s1_name',
      free_text: 'Mango',
    };
    const database = new FakeMigrationDatabase(0, [{ id: 7 }], [answerRow]);

    expect(runDatabaseMigrations(database as never)).toBe(3);
    expect(database.version).toBe(3);
    expect([...database.tables].sort()).toEqual(['answer', 'app_meta', 'assessment']);
    expect([...database.assessmentColumns].sort()).toEqual([
      'completed_at',
      'id',
      'instrument_version',
      'parrot_id',
      'started_at',
      'status',
    ]);
    expect([...database.answerColumns].sort()).toEqual([
      'answered_at',
      'assessment_id',
      'free_text',
      'id',
      'option_ids',
      'question_id',
      'welfare_snapshot',
    ]);
    expect(database.rows).toEqual([{ id: 7, parrot_id: 7 }]);
    expect(database.answerRows).toEqual([answerRow]);
  });

  it('applies migration 3 by adding and backfilling parrot lineage ids', () => {
    const database = new FakeMigrationDatabase(2, [
      { id: 7 },
      { id: 8 },
    ]);

    expect(runDatabaseMigrations(database as never)).toBe(3);
    expect(database.version).toBe(3);
    expect(database.rows).toEqual([
      { id: 7, parrot_id: 7 },
      { id: 8, parrot_id: 8 },
    ]);
  });

  it('does not re-run migration 3 when the user version is current', () => {
    const database = new FakeMigrationDatabase(3, [{ id: 4, parrot_id: 99 }]);

    expect(runDatabaseMigrations(database as never)).toBe(3);
    expect(database.version).toBe(3);
    expect(database.execStatements).toEqual([]);
    expect(database.rows).toEqual([{ id: 4, parrot_id: 99 }]);
  });
});

type FakeAssessmentRow = {
  id: number;
  parrot_id?: number | null;
};

type FakeAnswerRow = {
  id: number;
  assessment_id: number;
  question_id: string;
  free_text: string | null;
};

class FakeMigrationDatabase {
  execStatements: string[] = [];
  tables = new Set<string>();
  assessmentColumns = new Set<string>();
  answerColumns = new Set<string>();

  constructor(
    public version: number,
    public rows: FakeAssessmentRow[],
    public answerRows: FakeAnswerRow[] = [],
  ) {
    if (version >= 1) {
      this.tables.add('app_meta');
    }

    if (version >= 2) {
      this.createAssessmentTable();
      this.createAnswerTable();
    }

    if (version >= 3) {
      this.assessmentColumns.add('parrot_id');
    }
  }

  getFirstSync(sql: string) {
    if (sql.trim() === 'PRAGMA user_version') {
      return { user_version: this.version };
    }

    throw new Error(`Unsupported getFirstSync SQL: ${sql}`);
  }

  execSync(sql: string) {
    this.execStatements.push(sql);

    const versionMatch = sql.match(/PRAGMA user_version = (\d+)/);

    if (versionMatch) {
      this.version = Number(versionMatch[1]);
      return;
    }

    let handled = false;

    if (sql.includes('CREATE TABLE IF NOT EXISTS app_meta')) {
      this.tables.add('app_meta');
      handled = true;
    }

    if (sql.includes('CREATE TABLE assessment')) {
      this.createAssessmentTable();
      handled = true;
    }

    if (sql.includes('CREATE TABLE answer')) {
      this.createAnswerTable();
      handled = true;
    }

    if (sql.includes('ALTER TABLE assessment ADD COLUMN parrot_id INTEGER')) {
      if (this.rows.some((row) => Object.hasOwn(row, 'parrot_id'))) {
        throw new Error('parrot_id column already exists');
      }

      this.assessmentColumns.add('parrot_id');
      this.rows = this.rows.map((row) => ({ ...row, parrot_id: null }));
      handled = true;
    }

    if (sql.includes('SET parrot_id = id') && sql.includes('WHERE parrot_id IS NULL')) {
      this.rows = this.rows.map((row) => ({
        ...row,
        parrot_id: row.parrot_id ?? row.id,
      }));
      handled = true;
    }

    if (handled) {
      return;
    }

    throw new Error(`Unsupported execSync SQL: ${sql}`);
  }

  private createAssessmentTable() {
    this.tables.add('assessment');
    this.assessmentColumns = new Set([
      'completed_at',
      'id',
      'instrument_version',
      'started_at',
      'status',
      ...this.assessmentColumns,
    ]);
  }

  private createAnswerTable() {
    this.tables.add('answer');
    this.answerColumns = new Set([
      'answered_at',
      'assessment_id',
      'free_text',
      'id',
      'option_ids',
      'question_id',
      'welfare_snapshot',
    ]);
  }
}
