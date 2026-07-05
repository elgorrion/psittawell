import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import de from '../locales/de.json';
import en from '../locales/en.json';
import type { LanguagePreference } from './preferences';

export const defaultLocale = 'en';

export const localeCatalogs = {
  en,
  de,
};

export type LocaleCode = keyof typeof localeCatalogs;

type LocaleListener = (locale: LocaleCode) => void;

const localeListeners = new Set<LocaleListener>();

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
let currentLocale: LocaleCode = normalizeLocale(i18n.locale);

export function t(scope: string, options?: Record<string, unknown>) {
  return i18n.t(scope, options);
}

export function getAppLocale() {
  return currentLocale;
}

export function resolveLocalePreference(
  preference: LanguagePreference,
  systemLocale: string | null | undefined = getDeviceLocale(),
): LocaleCode {
  return preference === 'system' ? normalizeLocale(systemLocale) : preference;
}

export function applyLanguagePreference(preference: LanguagePreference) {
  return setAppLocale(resolveLocalePreference(preference));
}

export function setAppLocale(locale: string | null | undefined) {
  const nextLocale = normalizeLocale(locale);

  i18n.locale = nextLocale;

  if (currentLocale !== nextLocale) {
    currentLocale = nextLocale;
    notifyLocaleListeners();
  }

  return currentLocale;
}

export function subscribeToLocaleChanges(listener: LocaleListener) {
  localeListeners.add(listener);

  return () => {
    localeListeners.delete(listener);
  };
}

function getDeviceLocale() {
  const [locale] = getLocales();

  return locale?.languageTag ?? locale?.languageCode ?? defaultLocale;
}

function notifyLocaleListeners() {
  for (const listener of localeListeners) {
    listener(currentLocale);
  }
}
