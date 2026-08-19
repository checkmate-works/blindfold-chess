import { formatLocalDate } from '@/lib/i18n/format-date';

/**
 * Format an absolute "<date> · <time>" string for display alongside a
 * comment or post.
 *
 * Why not a single `toLocaleString` / `toLocaleDateString` call with both
 * date and time options:
 *   Safari/WebKit and Node's ICU disagree on the separator they insert
 *   between the date and time portion. For `en-US` Node produces
 *   `"May 3, 2026, 11:29 AM"` while Safari produces
 *   `"May 3, 2026 at 11:29 AM"`, which causes a React hydration
 *   mismatch the moment a Safari client picks up server HTML rendered
 *   by Node. (Reproduced 2026-05-03 on `/topics/squares/<sq>/posts/<id>`
 *   in Safari 18.) Computing the date and time portions independently
 *   and joining with a literal `' · '` sidesteps the engine-injected
 *   separator entirely; the underlying date/time portions are stable
 *   across engines on the locales we ship.
 */
export function formatAbsoluteDateTime(
  date: Date,
  locale: string,
  monthStyle: 'short' | 'long' = 'short'
): string {
  const datePart = formatLocalDate(date, locale, monthStyle);
  const timePart = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}
