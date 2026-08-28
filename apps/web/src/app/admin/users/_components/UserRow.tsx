import Link from 'next/link';

import { AdminBadge } from '@/app/admin/_components/AdminBadge';
import { MaskedEmail } from '@/app/admin/_components/MaskedEmail';
import { formatDate } from '@/app/admin/_lib/format';
import type { User } from '@supabase/supabase-js';
import { FaExternalLinkAlt } from 'react-icons/fa';

import type { AdminUserFilters } from '../_lib/filters';
import { CopyUserIdButton } from './CopyUserIdButton';
import { CountryFilterFlag } from './CountryFilterFlag';
import { StatusBadge } from './StatusBadge';

type Profile = {
  id: string;
  username: string | null;
  country: string | null;
  bannedAt: Date | null;
  deletedAt: Date | null;
};

type UserRowProps = {
  user: User;
  profile: Profile | undefined;
  /** Filters currently applied — carried over by the country flag's filter link. */
  filters: AdminUserFilters;
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
    revealEmail: string;
    hideEmail: string;
    filterByCountry: string;
  };
};

export function UserRow({
  user,
  profile,
  filters,
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
        <MaskedEmail
          email={user.email}
          labels={{ revealEmail: labels.revealEmail, hideEmail: labels.hideEmail }}
        />
      </td>
      <td className="whitespace-nowrap px-4 py-3">
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
        {/* Trailing, and outside the profile link: a leading flag would indent
            the names of flagged users only (users without a country get no
            placeholder), breaking the column's scannability — and a link may
            not nest inside another link. */}
        {profile?.country ? (
          <CountryFilterFlag
            code={profile.country}
            filters={filters}
            label={labels.filterByCountry}
          />
        ) : null}
      </td>
      <td className="px-4 py-3">
        <AdminBadge variant={hasSubscription ? 'success' : 'neutral'}>
          {hasSubscription ? labels.premium : labels.free}
        </AdminBadge>
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
        <AdminBadge variant="neutral">{labels[signupMethod]}</AdminBadge>
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
