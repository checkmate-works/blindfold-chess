import { desc, inArray, sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { db, profiles, userGrants } from '@/lib/db';
import { getPaginationParams } from '@/lib/pagination';
import { createAdminClient } from '@/lib/supabase/admin';

import { PaginationNav } from '@/app/[locale]/_components';

import { AdminDataTable } from '../_components/AdminDataTable';
import { DEFAULT_PAGE_SIZE } from '../_lib/pagination';
import { GrantForm } from './_components/GrantForm';
import { RevokeButton } from './_components/RevokeButton';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

function getGrantStatus(grant: { revokedAt: Date | null; expiresAt: Date }): {
  label: string;
  className: string;
} {
  if (grant.revokedAt) {
    return { label: 'Revoked', className: 'bg-destructive-soft text-destructive-soft-foreground' };
  }
  if (new Date(grant.expiresAt) < new Date()) {
    return { label: 'Expired', className: 'bg-secondary text-muted-foreground' };
  }
  return { label: 'Active', className: 'bg-success-soft text-success-soft-foreground' };
}

export default async function AdminGrantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await searchParamsCache.parse(searchParams);

  // Get total count
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(userGrants);
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    countResult?.count ?? 0,
    DEFAULT_PAGE_SIZE
  );

  // Fetch paginated grants
  const grantRows = await db
    .select()
    .from(userGrants)
    .orderBy(desc(userGrants.createdAt))
    .limit(limit)
    .offset(offset);

  // Look up profiles for usernames
  const userIds = [...new Set(grantRows.map((g) => g.userId))];
  const userProfiles =
    userIds.length > 0 ? await db.select().from(profiles).where(inArray(profiles.id, userIds)) : [];
  const profileMap = new Map(userProfiles.map((p) => [p.id, p]));

  // Look up auth users for emails
  const adminClient = createAdminClient();
  const emailMap = new Map<string, string>();
  await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await adminClient.auth.admin.getUserById(userId);
      if (data?.user?.email) {
        emailMap.set(userId, data.user.email);
      }
    })
  );

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    return `/admin/grants?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Grants</h1>

      <div className="mb-8">
        <GrantForm />
      </div>

      {grantRows.length > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          Showing {(currentPage - 1) * DEFAULT_PAGE_SIZE + 1}&ndash;
          {(currentPage - 1) * DEFAULT_PAGE_SIZE + grantRows.length} of {countResult?.count ?? 0}{' '}
          grants
        </p>
      )}

      <AdminDataTable
        headers={['User', 'Benefit', 'Grant Type', 'Reason', 'Period', 'Status', 'Actions']}
        items={grantRows}
        emptyMessage="No grants found"
        renderRow={(grant) => {
          const profile = profileMap.get(grant.userId);
          const email = emailMap.get(grant.userId);
          const status = getGrantStatus(grant);
          const isActive = !grant.revokedAt && new Date(grant.expiresAt) >= new Date();

          return (
            <tr key={grant.id} className="border-t border-border">
              <td className="px-4 py-3">
                <div className="text-sm">{email ?? grant.userId}</div>
                {profile?.username && (
                  <div className="text-xs text-muted-foreground">@{profile.username}</div>
                )}
              </td>
              <td className="px-4 py-3">{grant.benefitType}</td>
              <td className="px-4 py-3">{grant.grantType}</td>
              <td className="px-4 py-3 text-muted-foreground max-w-48 truncate">
                {grant.reason ?? '-'}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                <div>{new Date(grant.startsAt).toLocaleDateString()}</div>
                <div>~ {new Date(grant.expiresAt).toLocaleDateString()}</div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </span>
              </td>
              <td className="px-4 py-3">{isActive && <RevokeButton grantId={grant.id} />}</td>
            </tr>
          );
        }}
      />

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
