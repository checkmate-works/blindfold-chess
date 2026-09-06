import { AdminBadge, type AdminBadgeVariant } from '@/app/admin/_components/AdminBadge';
import { AdminExternalLink } from '@/app/admin/_components/AdminExternalLink';
import { AdminUserLink } from '@/app/admin/_components/AdminUserLink';
import { formatDateTime } from '@/app/admin/_lib/format';

import type { UserActivityLog } from '@/lib/db/schema';

import { type ActivityTargetLinkMap, activityTargetKey } from '../_lib/target-links';

/** Characters of the raw id shown for a target the row has no name for. */
const ID_PREFIX_LENGTH = 8;

function actionBadgeVariant(action: string): AdminBadgeVariant {
  switch (action) {
    // Destructive / dangerous
    case 'delete_account':
    case 'delete_post':
      return 'danger';

    // Security attention
    case 'change_password':
    case 'request_password_reset':
    case 'logout':
      return 'warning';

    // Normal operations
    case 'login':
    case 'create_post':
    case 'create_reply':
    case 'like':
    case 'unlike':
      return 'info';

    // Profile / social
    case 'follow':
    case 'unfollow':
    case 'update_profile':
      return 'success';

    // Default / unknown
    default:
      return 'neutral';
  }
}

type ActivityTargetProps = {
  log: UserActivityLog;
  profileMap: Map<string, { username: string | null }>;
  deletedUserLabel: string;
  targetLinks: ActivityTargetLinkMap;
};

/**
 * The Target column's content, minus the `[target_type]` prefix.
 *
 * Three kinds of target, in order: a person, who links to their admin detail
 * page; a UGC row, which links out to the public page it is read on; and
 * everything else, which is the raw id — the only handle left on a target
 * whose row is gone or whose type has no page.
 */
function ActivityTarget({ log, profileMap, deletedUserLabel, targetLinks }: ActivityTargetProps) {
  const metadata = log.metadata as Record<string, unknown> | null;

  if (log.targetType === 'user' && log.targetId) {
    return (
      <AdminUserLink
        userId={log.targetId}
        username={profileMap.get(log.targetId)?.username}
        deletedLabel={deletedUserLabel}
      />
    );
  }

  if (log.targetType === 'rank') {
    return (
      <span className="text-xs">
        {metadata?.rankSlug ? String(metadata.rankSlug) : (log.targetId ?? '-')}
      </span>
    );
  }

  const link =
    log.targetType && log.targetId
      ? targetLinks.get(activityTargetKey(log.targetType, log.targetId))
      : undefined;

  if (link && log.targetId) {
    return (
      <AdminExternalLink path={link.path}>
        <span className="text-xs">
          {link.label ?? `${log.targetId.slice(0, ID_PREFIX_LENGTH)}...`}
        </span>
      </AdminExternalLink>
    );
  }

  return (
    <span className="text-xs" title={log.targetId ?? undefined}>
      {log.targetId ?? '-'}
    </span>
  );
}

type ActivityLogRowProps = {
  log: UserActivityLog;
  profileMap: Map<string, { username: string | null }>;
  /** Shown for actors and targets whose profile row is gone. */
  deletedUserLabel: string;
  /** Public links for this page's UGC targets, from `resolveActivityTargetLinks`. */
  targetLinks: ActivityTargetLinkMap;
};

export function ActivityLogRow({
  log,
  profileMap,
  deletedUserLabel,
  targetLinks,
}: ActivityLogRowProps) {
  const metadataStr = log.metadata ? JSON.stringify(log.metadata) : '-';
  const metadata = log.metadata as Record<string, unknown> | null;

  return (
    <tr key={log.id} className="border-t border-border">
      <td className="px-4 py-3">
        <AdminBadge variant={actionBadgeVariant(log.action)}>{log.action}</AdminBadge>
      </td>
      <td className="px-4 py-3">
        <AdminUserLink
          userId={log.userId}
          username={profileMap.get(log.userId)?.username}
          deletedLabel={deletedUserLabel}
        />
      </td>
      <td className="px-4 py-3">
        {log.targetType ? (
          <>
            <span className="text-muted-foreground text-xs mr-1">[{log.targetType}]</span>
            <ActivityTarget
              log={log}
              profileMap={profileMap}
              deletedUserLabel={deletedUserLabel}
              targetLinks={targetLinks}
            />
          </>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        {metadataStr !== '-' && metadataStr !== '{}' ? (
          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              {metadataStr.length > 60 ? `${metadataStr.slice(0, 60)}...` : metadataStr}
            </summary>
            <pre className="mt-2 max-w-md whitespace-pre-wrap break-words rounded bg-muted px-2 py-1 text-xs text-foreground">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </details>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
    </tr>
  );
}
