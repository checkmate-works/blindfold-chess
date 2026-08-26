import Link from 'next/link';

/** Characters of the raw id shown when there is no username to display. */
const ID_PREFIX_LENGTH = 8;

type AdminUserLinkProps = {
  userId: string | null;
  username: string | null | undefined;
  /** Shown in place of the link when the account no longer has a profile. */
  deletedLabel: string;
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
 * `profiles.username` is NOT NULL, so a missing profile means the account was
 * purged rather than merely unnamed — there is no detail page left to link to,
 * hence the plain label plus an id prefix to keep two purged rows apart.
 */
export function AdminUserLink({ userId, username, deletedLabel }: AdminUserLinkProps) {
  if (userId && username) {
    return (
      <Link href={`/admin/users/${userId}`} className="text-primary hover:underline">
        {username}
      </Link>
    );
  }

  return (
    <span className="text-muted-foreground" title={userId ?? undefined}>
      {userId ? `${deletedLabel} (${userId.slice(0, ID_PREFIX_LENGTH)}…)` : deletedLabel}
    </span>
  );
}
