import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Each supported locale's name, written in that locale.
 *
 * Typed as `Record<Locale, string>` so adding a locale to `SUPPORTED_LOCALES`
 * without a label here is a compile-time error — a language selector can never
 * render an empty option.
 *
 * The two selectors — the localized tree's switcher and the landing page's —
 * each carried their own copy with that guarantee stated in only one of them.
 * A label is an endonym, so it is not translated per viewer: a Japanese
 * speaker looking for Spanish looks for "Español", not "スペイン語".
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  'pt-BR': 'Português (Brasil)',
  ja: '日本語',
};
