export type Migration<TContext = void> = {
  version: number;
  up: (context: TContext) => void;
};

export function runMigrations<TContext>(
  context: TContext,
  currentVersion: number,
  migrations: readonly Migration<TContext>[],
  setVersion: (context: TContext, version: number) => void,
) {
  assertValidCurrentVersion(currentVersion);
  assertOrderedMigrations(migrations);

  const latestVersion = migrations.at(-1)?.version ?? 0;

  if (currentVersion > latestVersion) {
    throw new Error(`Database schema version ${currentVersion} is newer than this app supports.`);
  }

  let migratedVersion = currentVersion;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    migration.up(context);
    setVersion(context, migration.version);
    migratedVersion = migration.version;
  }

  return migratedVersion;
}

export function assertOrderedMigrations<TContext>(migrations: readonly Migration<TContext>[]) {
  migrations.forEach((migration, index) => {
    const expectedVersion = index + 1;

    if (migration.version !== expectedVersion) {
      throw new Error(`Migration ${index} must be version ${expectedVersion}.`);
    }
  });
}

function assertValidCurrentVersion(currentVersion: number) {
  if (!Number.isInteger(currentVersion) || currentVersion < 0) {
    throw new Error('Database schema version must be a non-negative integer.');
  }
}
