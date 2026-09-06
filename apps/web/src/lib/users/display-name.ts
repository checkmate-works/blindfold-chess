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
