import * as SQLite from 'expo-sqlite';

import { migration2Sql, migration3Sql } from './assessmentSchema';
import { type Migration, runMigrations } from './migrations';

const databaseName = 'psittawell.db';

type UserVersionRow = {
  user_version: number;
};

const migrations: readonly Migration<SQLite.SQLiteDatabase>[] = [
  {
    version: 1,
    up(database) {
      database.execSync(`
        CREATE TABLE IF NOT EXISTS app_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    },
  },
  {
    version: 2,
    up(database) {
      database.execSync(migration2Sql);
    },
  },
  {
    version: 3,
    up(database) {
      database.execSync(migration3Sql);
    },
  },
];

let database: SQLite.SQLiteDatabase | null = null;

export function getDatabase() {
  if (database === null) {
    const nextDatabase = SQLite.openDatabaseSync(databaseName);
    runDatabaseMigrations(nextDatabase);
    database = nextDatabase;
  }

  return database;
}

export function getSchemaVersion(targetDatabase?: SQLite.SQLiteDatabase) {
  return readUserVersion(targetDatabase ?? getDatabase());
}

export function runDatabaseMigrations(targetDatabase: SQLite.SQLiteDatabase) {
  return runMigrations(targetDatabase, readUserVersion(targetDatabase), migrations, setUserVersion);
}

function readUserVersion(targetDatabase: SQLite.SQLiteDatabase) {
  const row = targetDatabase.getFirstSync<UserVersionRow>('PRAGMA user_version');

  return row?.user_version ?? 0;
}

function setUserVersion(targetDatabase: SQLite.SQLiteDatabase, version: number) {
  targetDatabase.execSync(`PRAGMA user_version = ${version}`);
}
