import { useTranslation } from "react-i18next";

import { isSupportedLocale } from "@blindfold-chess/features/locale";
import type { Locale } from "@blindfold-chess/types";

/**
 * The app language as a `Locale`, for reading the per-locale prose the
 * question data carries inline (it is not in the i18next dictionary).
 * Re-renders on a language change because it reads through `useTranslation`.
 */
export function useQuestionLocale(): Locale {
  const { i18n } = useTranslation();
  const language = i18n.language;
  return isSupportedLocale(language) ? language : "en";
}
