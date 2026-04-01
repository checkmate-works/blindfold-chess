import Link from 'next/link';

import type { User } from '@supabase/supabase-js';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { BanButton } from './BanButton';
import { StatusBadge } from './StatusBadge';
import { UnbanButton } from './UnbanButton';

type Profile = {
  id: string;
  username: string | null;
  bannedAt: Date | null;
  deletedAt: Date | null;
};

type UserRowProps = {
  user: User;
  profile: Profile | undefined;
  role: string | undefined;
  hasSubscription: boolean;
  banReason: string | null;
  isCurrentUser: boolean;
  labels: {
    defaultRole: string;
    premium: string;
    free: string;
    anonymous: string;
    deleted: string;
    banned: string;
    active: string;
    viewPosts: string;
    viewActivity: string;
    viewSubscriptions: string;
  };
};

export function UserRow({
  user,
  profile,
  role,
  hasSubscription,
  banReason,
  isCurrentUser,
  labels,
}: UserRowProps) {
  const isDeleted = profile?.deletedAt != null;
  const isBanned = profile?.bannedAt != null;

  return (
    <tr key={user.id} className="border-t border-border">
      <td className="px-4 py-3">{user.email ?? '-'}</td>
      <td className="px-4 py-3">
        {profile?.username ? (
          <Link
            href={`/en/profile/${encodeURIComponent(profile.username)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {profile.username}
            <FaExternalLinkAlt className="h-3 w-3" />
          </Link>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
          }`}
        >
          {role ?? labels.defaultRole}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            hasSubscription
              ? 'bg-success-soft text-success-soft-foreground'
              : 'bg-secondary text-foreground'
          }`}
        >
          {hasSubscription ? labels.premium : labels.free}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge
          profile={profile}
          banReason={banReason}
          labels={{
            anonymous: labels.anonymous,
            deleted: labels.deleted,
            banned: labels.banned,
            active: labels.active,
          }}
        />
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
      </td>
      <td className="px-4 py-3">
        {isDeleted ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center gap-2">
            {profile && (
              <>
                <Link
                  href={`/admin/topic_posts?user=${encodeURIComponent(profile?.username ?? user.email ?? user.id)}`}
                  className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
                >
                  {labels.viewPosts}
                </Link>
                <Link
                  href={`/admin/activity-log?user=${encodeURIComponent(profile.username ?? '')}`}
                  className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
                >
                  {labels.viewActivity}
                </Link>
                <Link
                  href={`/admin/subscriptions?user=${user.id}`}
                  className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
                >
                  {labels.viewSubscriptions}
                </Link>
              </>
            )}
            {!isCurrentUser && profile && (
              <>{isBanned ? <UnbanButton userId={user.id} /> : <BanButton userId={user.id} />}</>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
