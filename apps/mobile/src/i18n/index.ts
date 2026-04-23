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
 * Initialize i18n
 */
export async function initI18n(): Promise<void> {
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  const locales = Localization.getLocales();
  const deviceLanguage = locales[0]?.languageCode ?? "en";

  const fallbackLanguage: SupportedLanguage = isSupportedLanguage(
    deviceLanguage,
  )
    ? deviceLanguage
    : "en";

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
