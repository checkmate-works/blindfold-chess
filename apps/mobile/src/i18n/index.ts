import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./resources/en.json";
import es from "./resources/es.json";
import ja from "./resources/ja.json";
import ptBR from "./resources/pt-BR.json";

const LANGUAGE_STORAGE_KEY = "user-language";

export const SUPPORTED_LANGUAGES = ["ja", "en", "es", "pt-BR"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  ja: { translation: ja },
  en: { translation: en },
  es: { translation: es },
  "pt-BR": { translation: ptBR },
};

function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

/**
 * Resolves a BCP 47 language tag reported by the device onto one of
 * SUPPORTED_LANGUAGES: exact match first (ignoring case), then the primary
 * subtag against the primary subtag of each supported language.
 *
 * The prefix step is what makes `pt-BR` reachable at all. A device set to
 * Portuguese reports `languageCode: "pt"`, which is not itself a supported
 * language, so an exact-only check handed Brazilian users English even
 * though `pt-BR.json` ships in the bundle. It also maps `en-GB` / `es-MX`
 * onto `en` / `es` rather than falling through.
 *
 * Mirrors `matchLanguageTag()` on the web (`apps/web/src/i18n/
 * supported-locale.ts`). The two lists cannot be shared today — the web one
 * lives in a Next.js app, not a workspace package — so this is a deliberate
 * second copy; keep the rule identical when either side changes.
 */
function matchLanguageTag(tag: string): SupportedLanguage | undefined {
  const lower = tag.toLowerCase();
  const exact = SUPPORTED_LANGUAGES.find(
    (lang) => lang.toLowerCase() === lower,
  );
  if (exact) return exact;

  const primary = lower.split("-")[0];
  return SUPPORTED_LANGUAGES.find(
    (lang) => lang.toLowerCase().split("-")[0] === primary,
  );
}

/**
 * Initialize i18n
 */
export async function initI18n(): Promise<void> {
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  const deviceLocale = Localization.getLocales()[0];
  const deviceTag = deviceLocale?.languageTag ?? deviceLocale?.languageCode;

  const fallbackLanguage: SupportedLanguage =
    (deviceTag ? matchLanguageTag(deviceTag) : undefined) ?? "en";

  const initialLanguage =
    (savedLanguage !== null && isSupportedLanguage(savedLanguage)
      ? savedLanguage
      : null) ?? fallbackLanguage;

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: "v4",
  });
}

/**
 * Change language
 */
export async function changeLanguage(
  language: SupportedLanguage,
): Promise<void> {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export { i18n };
