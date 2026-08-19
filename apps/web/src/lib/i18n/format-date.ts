/**
 * Format a `Date` as a locale-aware calendar day.
 *
 * `monthStyle` is the only thing that varies across the app: list rows use
 * `'short'` so the date does not crowd the title, while a document's own
 * byline uses `'long'`.
 *
 * No `timeZone` option is offered. Every caller here shows a moment that
 * happened — a publication, a comment, a notification — and the viewer's own
 * timezone is the right frame for those. The one place that pins the zone
 * (`LastUpdated`, which must not let a page's stated revision date roll over
 * a day early east of UTC) states its own reason and formats directly.
 */
export function formatLocalDate(
  date: Date,
  locale: string,
  monthStyle: 'short' | 'long' = 'short'
): string {
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: monthStyle,
    day: 'numeric',
  });
}
