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
 * Richer view models that genuinely need more — the topics feed adds `flair`
 * and `country`, the EXP leaderboard adds `totalExp` — are NOT this type.
 * They have their own reason to change; intersect or declare separately
 * rather than widening this one.
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
