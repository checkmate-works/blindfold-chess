/**
 * Resolve a user-facing display name for a profile-like object, falling
 * back through displayName → username → "Anonymous".
 */
export function resolveDisplayName(
  profile: { displayName?: string | null; username?: string | null } | null | undefined
): string {
  return profile?.displayName || profile?.username || 'Anonymous';
}

/**
 * Like {@link resolveDisplayName} but with a configurable fallback. Use this
 * when the caller needs to distinguish "no name available" from the literal
 * string `"Anonymous"` (e.g., when seeding a default form value where an
 * empty string should produce a date-only title rather than the word
 * "Anonymous").
 */
export function resolveAuthorName(
  profile: { displayName?: string | null; username?: string | null } | null | undefined,
  { fallback = 'Anonymous' }: { fallback?: string } = {}
): string {
  return profile?.displayName || profile?.username || fallback;
}
