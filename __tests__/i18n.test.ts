import { createTranslator, normalizeLocale } from '../lib/i18n';

describe('i18n', () => {
  it('normalizes supported device locales', () => {
    expect(normalizeLocale('de-AT')).toBe('de');
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('nl-NL')).toBe('en');
  });

  it('falls back from German to English for missing keys', () => {
    const translator = createTranslator('de-AT', {
      en: {
        sample: {
          shared: 'English shared',
          fallbackOnly: 'English fallback',
        },
      },
      de: {
        sample: {
          shared: 'Deutsch geteilt',
        },
      },
    });

    expect(translator.t('sample.shared')).toBe('Deutsch geteilt');
    expect(translator.t('sample.fallbackOnly')).toBe('English fallback');
  });
});
