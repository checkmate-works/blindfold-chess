/**
 * Format a date as relative time string using Intl.RelativeTimeFormat.
 * Examples: "11 hours ago", "2 days ago" / "11時間前", "2日前"
 *
 * `now` is the reference instant, defaulting to the current time so the ~10
 * rendering call sites stay unchanged. Passing it explicitly is what makes
 * the boundaries testable (59s -> "just now" vs 60s -> "1 minute ago", the
 * 30-day month rollover, the 365-day year rollover) without freezing the
 * process clock, which is how the whole suite for this function had to be
 * written.
 */
export function formatRelativeTime(
  date: Date,
  locale: string,
  justNowLabel: string,
  now: number = Date.now()
): string {
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) {
    return justNowLabel;
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });

  if (diffMin < 60) {
    return rtf.format(-diffMin, 'minute');
  }
  if (diffHour < 24) {
    return rtf.format(-diffHour, 'hour');
  }
  if (diffDay < 30) {
    return rtf.format(-diffDay, 'day');
  }
  if (diffMonth < 12) {
    return rtf.format(-diffMonth, 'month');
  }
  return rtf.format(-diffYear, 'year');
}
