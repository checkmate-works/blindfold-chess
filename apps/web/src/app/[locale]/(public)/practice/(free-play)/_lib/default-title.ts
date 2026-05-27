/** Local-timezone `YYYY-MM-DD` — used as the date segment of default titles. */
function formatLocalIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Build the default title for a newly created practice item, e.g.
 * `"Puzzle 2026-05-18 - alice"` — or `"Puzzle 2026-05-18"` when the author has
 * no display name.
 *
 * Returns `""` when `displayName` is `undefined` (e.g. in tests, or routes
 * that do not supply a profile), so the title field simply starts empty.
 *
 * @param prefix Item-kind word, e.g. `"Puzzle"` or `"Position"`.
 */
export function buildDefaultPracticeTitle(prefix: string, displayName: string | undefined): string {
  if (displayName === undefined) return '';
  const date = formatLocalIsoDate(new Date());
  const trimmed = displayName.trim();
  return trimmed ? `${prefix} ${date} - ${trimmed}` : `${prefix} ${date}`;
}
