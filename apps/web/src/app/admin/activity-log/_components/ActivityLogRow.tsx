import Link from 'next/link';

import { AdminBadge, type AdminBadgeVariant } from '@/app/admin/_components/AdminBadge';
import { formatDateTime } from '@/app/admin/_lib/format';
import { FaExternalLinkAlt } from 'react-icons/fa';

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

function formatUserDisplay(
  userId: string,
  profileMap: Map<string, { username: string | null }>,
  emailMap: Map<string, string>
): string {
  const profile = profileMap.get(userId);
  if (profile?.username) return profile.username;

  const email = emailMap.get(userId);
  if (email) return email;

  // Neither username nor email available — likely a deleted account
  const shortId = userId.length > 8 ? userId.slice(0, 8) : userId;
  return `[deleted] (${shortId}...)`;
}

type ActivityLog = {
  id: string;
  userId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: Date;
};

type ActivityLogRowProps = {
  log: ActivityLog;
  profileMap: Map<string, { username: string | null }>;
  emailMap: Map<string, string>;
};

export function ActivityLogRow({ log, profileMap, emailMap }: ActivityLogRowProps) {
  const userDisplay = formatUserDisplay(log.userId, profileMap, emailMap);
  const metadataStr = log.metadata ? JSON.stringify(log.metadata) : '-';
  const metadata = log.metadata as Record<string, unknown> | null;

  return (
    <tr key={log.id} className="border-t border-border">
      <td className="px-4 py-3">
        <AdminBadge variant={actionBadgeVariant(log.action)}>{log.action}</AdminBadge>
      </td>
      <td className="px-4 py-3">
        {profileMap.get(log.userId)?.username ? (
          <Link
            href={`/en/u/${encodeURIComponent(profileMap.get(log.userId)!.username!)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {profileMap.get(log.userId)!.username}
            <FaExternalLinkAlt className="h-3 w-3" />
          </Link>
        ) : (
          userDisplay
        )}
      </td>
      <td className="px-4 py-3">
        {log.targetType ? (
          <>
            <span className="text-muted-foreground text-xs mr-1">[{log.targetType}]</span>
            {log.targetType === 'user' && log.targetId ? (
              profileMap.get(log.targetId)?.username ? (
                <Link
                  href={`/en/u/${encodeURIComponent(profileMap.get(log.targetId)!.username!)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {profileMap.get(log.targetId)!.username}
                  <FaExternalLinkAlt className="h-3 w-3" />
                </Link>
              ) : (
                formatUserDisplay(log.targetId, profileMap, emailMap)
              )
            ) : log.targetType === 'rank' ? (
              <span className="text-xs">
                {metadata?.rankSlug ? String(metadata.rankSlug) : (log.targetId ?? '-')}
              </span>
            ) : log.targetType === 'topic_post' && log.targetId ? (
              <span className="text-xs" title={log.targetId}>
                {log.targetId.slice(0, 8)}...
              </span>
            ) : (
              <span className="text-xs">{log.targetId ?? '-'}</span>
            )}
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
