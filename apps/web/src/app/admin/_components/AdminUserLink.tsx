import Link from 'next/link';

/** Characters of the raw id shown when there is no username to display. */
const ID_PREFIX_LENGTH = 8;

type AdminUserLinkProps = {
  userId: string | null;
  username: string | null | undefined;
  /** Shown when the account behind `userId` is gone. */
  deletedLabel: string;
  /** Shown when the account exists but never finished username setup. */
  provisionalLabel: string;
  /**
   * Whether an `auth.users` row still exists for `userId`. Defaults to true,
   * which is correct for every id column that is FK-backed (see above); pass
   * it explicitly only for a generic `target_id`, where the caller has to
   * establish the answer itself.
   */
  accountExists?: boolean;
};

/**
 * A user reference in an admin table: the username, linked to that user's
 * admin detail page.
 *
 * Admin lists used to identify people by email address, which put real
 * addresses on screen on every page an admin happened to open. The username
 * identifies the row just as well and is public information already; anyone
 * who needs the address can open the detail page and reveal it there.
 *
 * `profiles.username` is NOT NULL, so a row with no profile is an account that
 * has none — and the usual reason is that it never got one. A signed-in user
 * without a `profiles` row is *provisional*: the auth callback establishes the
 * session before username setup (the OAuth code is single-use, so it must be
 * exchanged immediately) and logs the `login` event right there, so anyone who
 * abandons setup leaves activity behind under an id that will never resolve to
 * a name. They are a live account with an admin detail page — `fetchUserDetail`
 * keys off `auth.users` and treats the profile as optional — so the row still
 * links, under a label saying registration is unfinished.
 *
 * A *deleted* account is the case that does NOT arrive here as a missing
 * profile. Deletion is two-stage: 退会 soft-deletes the auth user but keeps the
 * profile row (the username is held back to block ban evasion and
 * re-registration), so a soft-deleted account still renders its username; the
 * purge 30 days later hard-deletes `auth.users`, and every FK to it is CASCADE
 * or SET NULL, so the purged user's rows either disappear or come back with a
 * null id. A non-null `userId` in a surviving row therefore always has a live
 * auth account behind it. The deleted label is reached by a null `userId`, and
 * by `accountExists={false}` — the one shape a FK cannot speak for, a generic
 * `target_id` column pointing at a user whose rows were never FK-bound to it.
 *
 * Getting this wrong is not cosmetic: labelling provisional users "(deleted
 * user)" made /admin/activity-log read as though hundreds of accounts had been
 * deleted when one had been, and dropped the link to the very page that would
 * have shown otherwise.
 */
export function AdminUserLink({
  userId,
  username,
  deletedLabel,
  provisionalLabel,
  accountExists = true,
}: AdminUserLinkProps) {
  if (userId && username) {
    return (
      <Link href={`/admin/users/${userId}`} className="text-primary hover:underline">
        {username}
      </Link>
    );
  }

  if (!userId) {
    return <span className="text-muted-foreground">{deletedLabel}</span>;
  }

  const idPrefix = userId.slice(0, ID_PREFIX_LENGTH);

  if (!accountExists) {
    return (
      <span className="text-muted-foreground" title={userId}>
        {`${deletedLabel} (${idPrefix}…)`}
      </span>
    );
  }

  return (
    <Link
      href={`/admin/users/${userId}`}
      className="text-muted-foreground hover:underline"
      title={userId}
    >
      {`${provisionalLabel} (${idPrefix}…)`}
    </Link>
  );
}
