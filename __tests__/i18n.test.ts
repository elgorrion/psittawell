import { createTranslator, normalizeLocale, resolveLocalePreference } from '../lib/i18n';
import de from '../locales/de.json';
import en from '../locales/en.json';
import { flagGlyphs } from '../components/questions/Badges';

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

  it('resolves language preferences against the supported app locales', () => {
    expect(resolveLocalePreference('system', 'de-AT')).toBe('de');
    expect(resolveLocalePreference('system', 'nl-NL')).toBe('en');
    expect(resolveLocalePreference('en', 'de-AT')).toBe('en');
    expect(resolveLocalePreference('de', 'en-US')).toBe('de');
  });

  it('keeps English and German UI catalogs on identical key sets', () => {
    expect(flattenKeys(de)).toEqual(flattenKeys(en));
  });

  it('keeps the dont_know glyph out of translator-owned UI strings', () => {
    const glyph = flagGlyphs.dont_know;

    for (const key of flattenKeys(en)) {
      expect(readCatalogValue(en, key)).not.toContain(glyph);
      expect(readCatalogValue(de, key)).not.toContain(glyph);
    }
  });

  it('includes non-empty About copy in English and German', () => {
    const aboutKeys = flattenKeys(en).filter((key) => key.startsWith('about.'));

    expect(aboutKeys.length).toBeGreaterThan(0);

    for (const key of aboutKeys) {
      expect(readCatalogValue(en, key)).toEqual(expect.stringMatching(/\S/));
      expect(readCatalogValue(de, key)).toEqual(expect.stringMatching(/\S/));
    }
  });

  it('uses the reworked About app keys and removes the retired monetisation key', () => {
    expect(hasCatalogPath(en, 'about.app.notMonetised')).toBe(false);
    expect(hasCatalogPath(de, 'about.app.notMonetised')).toBe(false);
    expect(readCatalogValue(en, 'about.app.credits.mariiaKarmanova.role')).toBe(
      'Scientific inspiration',
    );
    expect(readCatalogValue(de, 'about.app.credits.mariiaKarmanova.role')).toBe(
      'Wissenschaftliche Inspiration',
    );
    expect(readCatalogValue(en, 'about.app.credits.nikolaiVorobev.role')).toBe('Developer');
    expect(readCatalogValue(de, 'about.app.credits.nikolaiVorobev.role')).toBe('Entwicklung');
    expect(readCatalogValue(en, 'about.app.sourceCodeLabel')).toBe('Source code on GitHub');
    expect(readCatalogValue(de, 'about.app.sourceCodeLabel')).toBe('Quellcode auf GitHub');
  });

  it('keeps retired self-promotional monetisation phrasing out of UI catalogs', () => {
    expect(JSON.stringify(en)).not.toMatch(/not monetised|not monetized|non-commercial/i);
    expect(JSON.stringify(de)).not.toMatch(/nicht monetarisiert|nicht kommerziell/i);
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

function hasCatalogPath(value: object, path: string): boolean {
  const result = path
    .split('.')
    .reduce<unknown>((current, key) => {
      if (current === null || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[key];
    }, value);

  return result !== undefined;
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
