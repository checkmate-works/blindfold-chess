import Link from 'next/link';

import { formatDate } from '@/app/admin/_lib/format';
import type { User } from '@supabase/supabase-js';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { CopyUserIdButton } from './CopyUserIdButton';
import { StatusBadge } from './StatusBadge';

type Profile = {
  id: string;
  username: string | null;
  bannedAt: Date | null;
  deletedAt: Date | null;
};

type UserRowProps = {
  user: User;
  profile: Profile | undefined;
  hasSubscription: boolean;
  banReason: string | null;
  signupMethod: 'google' | 'email' | 'unknown';
  labels: {
    premium: string;
    free: string;
    anonymous: string;
    deleted: string;
    banned: string;
    active: string;
    viewDetail: string;
    google: string;
    email: string;
    unknown: string;
    copyUserId: string;
    copyUserIdSuccess: string;
  };
};

export function UserRow({
  user,
  profile,
  hasSubscription,
  banReason,
  signupMethod,
  labels,
}: UserRowProps) {
  return (
    <tr key={user.id} className="border-t border-border">
      <td className="px-4 py-3">
        <CopyUserIdButton
          userId={user.id}
          labels={{
            copyUserId: labels.copyUserId,
            copyUserIdSuccess: labels.copyUserIdSuccess,
          }}
        />
      </td>
      <td className="px-4 py-3">
        <span>{user.email ?? '-'}</span>
      </td>
      <td className="px-4 py-3">
        {profile?.username ? (
          <Link
            href={`/en/u/${encodeURIComponent(profile.username)}`}
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
      <td className="px-4 py-3">
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground">
          {labels[signupMethod]}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(user.created_at)}</td>
      <td className="px-4 py-3">
        <Link href={`/admin/users/${user.id}`} className="text-primary hover:underline">
          {labels.viewDetail}
        </Link>
      </td>
    </tr>
  );
}
