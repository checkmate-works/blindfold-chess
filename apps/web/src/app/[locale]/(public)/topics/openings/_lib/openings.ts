/**
 * Validation utilities for opening topic keys (slugs).
 *
 * Opening slugs are validated against the chess_openings table
 * (unlike squares which are validated statically). The format check
 * is applied first to reject obviously invalid input before hitting the DB.
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Check if a string has a valid opening slug format.
 * Lowercase alphanumeric characters and hyphens only, no leading/trailing hyphens.
 */
export function isValidOpeningSlugFormat(value: string): boolean {
  if (!value || value.length > 100) return false;
  return SLUG_PATTERN.test(value);
}
