import { getTranslations } from 'next-intl/server';

type Props = {
  /** Locale used to look up the shared label and to format the date. */
  locale: string;
  /**
   * ISO date (`YYYY-MM-DD`) the document was last revised. This is a single
   * fact — not translatable copy — so it lives in page code and is never
   * duplicated across the locale message files.
   */
  date: string;
};

/**
 * Standardized "Last Updated: <date>" footnote for the static / legal pages
 * (privacy, terms, affiliate-disclosure, licenses).
 *
 * Centralizes both the label (the shared `Common.lastUpdated` key) and the
 * date format (`toLocaleDateString`, pinned to UTC so the day never rolls over
 * in a negative-offset timezone) so the pages cannot drift apart, and so the
 * muted line always renders in the same place (the bottom of the page body).
 *
 * NOTE: uses a `next-intl/server` value import, so it must be imported directly
 * (not via the `_components` barrel) to keep server-only code out of client
 * bundles — see the Barrel File Convention in `apps/web/CLAUDE.md`.
 */
export async function LastUpdated({ locale, date }: Props) {
  const t = await getTranslations({ locale, namespace: 'Common' });
  const formatted = new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return <p className="text-muted-foreground">{t('lastUpdated', { date: formatted })}</p>;
}
