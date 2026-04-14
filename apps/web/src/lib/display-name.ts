/**
 * Resolve a user-facing display name for a profile-like object, falling
 * back through displayName → username → "Anonymous".
 */
export function resolveDisplayName(
  profile: { displayName?: string | null; username?: string | null } | null | undefined
): string {
  return profile?.displayName || profile?.username || 'Anonymous';
}
