import {
  getLanguagePreference,
  setLanguagePreference,
  type LanguagePreference,
} from '../lib/preferences';

describe('language preferences', () => {
  it('defaults to system when the app_meta row is missing', () => {
    const database = new FakePreferencesDatabase();

    expect(getLanguagePreference(database as never)).toBe('system');
  });

  it('persists and reads explicit language preferences', () => {
    const database = new FakePreferencesDatabase();

    setLanguagePreference('de', database as never);
    expect(getLanguagePreference(database as never)).toBe('de');

    setLanguagePreference('en', database as never);
    expect(getLanguagePreference(database as never)).toBe('en');

    setLanguagePreference('system', database as never);
    expect(getLanguagePreference(database as never)).toBe('system');
  });

  it('treats unsupported stored values as system', () => {
    const database = new FakePreferencesDatabase('fr');

    expect(getLanguagePreference(database as never)).toBe('system');
  });
});

class FakePreferencesDatabase {
  value: string | null;

  constructor(value: string | null = null) {
    this.value = value;
  }

  getFirstSync<TRow>(sql: string, params: unknown[] = []): TRow | null {
    expect(sql).toBe('SELECT value FROM app_meta WHERE key = ?');
    expect(params).toEqual(['language_preference']);

    return this.value === null ? null : ({ value: this.value } as TRow);
  }

  runSync(sql: string, params: unknown[] = []) {
    expect(sql).toContain('INSERT INTO app_meta');
    expect(sql).toContain('ON CONFLICT(key) DO UPDATE');
    expect(params[0]).toBe('language_preference');
    expect(params[1]).toEqual(expect.stringMatching(/^(system|en|de)$/));

    this.value = params[1] as LanguagePreference;
  }
}
