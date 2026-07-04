import { runMigrations, type Migration } from '../lib/migrations';

type MigrationContext = {
  applied: number[];
  versions: number[];
};

function migration(version: number): Migration<MigrationContext> {
  return {
    version,
    up(context) {
      context.applied.push(version);
    },
  };
}

function setVersion(context: MigrationContext, version: number) {
  context.versions.push(version);
}

describe('runMigrations', () => {
  it('runs pending migrations in order and records each schema version', () => {
    const context: MigrationContext = { applied: [], versions: [] };
    const nextVersion = runMigrations(
      context,
      0,
      [migration(1), migration(2), migration(3)],
      setVersion,
    );

    expect(nextVersion).toBe(3);
    expect(context.applied).toEqual([1, 2, 3]);
    expect(context.versions).toEqual([1, 2, 3]);
  });

  it('is idempotent when the database is already at the latest version', () => {
    const context: MigrationContext = { applied: [], versions: [] };
    const nextVersion = runMigrations(context, 2, [migration(1), migration(2)], setVersion);

    expect(nextVersion).toBe(2);
    expect(context.applied).toEqual([]);
    expect(context.versions).toEqual([]);
  });

  it('rejects unordered migration definitions', () => {
    const context: MigrationContext = { applied: [], versions: [] };

    expect(() => runMigrations(context, 0, [migration(2), migration(1)], setVersion)).toThrow(
      'Migration 0 must be version 1.',
    );
  });
});
