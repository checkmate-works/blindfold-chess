import type { EditRequestStatus } from '@/lib/edit-requests/shared';
import type { AuthorProfile } from '@/lib/users/author-profile';

import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';

/**
 * Badge tint per lifecycle state. One table, so the chunk and position
 * request lists cannot drift into two different shades of "rejected".
 */
const STATUS_BADGE_CLASS: Record<EditRequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  accepted: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
  rejected: 'bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-100',
  withdrawn: 'bg-muted text-muted-foreground',
};

type Props = {
  /** Proposer profile, or null when the proposer's account was hard-deleted. */
  proposer: AuthorProfile | null;
  createdAt: Date;
  status: EditRequestStatus;
  locale: string;
  labels: {
    /** Shown in place of a name once the proposer's account is gone. */
    deletedProposer: string;
    justNow: string;
    /** Already-translated label for `status` — the caller owns the namespace. */
    status: string;
  };
};

/** Avatar, submission time and lifecycle badge across the top of a request row. */
export function EditRequestHeader({ proposer, createdAt, status, locale, labels }: Props) {
  const proposerName = proposer?.displayName ?? proposer?.username ?? labels.deletedProposer;
  const profileHref = proposer?.username ? `/u/${proposer.username}` : null;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <UserAvatar
          profileHref={profileHref}
          avatarUrl={proposer?.avatarUrl ?? null}
          displayName={proposerName}
          locale={locale}
          size="sm"
        />
        <span className="text-xs text-muted-foreground">
          <time dateTime={createdAt.toISOString()}>
            {formatRelativeTime(createdAt, locale, labels.justNow)}
          </time>
        </span>
      </div>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[status]}`}
      >
        {labels.status}
      </span>
    </div>
  );
}
