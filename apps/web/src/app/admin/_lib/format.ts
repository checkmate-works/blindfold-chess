/**
 * Format a Date to a `datetime-local` input value string (YYYY-MM-DDTHH:mm).
 * Returns null when the input is null.
 */
export function formatDateTimeLocal(date: Date | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
