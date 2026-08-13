/**
 * The public identity of whoever authored a piece of content: the three
 * fields every avatar-and-name rendering needs, and nothing else.
 *
 * @description
 * This is the type counterpart of `AUTHOR_PROFILE_COLUMNS` in
 * `@/lib/db/profile-select` — that constant is what queries select, this is
 * what they return. Before they were paired, the same three fields had been
 * written out by hand in sixteen places under nine different names
 * (`SharedGameAuthor`, `RepertoireAuthorProfile`, `EditRequestProposer`,
 * `ProposerProfile`, `EditorProfile`, …), which is how a `country` or `flair`
 * added for one surface quietly fails to reach the others.
 *
 * Kept in `@/lib/users` rather than beside the columns on purpose: client
 * components render these (comment headers, edit-request rows, list cards),
 * and this module imports nothing, so no `import type` here can ever drag
 * Drizzle or the schema toward a client bundle.
 *
 * Richer view models that genuinely need more — the EXP leaderboard adds
 * `totalExp` — are NOT this type. They have their own reason to change;
 * intersect (see {@link SocialAuthorProfile}) or declare separately rather
 * than widening this one.
 */
export type AuthorProfile = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * `AuthorProfile` plus the profile id, for callers that key by user (optimistic
 * list updates, "is this me?" comparisons) rather than only rendering.
 */
export type IdentifiedAuthorProfile = AuthorProfile & { id: string };

/**
 * {@link AuthorProfile} plus the two chips rendered beside the name: the
 * country flag and the flair emoji.
 *
 * This is the type counterpart of `SOCIAL_AUTHOR_COLUMNS` in
 * `@/lib/db/profile-select`, the same way `AuthorProfile` pairs with
 * `AUTHOR_PROFILE_COLUMNS`. The columns constant existed under a different
 * name and the type did not, so four surfaces — the home feed's actor, the
 * rank-update loader, and both topic card prop types — each wrote the five
 * fields out by hand. Two had drifted to `username: string | null`, which the
 * schema does not allow and account deletion deliberately preserves (see
 * `deleteAccount`): a deleted author is represented by the whole profile being
 * `null`, never by a nameless one.
 *
 * `challenge-queries`' leaderboard row is NOT this type even though it happens
 * to carry the same five fields. It changes for scoring reasons — a new
 * tiebreak column, a different period — and these change for identity ones.
 */
export type SocialAuthorProfile = AuthorProfile & {
  country: string | null;
  flair: string | null;
};
