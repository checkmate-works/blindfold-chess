/**
 * Format a timestamp for display in admin tables and detail views.
 * Returns an em dash for null/undefined values.
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return date ? new Date(date).toLocaleString() : '—';
}

/**
 * Date-only variant of {@link formatDateTime}.
 */
export function formatDate(date: Date | string | null | undefined): string {
  return date ? new Date(date).toLocaleDateString() : '—';
}

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
