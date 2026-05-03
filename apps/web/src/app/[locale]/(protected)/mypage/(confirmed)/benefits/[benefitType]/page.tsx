/**
 * Benefit Grant History Page
 *
 * @description
 * Paginated history of a user's benefit grants filtered by benefitType.
 * Linked from /mypage/benefits "View full history" when the user has
 * more than 5 grants. Currently the only supported benefitType is
 * 'ad_free'; other URLs return 404 via Next.js notFound().
 *
 * Unlike /mypage/benefits which excludes revoked grants, this history
 * view INCLUDES revoked grants so the user can audit their full grant
 * timeline. Revoked grants render with a dedicated 'revoked' status
 * badge. Grants of all grantTypes (admin_manual, topic_post, etc.) are
 * shown together — row labels via grantTypeLabel differentiate sources.
 *
 * @design URL shape
 *
 * `/mypage/benefits/[benefitType]` — the dynamic segment is a
 * benefitType code (e.g., 'ad_free'). This generalizes for future
 * benefit types (e.g., 'paywall_access') without requiring a new route.
 * Filtering by benefitType (not grantType) matches the logical axis of
 * "what the user has been granted" rather than "how it was earned".
 *
 * @flow
 * 1. Route group (protected)/(confirmed) enforces auth
 * 2. benefitType param validated against allowed values; invalid → notFound()
 * 3. Query user_grants filtered by (userId, benefitType), INCLUDING
 *    revoked — ordered by startsAt DESC
 * 4. Paginate (20/page via nuqs), render rows with status badges
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, positions, topicPosts, userGrants } from '@/lib/db';
import { type GrantType, isGrantType } from '@/lib/db/data/grant-types';
import { getPaginationParams } from '@/lib/pagination';

import { PageLayout, PaginationNav, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { resolveGrantSourceMeta } from '../_lib/source';

const PAGE_SIZE = 20;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = {
  params: Promise<{ locale: Locale; benefitType: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type GrantRowStatus = 'active' | 'upcoming' | 'expired' | 'revoked';

function classifyGrantForHistory(
  now: Date,
  startsAt: Date,
  expiresAt: Date,
  revokedAt: Date | null
): GrantRowStatus {
  if (revokedAt) return 'revoked';
  if (expiresAt <= now) return 'expired';
  if (startsAt > now) return 'upcoming';
  return 'active';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, benefitType } = await params;
  if (benefitType !== 'ad_free') {
    return { title: resolveTitle('Not Found', locale) };
  }
  const t = await getTranslations({ locale, namespace: 'MypageBenefitHistory' });
  const title = t('title');
  return {
    ...generateCanonicalMetadata({ locale, path: `mypage/benefits/${benefitType}`, title }),
    title: resolveTitle(title, locale),
    robots: { index: false, follow: false },
  };
}

export default async function BenefitHistoryPage({ params, searchParams }: Props) {
  const { locale, benefitType } = await params;
  if (benefitType !== 'ad_free') {
    notFound();
  }

  // Two namespaces: history page strings live under MypageBenefitHistory,
  // but the source-column label keys (grantTypeLabel.*) and table headers
  // are shared with /mypage/benefits and stay under MypageBenefits — both
  // pages render the same vocabulary so users see consistent terminology.
  const [t, tBenefits] = await Promise.all([
    getTranslations({ locale, namespace: 'MypageBenefitHistory' }),
    getTranslations({ locale, namespace: 'MypageBenefits' }),
  ]);

  const user = await getAuthenticatedUser();

  const { page } = await searchParamsCache.parse(searchParams);

  // Include revoked grants — this is the audit/history view.
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userGrants)
    .where(and(eq(userGrants.userId, user.id), eq(userGrants.benefitType, benefitType)));

  const totalCount = Number(countResult?.count ?? 0);

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    PAGE_SIZE
  );

  const rows = await db
    .select()
    .from(userGrants)
    .where(and(eq(userGrants.userId, user.id), eq(userGrants.benefitType, benefitType)))
    .orderBy(desc(userGrants.startsAt))
    .limit(limit)
    .offset(offset);

  // Batch-resolve source rows (topic_posts / positions) for the visible
  // page only — keeps the lookup proportional to PAGE_SIZE rather than to
  // the user's full grant history. Hard-deleted source rows fall through
  // to a non-link label, mirroring /mypage/benefits.
  const topicPostIds = rows
    .filter((g) => g.sourceType === 'topic_post' && g.sourceId)
    .map((g) => g.sourceId as string);
  const positionIds = rows
    .filter((g) => g.sourceType === 'position' && g.sourceId)
    .map((g) => g.sourceId as string);

  const [topicPostRows, positionRows] = await Promise.all([
    topicPostIds.length
      ? db
          .select({
            id: topicPosts.id,
            topicType: topicPosts.topicType,
            topicKey: topicPosts.topicKey,
          })
          .from(topicPosts)
          .where(inArray(topicPosts.id, topicPostIds))
      : Promise.resolve([] as Array<{ id: string; topicType: string; topicKey: string }>),
    positionIds.length
      ? db
          .select({ id: positions.id, type: positions.type })
          .from(positions)
          .where(inArray(positions.id, positionIds))
      : Promise.resolve([] as Array<{ id: string; type: string }>),
  ]);

  const topicPostMap = new Map(topicPostRows.map((r) => [r.id, r]));
  const positionMap = new Map(positionRows.map((r) => [r.id, r]));

  const now = new Date();
  const dateFmt = (d: Date) => d.toLocaleDateString(locale);

  const statusLabel = (status: GrantRowStatus) => {
    switch (status) {
      case 'active':
        return t('statusActive');
      case 'upcoming':
        return t('statusUpcoming');
      case 'expired':
        return t('statusExpired');
      case 'revoked':
        return t('statusRevoked');
    }
  };

  const statusClass = (status: GrantRowStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'expired':
        return 'bg-muted text-muted-foreground';
      case 'revoked':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
    }
  };

  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/mypage/benefits/${benefitType}${qs}`;
  };

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[
        { label: t('breadcrumbMypage'), href: '/mypage' },
        { label: t('breadcrumbBenefits'), href: '/mypage/benefits' },
        { label: t('title') },
      ]}
    >
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            {t('showing', {
              from: (currentPage - 1) * PAGE_SIZE + 1,
              to: (currentPage - 1) * PAGE_SIZE + rows.length,
              total: totalCount,
            })}
          </p>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                    <th className="px-4 py-2 font-medium">
                      {tBenefits('adFree.tableSourceHeader')}
                    </th>
                    <th className="px-4 py-2 font-medium">
                      {tBenefits('adFree.tablePeriodHeader')}
                    </th>
                    <th className="px-4 py-2 font-medium text-right">
                      {tBenefits('adFree.tableStatusHeader')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((g) => {
                    const startsAt = new Date(g.startsAt);
                    const expiresAt = new Date(g.expiresAt);
                    const revokedAt = g.revokedAt ? new Date(g.revokedAt) : null;
                    const status = classifyGrantForHistory(now, startsAt, expiresAt, revokedAt);
                    const grantTypeKey: GrantType = isGrantType(g.grantType)
                      ? g.grantType
                      : 'admin_manual';
                    const { labelKey, href } = resolveGrantSourceMeta(
                      {
                        grantType: grantTypeKey,
                        sourceType: g.sourceType,
                        sourceId: g.sourceId,
                      },
                      topicPostMap,
                      positionMap
                    );
                    const sourceLabel = tBenefits(`grantTypeLabel.${labelKey}`);

                    return (
                      <tr key={g.id}>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {href ? (
                            <Link
                              href={href}
                              locale={locale}
                              className="text-link-primary hover:underline"
                            >
                              {sourceLabel}
                            </Link>
                          ) : (
                            sourceLabel
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {t('grantPeriod', {
                            startDate: dateFmt(startsAt),
                            endDate: dateFmt(expiresAt),
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(
                              status
                            )}`}
                          >
                            {statusLabel(status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </PageLayout>
  );
}
