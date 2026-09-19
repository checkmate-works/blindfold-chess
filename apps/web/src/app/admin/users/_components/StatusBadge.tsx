import { AdminBadge } from '@/app/admin/_components/AdminBadge';
import { formatDate } from '@/app/admin/_lib/format';

import { truncateContent } from '@/lib/content/truncate-content';

/** Ban-reason budget under the badge; the full text stays in the `title`. */
const BAN_REASON_LENGTH = 50;

type Profile = {
  bannedAt: Date | null;
  deletedAt: Date | null;
};

type StatusBadgeProps = {
  profile: Profile | undefined;
  banReason: string | null;
  labels: {
    anonymous: string;
    deleted: string;
    banned: string;
    active: string;
  };
};

/**
 * The account's lifecycle state, from the profile row alone.
 *
 * The no-profile case is an account that never finished username setup, and
 * `labels.anonymous` is the word for it — the i18n key and the `anonymous`
 * status filter value are stored identifiers and stay as they are, but the
 * copy they carry says registration is incomplete. "Anonymous" is taken:
 * published games may be posted with no account at all, and that is what the
 * word means on the public side (`resolveNullableAuthorName`). One word for
 * both states is how these accounts came to read as deleted elsewhere in
 * admin — see `AdminUserLink`.
 */
export function StatusBadge({ profile, banReason, labels }: StatusBadgeProps) {
  if (!profile) {
    return <AdminBadge variant="warning">{labels.anonymous}</AdminBadge>;
  }

  if (profile.deletedAt != null) {
    return (
      <div>
        <AdminBadge variant="neutral">{labels.deleted}</AdminBadge>
        <p className="text-xs text-muted-foreground">{formatDate(profile.deletedAt)}</p>
      </div>
    );
  }

  if (profile.bannedAt != null) {
    return (
      <div>
        <AdminBadge variant="danger">{labels.banned}</AdminBadge>
        {banReason && (
          <p className="text-xs text-muted-foreground mt-1" title={banReason}>
            {truncateContent(banReason, BAN_REASON_LENGTH)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{formatDate(profile.bannedAt)}</p>
      </div>
    );
  }

  return <AdminBadge variant="success">{labels.active}</AdminBadge>;
}
