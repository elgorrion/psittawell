import { createTranslator, normalizeLocale } from '../lib/i18n';
import de from '../locales/de.json';
import en from '../locales/en.json';

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

  it('keeps English and German UI catalogs on identical key sets', () => {
    expect(flattenKeys(de)).toEqual(flattenKeys(en));
  });
});

function flattenKeys(value: object, prefix = ''): string[] {
  return Object.entries(value)
    .flatMap(([key, child]) => {
      const nextPrefix = prefix.length > 0 ? `${prefix}.${key}` : key;

      if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
        return flattenKeys(child, nextPrefix);
      }

      return nextPrefix;
    })
    .sort();
}
