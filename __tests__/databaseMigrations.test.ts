import { runDatabaseMigrations } from '../lib/db';

describe('database migrations', () => {
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

class FakeMigrationDatabase {
  execStatements: string[] = [];

  constructor(
    public version: number,
    public rows: FakeAssessmentRow[],
  ) {}

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

    if (sql.includes('ALTER TABLE assessment ADD COLUMN parrot_id INTEGER')) {
      if (this.rows.some((row) => Object.hasOwn(row, 'parrot_id'))) {
        throw new Error('parrot_id column already exists');
      }

      this.rows = this.rows.map((row) => ({ ...row, parrot_id: null }));
    }

    if (sql.includes('SET parrot_id = id') && sql.includes('WHERE parrot_id IS NULL')) {
      this.rows = this.rows.map((row) => ({
        ...row,
        parrot_id: row.parrot_id ?? row.id,
      }));
      return;
    }

    throw new Error(`Unsupported execSync SQL: ${sql}`);
  }
}
