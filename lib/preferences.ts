import type * as SQLite from 'expo-sqlite';

import { getDatabase } from './db';

export const languagePreferenceValues = ['system', 'en', 'de'] as const;

export type LanguagePreference = (typeof languagePreferenceValues)[number];

type AppMetaDatabase = Pick<SQLite.SQLiteDatabase, 'getFirstSync' | 'runSync'>;

type AppMetaRow = {
  value: string;
};

const languagePreferenceKey = 'language_preference';

export function getLanguagePreference(
  database: AppMetaDatabase = getDatabase(),
): LanguagePreference {
  const row = database.getFirstSync<AppMetaRow>(
    'SELECT value FROM app_meta WHERE key = ?',
    [languagePreferenceKey],
  );

  return parseLanguagePreference(row?.value);
}

export function setLanguagePreference(
  preference: LanguagePreference,
  database: AppMetaDatabase = getDatabase(),
) {
  database.runSync(
    `
      INSERT INTO app_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `,
    [languagePreferenceKey, preference],
  );
}

export function parseLanguagePreference(
  value: string | null | undefined,
): LanguagePreference {
  return isLanguagePreference(value) ? value : 'system';
}

function isLanguagePreference(value: string | null | undefined): value is LanguagePreference {
  return languagePreferenceValues.includes(value as LanguagePreference);
}
