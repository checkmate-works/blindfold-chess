import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  isSupportedLocale,
  matchLanguageTag,
} from "@blindfold-chess/features/locale";
import type { Locale } from "@blindfold-chess/types";

import en from "./resources/en.json";
import es from "./resources/es.json";
import ja from "./resources/ja.json";
import ptBR from "./resources/pt-BR.json";

const LANGUAGE_STORAGE_KEY = "user-language";

const resources = {
  ja: { translation: ja },
  en: { translation: en },
  es: { translation: es },
  "pt-BR": { translation: ptBR },
};

/**
 * Initialize i18n
 */
export async function initI18n(): Promise<void> {
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  const deviceLocale = Localization.getLocales()[0];
  const deviceTag = deviceLocale?.languageTag ?? deviceLocale?.languageCode;

  const fallbackLanguage: Locale =
    (deviceTag ? matchLanguageTag(deviceTag) : undefined) ?? "en";

  const initialLanguage =
    (savedLanguage !== null && isSupportedLocale(savedLanguage)
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
export async function changeLanguage(language: Locale): Promise<void> {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export { i18n };
export type { Locale };
