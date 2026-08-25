import { DEFAULT_LOCALE } from '@/config';

/**
 * Pick the best locale variant from a group of rows sharing the same slug.
 * Priority: requested locale > default locale (en) > first available.
 */
export function pickByLocale<T extends { locale: string }>(
  rows: T[],
  locale: string,
  defaultLocale: string = DEFAULT_LOCALE
): T {
  return (
    rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === defaultLocale) ?? rows[0]
  );
}
