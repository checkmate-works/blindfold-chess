/**
 * Truncate a string to at most `max` characters, appending an ellipsis when
 * truncation occurs. Returns an empty string when the input is null/undefined.
 */
export function truncate(text: string | null | undefined, max = 80): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}
