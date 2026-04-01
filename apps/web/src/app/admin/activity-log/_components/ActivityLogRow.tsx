import Link from 'next/link';

import { FaExternalLinkAlt } from 'react-icons/fa';

function getActionBadgeClasses(action: string): string {
  switch (action) {
    // Destructive / dangerous
    case 'delete_account':
    case 'delete_post':
      return 'bg-destructive-soft text-destructive-soft-foreground';

    // Security attention
    case 'change_password':
    case 'request_password_reset':
    case 'logout':
      return 'bg-warning-soft text-warning-soft-foreground';

    // Normal operations
    case 'login':
    case 'create_post':
    case 'create_reply':
    case 'like':
    case 'unlike':
      return 'bg-info-soft text-info-soft-foreground';

    // Profile / social
    case 'follow':
    case 'unfollow':
    case 'update_profile':
      return 'bg-success-soft text-success-soft-foreground';

    // Default / unknown
    default:
      return 'bg-secondary text-secondary-foreground';
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
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getActionBadgeClasses(log.action)}`}
        >
          {log.action}
        </span>
      </td>
      <td className="px-4 py-3">
        {profileMap.get(log.userId)?.username ? (
          <Link
            href={`/en/profile/${encodeURIComponent(profileMap.get(log.userId)!.username!)}`}
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
                  href={`/en/profile/${encodeURIComponent(profileMap.get(log.targetId)!.username!)}`}
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
      <td className="px-4 py-3">
        {metadataStr !== '-' && metadataStr !== '{}' ? (
          <span title={metadataStr} className="text-xs text-muted-foreground">
            {metadataStr.length > 60 ? `${metadataStr.slice(0, 60)}...` : metadataStr}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {new Date(log.createdAt).toLocaleString()}
      </td>
    </tr>
  );
}
