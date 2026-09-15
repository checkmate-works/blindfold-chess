/**
 * Resolve the name to show for a profile-like object, falling back through
 * displayName → username → `fallback`.
 *
 * `fallback` is required, and required for a reason: the name slot is the one
 * place a missing profile becomes visible, and the word that fills it is
 * user-facing copy. An earlier `resolveDisplayName` defaulted it to the
 * English literal `"Anonymous"`, which meant every caller that took the
 * default shipped an untranslated string — and the same author read
 * "Anonymous" in a list and "(deleted user)" on the detail page it linked to.
 * Making the argument mandatory is what stops that from being the easy path;
 * pass `tCommon('deletedUser')` unless the surface genuinely wants something
 * else (`''` to mean "render nothing", a guest label, an admin-only marker).
 *
 * Note the `||` chain: a profile whose `displayName` is the empty string falls
 * through to the username, where `??` would have rendered a blank name.
 *
 * `fallback` may be `null`, which widens the return type to `string | null`.
 * That is what the query layer passes: a row it resolves for later rendering
 * carries `null` rather than a word, so the word is chosen in the viewer's
 * language at the point it is shown instead of being baked into the SELECT.
 */
export function resolveAuthorName<F extends string | null>(
  profile: { displayName?: string | null; username?: string | null } | null | undefined,
  { fallback }: { fallback: F }
): string | F {
  return profile?.displayName || profile?.username || fallback;
}

/**
 * Resolve the name for content whose author column is nullable, where a null
 * profile has two different meanings and one wrong word for each.
 *
 * A published game is the only content of that kind: publishing is open to
 * account-less players, so `authorId` is null for a game nobody signed in to
 * post. Every other entity requires an account. Both cases nonetheless reach
 * the renderer as a null profile, because the profile join excludes
 * soft-deleted accounts — so a game by someone who has since deleted their
 * account is indistinguishable from an anonymous one unless `authorId` is
 * consulted, which is exactly what this does:
 *
 * - no `authorId` → nobody ever owned it → the anonymous label
 * - an `authorId` with no profile → the owner deleted their account → the
 *   deleted-user label
 *
 * Collapsing the two is what shipped "(deleted user)" under every anonymous
 * game in the `/games/shared` gallery.
 */
export function resolveNullableAuthorName(
  {
    authorId,
    profile,
  }: {
    authorId: string | null;
    profile: { displayName?: string | null; username?: string | null } | null | undefined;
  },
  labels: { anonymous: string; deleted: string }
): string {
  if (profile) return resolveAuthorName(profile, { fallback: labels.deleted });
  return authorId === null ? labels.anonymous : labels.deleted;
}
