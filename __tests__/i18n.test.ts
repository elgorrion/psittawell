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

  it('includes non-empty About copy in English and German', () => {
    const aboutKeys = flattenKeys(en).filter((key) => key.startsWith('about.'));

    expect(aboutKeys.length).toBeGreaterThan(0);

    for (const key of aboutKeys) {
      expect(readCatalogValue(en, key)).toEqual(expect.stringMatching(/\S/));
      expect(readCatalogValue(de, key)).toEqual(expect.stringMatching(/\S/));
    }
  });

  it('keeps About author and collaborator names identical across locales', () => {
    const names = [
      'Andrea Piseddu',
      'Yvonne R. A. van Zeeland',
      'Jean-Loup Rault',
      'Ann Brooks',
      'Pamela Clark',
      'Sara Mainardi',
      'Hildegard Niemann',
      'Joanne Paul-Murphy',
      'Valarie Tynes',
    ];
    const englishCredit = readCatalogValue(en, 'about.instrument.developedBy');
    const germanCredit = readCatalogValue(de, 'about.instrument.developedBy');

    for (const name of names) {
      expect(englishCredit).toContain(name);
      expect(germanCredit).toContain(name);
    }
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

function readCatalogValue(value: object, path: string): string {
  const result = path
    .split('.')
    .reduce<unknown>((current, key) => {
      if (current === null || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[key];
    }, value);

  if (typeof result !== 'string') {
    throw new Error(`${path} is not a string catalog value.`);
  }

  return result;
}
