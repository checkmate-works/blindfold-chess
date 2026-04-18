/**
 * Benefit Grant History Page (特典履歴)
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

import { and, desc, eq, sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, userGrants } from '@/lib/db';
import { getPaginationParams } from '@/lib/pagination';

import {
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

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

  const t = await getTranslations({ locale, namespace: 'MypageBenefitHistory' });

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
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
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
            <ul className="space-y-3">
              {rows.map((g) => {
                const startsAt = new Date(g.startsAt);
                const expiresAt = new Date(g.expiresAt);
                const revokedAt = g.revokedAt ? new Date(g.revokedAt) : null;
                const status = classifyGrantForHistory(now, startsAt, expiresAt, revokedAt);
                return (
                  <li
                    key={g.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {t('grantPeriod', {
                          startDate: dateFmt(startsAt),
                          endDate: dateFmt(expiresAt),
                        })}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(
                        status
                      )}`}
                    >
                      {statusLabel(status)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        <Divider />

        <Breadcrumb
          locale={locale}
          items={[
            { label: t('breadcrumbMypage'), href: '/mypage' },
            { label: t('breadcrumbBenefits'), href: '/mypage/benefits' },
            { label: t('title') },
          ]}
        />
      </PagePanel>
    </div>
  );
}
