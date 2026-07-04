import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import de from '../locales/de.json';
import en from '../locales/en.json';

export const defaultLocale = 'en';

export const localeCatalogs = {
  en,
  de,
};

type LocaleCode = keyof typeof localeCatalogs;

export function normalizeLocale(locale: string | null | undefined): LocaleCode {
  const languageCode = locale?.split('-')[0]?.toLowerCase();

  return languageCode === 'de' ? 'de' : defaultLocale;
}

export function createTranslator(
  locale: string | null | undefined,
  catalogs: Record<string, object> = localeCatalogs,
) {
  const translator = new I18n(catalogs);
  translator.defaultLocale = defaultLocale;
  translator.enableFallback = true;
  translator.locale = normalizeLocale(locale);

  return translator;
}

export const i18n = createTranslator(getDeviceLocale());

export function t(scope: string, options?: Record<string, unknown>) {
  return i18n.t(scope, options);
}

function getDeviceLocale() {
  const [locale] = getLocales();

  return locale?.languageTag ?? locale?.languageCode ?? defaultLocale;
}
