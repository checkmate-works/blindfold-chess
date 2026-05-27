/**
 * Benefits Page
 *
 * @description
 * End-user view of current benefit entitlements. Shows active ad_free status
 * aggregated across both sources:
 *   - Stripe subscriptions (managed at /mypage/subscription)
 *   - user_grants table (automated UGC bonuses + admin manual grants)
 * Both the aggregate status banner and the entitlement table read from the
 * same population: non-revoked ad_free grants for the user, regardless of
 * grantType, plus the active subscription (if any). admin_manual and
 * automated UGC grants (e.g., topic_post) appear together, differentiated
 * only by their per-row sourceLabel. This keeps the banner and the table
 * consistent — a user who sees "active" in the banner also sees the
 * contributing rows in the table below.
 * Guidance on how to earn benefits lives in the FAQ (/faq#ad-free-benefits),
 * linked from this page when ad_free is inactive.
 *
 * @design URL naming rationale
 *
 * URL is `/mypage/benefits` (plural) rather than `/mypage/grants`, `/mypage/ad-free`,
 * or merged into `/mypage/subscription`:
 *   - Plural form: follows CLAUDE.md URL convention for collection-style routes
 *     (user accumulates multiple grant records that stack additively).
 *   - "benefits" (not "grants"): grants is admin/technical jargon reserved for
 *     /admin/grants. End users see "特典 / benefits", matching the `benefitType`
 *     column vocabulary in schema.ts.
 *   - Not coupled to ad_free: the URL is generic so future benefit types
 *     (paywall_access, etc.) can be added without a URL migration.
 *   - Separate from /mypage/subscription: subscription manages the Stripe plan
 *     (billing, cancellation); benefits answers "what am I currently entitled to"
 *     from any source. Both can coexist without duplication — this page READs
 *     subscription status, it does not MANAGE it.
 *
 * @flow
 * 1. User opens /mypage/benefits.
 * 2. Page queries Stripe subscription status (via existing helper) +
 *    user_grants (benefitType='ad_free', not revoked), computes latest
 *    effective expiresAt across both sources.
 * 3. Renders aggregate status banner, then a unified entitlement table:
 *    one row for the active subscription (if any) + up to 5 most recent
 *    grants, sorted by startsAt desc. Each row shows source / period /
 *    status. When >5 grants exist, a "View full history" link routes to
 *    /mypage/benefits/[benefitType] for paginated history (which also
 *    includes revoked grants for audit purposes); subscription is not
 *    counted toward the 5-row cap.
 * 4. On inactive state, displays an FAQ link to /faq#ad-free-benefits.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { getAuthenticatedUser } from '@/lib/auth';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import {
  type EntitlementSourceLabelKey,
  type RowStatus,
  getBenefitsPageData,
} from './_lib/getBenefitsPageData';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'MypageBenefits',
    path: 'mypage/benefits',
    omitDescription: true,
  });
}

export default async function BenefitsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageBenefits' });

  const user = await getAuthenticatedUser();
  const { adFreeActive, latestExpiresAt, entitlementRows, hasMoreGrants } =
    await getBenefitsPageData(user.id);

  const dateFmt = (d: Date) => d.toLocaleDateString(locale);

  const sourceLabel = (key: EntitlementSourceLabelKey): string =>
    key === 'subscription' ? t('adFree.sourceSubscription') : t(`grantTypeLabel.${key}`);

  const statusLabel = (status: RowStatus) => {
    switch (status) {
      case 'active':
        return t('adFree.grantStatusActive');
      case 'upcoming':
        return t('adFree.grantStatusUpcoming');
      case 'expired':
        return t('adFree.grantStatusExpired');
    }
  };

  const statusClass = (status: RowStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'expired':
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
    >
      <SectionTitle>{t('sectionTitle')}</SectionTitle>
      <div className="space-y-6">
        {/* Aggregate status banner */}
        <div
          className={`rounded-xl border p-6 ${
            adFreeActive
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
              : 'border-border bg-card'
          }`}
        >
          {adFreeActive && latestExpiresAt ? (
            <>
              <h2 className="font-semibold text-green-900 dark:text-green-100">
                {t('adFree.statusActive')}
              </h2>
              <p className="mt-1 text-sm text-green-800 dark:text-green-200">
                {t('adFree.activeUntil', { date: dateFmt(latestExpiresAt) })}
              </p>
            </>
          ) : (
            <>
              <h2 className="font-semibold text-foreground">{t('adFree.statusInactive')}</h2>
              <div className="mt-3">
                <Link
                  href="/faq#ad-free-benefits"
                  locale={locale}
                  className="text-sm text-foreground underline hover:opacity-80 transition-colors"
                >
                  {t('adFree.learnHowToEarn')}
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Unified entitlement table — subscription + grants in one list,
              keyed by source. Removes the visual asymmetry of the previous
              two separate cards (one with text, one with nested cards). */}
        {entitlementRows.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                    <th className="px-4 py-2 font-medium">{t('adFree.tableSourceHeader')}</th>
                    <th className="px-4 py-2 font-medium">{t('adFree.tablePeriodHeader')}</th>
                    <th className="px-4 py-2 font-medium text-right">
                      {t('adFree.tableStatusHeader')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entitlementRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {row.sourceHref ? (
                          <Link
                            href={row.sourceHref}
                            locale={locale}
                            className="text-link-primary hover:underline"
                          >
                            {sourceLabel(row.sourceLabelKey)}
                          </Link>
                        ) : (
                          sourceLabel(row.sourceLabelKey)
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {t('adFree.grantPeriod', {
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
                  ))}
                </tbody>
              </table>
            </div>
            {hasMoreGrants && (
              <div className="border-t border-border px-4 py-3">
                <Link
                  href={`/mypage/benefits/ad_free`}
                  locale={locale}
                  className="text-sm text-foreground underline hover:opacity-80 transition-colors"
                >
                  {t('adFree.viewFullHistory')}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
