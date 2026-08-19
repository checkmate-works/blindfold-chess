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
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { buildPageHref, getPageRange } from '@/lib/pagination';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import {
  type GrantHistoryRowStatus,
  getBenefitHistoryPageData,
} from './_lib/getBenefitHistoryPageData';

const PAGE_SIZE = 20;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = {
  params: Promise<{ locale: Locale; benefitType: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
  const [t, tBenefits, parsedParams, user] = await Promise.all([
    getTranslations({ locale, namespace: 'MypageBenefitHistory' }),
    getTranslations({ locale, namespace: 'MypageBenefits' }),
    searchParamsCache.parse(searchParams),
    getAuthenticatedUser(),
  ]);

  const { rows, totalCount, currentPage, totalPages } = await getBenefitHistoryPageData({
    userId: user.id,
    benefitType,
    page: parsedParams.page,
    pageSize: PAGE_SIZE,
  });

  const dateFmt = (d: Date) => d.toLocaleDateString(locale);

  const statusLabel = (status: GrantHistoryRowStatus) => {
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

  const statusClass = (status: GrantHistoryRowStatus) => {
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

  const buildHref = buildPageHref(`/${locale}/mypage/benefits/${benefitType}`);

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
              ...getPageRange(currentPage, PAGE_SIZE, rows.length),
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
                  {rows.map((row) => {
                    const sourceLabel = tBenefits(`grantTypeLabel.${row.sourceLabelKey}`);
                    return (
                      <tr key={row.id}>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {row.sourceHref ? (
                            <Link
                              href={row.sourceHref}
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
                            startDate: dateFmt(row.startsAt),
                            endDate: dateFmt(row.expiresAt),
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(
                              row.status
                            )}`}
                          >
                            {statusLabel(row.status)}
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

      <PaginationNav
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={buildHref}
        locale={locale}
      />
    </PageLayout>
  );
}
