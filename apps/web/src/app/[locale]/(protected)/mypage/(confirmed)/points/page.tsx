/**
 * Points Page (`/mypage/points`)
 *
 * @description
 * End-user view of point balance + history + ad_free redemption. The
 * companion to /mypage/benefits: benefits shows "what entitlements are
 * active right now" (driven by `user_grants`), while points shows "how
 * many points I have, where they came from, and how to spend them"
 * (driven by `point_events` / `user_point_balances`).
 *
 * @flow
 * 1. User opens /mypage/points.
 * 2. Page reads the balance summary + history rows in one batched fetch.
 * 3. Renders three sections:
 *    - Balance card: confirmed / pending / total.
 *    - Redeem control (only when confirmed ≥ 1): N pt → N days of ad_free.
 *    - History table: most recent ledger rows, with maturation hint on
 *      pending grants.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { CoinIcon } from '@blindfold-chess/icons';

import { getAuthenticatedUser } from '@/lib/auth';
import { AD_FREE_DAYS_PER_POINT, POST_MATURATION_DAYS } from '@/lib/points';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { RedeemForm } from './_components/RedeemForm';
import { getPointsPageData } from './_lib/getPointsPageData';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypagePoints' });
  const title = t('title');
  return {
    ...generateCanonicalMetadata({ locale, path: 'mypage/points', title }),
    title: resolveTitle(title, locale),
    robots: { index: false, follow: false },
  };
}

export default async function PointsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypagePoints' });

  const user = await getAuthenticatedUser();
  const { balance, history, hasMore } = await getPointsPageData(user.id);

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
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('balance.confirmedLabel')}</dt>
              <dd className="font-semibold text-foreground">
                {t('balance.amount', { amount: balance.confirmed })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('balance.pendingLabel')}</dt>
              <dd className="font-semibold text-foreground">
                {t('balance.amount', { amount: balance.pending })}
              </dd>
            </div>
          </dl>
          {balance.pending > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t('balance.pendingNote', { days: POST_MATURATION_DAYS })}
            </p>
          )}
        </div>

        {/* Redeem control */}
        <RedeemForm confirmedBalance={balance.confirmed} daysPerPoint={AD_FREE_DAYS_PER_POINT} />

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
                          <div className="flex flex-col">
                            <span className="text-foreground">{t(`history.kind.${row.kind}`)}</span>
                            {row.maturesAt && (
                              <span className="text-xs text-muted-foreground">
                                {t('history.maturesOn', { date: dateFmt(row.maturesAt) })}
                              </span>
                            )}
                          </div>
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
