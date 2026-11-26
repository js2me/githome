import { createInstance } from 'i18next';
import { observable, runInAction } from 'mobx';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';
import zhCN from './locales/zh-CN.json';

export const languages = {
  en: 'English',
  ru: 'Русский',
  fr: 'Français',
  'zh-CN': '简体中文',
} as const;

export type Language = keyof typeof languages;
export type MessageKey = keyof typeof en;
type PluralKey<S> = S extends `${infer Key}_other` ? Key : never;

const defaultLanguage: Language = 'en';
const storageKey = 'githome.language';
const intlLocales: Record<Language, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  fr: 'fr-FR',
  'zh-CN': 'zh-CN',
};

function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && Object.hasOwn(languages, value);
}

export function readLanguage(storage?: Pick<Storage, 'getItem'>): Language {
  try {
    const saved = (storage ?? globalThis.localStorage)?.getItem(storageKey);
    if (isLanguage(saved)) return saved;
  } catch {
    // Storage can be unavailable, for example in private browsing.
  }
  return defaultLanguage;
}

const language = observable.box<Language>(readLanguage());
const i18n = createInstance();

void i18n.init({
  initAsync: false,
  lng: defaultLanguage,
  fallbackLng: defaultLanguage,
  supportedLngs: Object.keys(languages),
  load: 'currentOnly',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    fr: { translation: fr },
    'zh-CN': { translation: zhCN },
  },
});

function updateDocumentLanguage(value: Language) {
  if (typeof document !== 'undefined') document.documentElement.lang = value;
}

updateDocumentLanguage(language.get());

export function getLanguage() {
  return language.get();
}

export function setLanguage(value: string) {
  if (!isLanguage(value)) return;
  try {
    globalThis.localStorage?.setItem(storageKey, value);
  } catch {
    // Still apply the change for this session.
  }
  updateDocumentLanguage(value);
  runInAction(() => language.set(value));
}

export function getLocale() {
  return intlLocales[language.get()];
}

export function t(
  key: MessageKey | PluralKey<MessageKey>,
  values?: Record<string, unknown>,
): string {
  return i18n.t(key, { ...values, lng: language.get() });
}
