/**
 * Coins Page (コイン, `/mypage/coins`)
 *
 * @description
 * End-user view of coin balance + history + ad_free redemption. "Coin" is
 * the facing name for the points ledger — see the "Points / Coin Economy"
 * note in apps/web/CLAUDE.md. The companion to /mypage/benefits: benefits
 * shows "what entitlements are active right now" (driven by `user_grants`),
 * while this shows "how many coins I have, where they came from, and how to
 * spend them" (driven by `point_events` / `user_point_balances`).
 *
 * @flow
 * 1. User opens /mypage/coins.
 * 2. Page reads the balance summary + history rows in one batched fetch.
 * 3. Renders three sections:
 *    - Balance card: the user's total Coin balance.
 *    - Redeem control (only when balance ≥ 1): N Coin → N days of ad_free.
 *    - History table: most recent ledger rows.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { CoinIcon } from '@blindfold-chess/icons';

import { getAuthenticatedUser } from '@/lib/auth';
import { AD_FREE_DAYS_PER_POINT } from '@/lib/points';
import { hasDanTierRank } from '@/lib/users/dan-rank';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { RedeemForm } from './_components/RedeemForm';
import { getPointsPageData } from './_lib/getPointsPageData';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'MypagePoints',
    path: 'mypage/coins',
    omitDescription: true,
  });
}

export default async function CoinsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypagePoints' });

  const user = await getAuthenticatedUser();
  const [{ balance, history, hasMore, dailyCap }, danAdFree] = await Promise.all([
    getPointsPageData(user.id),
    hasDanTierRank(user.id),
  ]);

  const dateFmt = (d: Date) => d.toLocaleDateString(locale);

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
    >
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      <div className="space-y-6">
        {/* Balance summary card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <CoinIcon size={32} aria-hidden="true" />
            <span className="text-3xl font-bold text-foreground">{balance.total}</span>
            <span className="text-sm text-muted-foreground">{t('balance.unit')}</span>
          </div>
          <Link
            href="/coin"
            locale={locale}
            className="mt-3 inline-block text-sm text-muted-foreground underline hover:opacity-80"
          >
            {t('balance.aboutLink')}
          </Link>
        </div>

        {/* Daily creation-cap status */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">{t('dailyCap.label')}</span>
            <span className="text-sm font-medium text-foreground">
              {t('dailyCap.value', { earned: dailyCap.earnedToday, cap: dailyCap.cap })}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('dailyCap.note', { cap: dailyCap.cap })}
          </p>
        </div>

        {/* Redeem control */}
        <RedeemForm
          balance={balance.total}
          daysPerPoint={AD_FREE_DAYS_PER_POINT}
          danAdFree={danAdFree}
        />

        {/* History */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">{t('history.title')}</h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('history.empty')}{' '}
              <Link
                href="/faq#ad-free-benefits"
                locale={locale}
                className="underline hover:opacity-80"
              >
                {t('history.learnHowToEarn')}
              </Link>
            </p>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                      <th className="px-4 py-2 font-medium">{t('history.headerDate')}</th>
                      <th className="px-4 py-2 font-medium">{t('history.headerEvent')}</th>
                      <th className="px-4 py-2 font-medium text-right">
                        {t('history.headerDelta')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {dateFmt(row.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-foreground">{t(`history.kind.${row.kind}`)}</span>
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono ${
                            row.delta > 0 ? 'text-green-700 dark:text-green-300' : 'text-foreground'
                          }`}
                        >
                          {row.delta > 0 ? `+${row.delta}` : `${row.delta}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMore && (
                <p className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                  {t('history.truncatedNote')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
