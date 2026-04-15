/**
 * Benefits Page (特典)
 *
 * @description
 * End-user view of current benefit entitlements. Shows active ad_free status
 * aggregated across both sources:
 *   - Stripe subscriptions (managed at /mypage/subscription)
 *   - user_grants table (automated UGC bonuses + admin manual grants)
 * The aggregate status banner reflects ALL ad_free grants (including
 * admin_manual), while the detailed "From benefit grants" list is
 * intentionally filtered to topic_post grants only — this section is
 * conceptually a view of what the user has earned through contributions.
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
 * 3. Renders aggregate status banner, subscription source (if active),
 *    and a topic_post-filtered grant list (latest 5, desc by startsAt).
 *    When >5 topic_post grants exist, a "View full history" link routes
 *    to /mypage/benefits/[grantType] for paginated history (which also
 *    includes revoked grants for audit purposes).
 * 4. On inactive state, displays an FAQ link to /faq#ad-free-benefits
 *    and swaps the grant list title to "Past benefits".
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, userGrants } from '@/lib/db';
import { type GrantType, isGrantType } from '@/lib/db/data/grant-types';
import { getUserSubscription } from '@/lib/subscription';
import { BENEFIT_ACTIVE_STATUSES } from '@/lib/subscription-constants';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

type GrantRowStatus = 'active' | 'upcoming' | 'expired';

function classifyGrant(now: Date, startsAt: Date, expiresAt: Date): GrantRowStatus {
  if (expiresAt <= now) return 'expired';
  if (startsAt > now) return 'upcoming';
  return 'active';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageBenefits' });
  const title = t('title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'mypage/benefits', title }),
    title: resolveTitle(title, locale),
    robots: { index: false, follow: false },
  };
}

export default async function BenefitsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageBenefits' });

  const user = await getAuthenticatedUser();

  const [subscription, allGrants] = await Promise.all([
    getUserSubscription(user.id),
    db
      .select()
      .from(userGrants)
      .where(
        and(
          eq(userGrants.userId, user.id),
          eq(userGrants.benefitType, 'ad_free'),
          isNull(userGrants.revokedAt)
        )
      )
      .orderBy(desc(userGrants.startsAt)),
  ]);

  const now = new Date();

  // Filter display list to topic_post only — "Ad-Free Benefits" section is
  // conceptually for user-earned topic_post grants. Banner aggregates still
  // use allGrants (including admin_manual).
  const topicPostGrants = allGrants.filter((g) => g.grantType === 'topic_post');
  const displayGrants = topicPostGrants.slice(0, 5);
  const hasMoreTopicPostGrants = topicPostGrants.length > 5;

  // Subscription confers ad_free if status is in BENEFIT_ACTIVE_STATUSES
  // and the period has not yet ended.
  const subscriptionActive =
    !!subscription &&
    (BENEFIT_ACTIVE_STATUSES as readonly string[]).includes(subscription.status) &&
    new Date(subscription.currentPeriodEnd) > now;

  const subscriptionExpiresAt = subscriptionActive ? new Date(subscription.currentPeriodEnd) : null;

  // Find latest expiresAt among currently-active grants.
  const activeGrants = allGrants.filter(
    (g) => new Date(g.startsAt) <= now && new Date(g.expiresAt) > now
  );
  const latestGrantExpiresAt = activeGrants.reduce<Date | null>((acc, g) => {
    const exp = new Date(g.expiresAt);
    return !acc || exp > acc ? exp : acc;
  }, null);

  // Aggregate latest expiresAt across both sources.
  const candidates: Date[] = [];
  if (subscriptionExpiresAt) candidates.push(subscriptionExpiresAt);
  if (latestGrantExpiresAt) candidates.push(latestGrantExpiresAt);
  const latestExpiresAt = candidates.length ? candidates.reduce((a, b) => (a > b ? a : b)) : null;

  const adFreeActive = latestExpiresAt !== null;

  const dateFmt = (d: Date) => d.toLocaleDateString(locale);

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
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

          {/* Per-source breakdown */}
          <div className="space-y-4">
            {/* Subscription source */}
            {subscriptionActive && subscriptionExpiresAt && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground">{t('adFree.sourceSubscription')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('adFree.activeUntil', { date: dateFmt(subscriptionExpiresAt) })}
                </p>
              </div>
            )}

            {/* Grants source — filtered to topic_post, limited to latest 5 */}
            {displayGrants.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground">
                  {adFreeActive ? t('adFree.sourceGrants') : t('adFree.pastBenefits')}
                </h3>
                <ul className="mt-3 space-y-3">
                  {displayGrants.map((g) => {
                    const startsAt = new Date(g.startsAt);
                    const expiresAt = new Date(g.expiresAt);
                    const status = classifyGrant(now, startsAt, expiresAt);
                    const grantTypeKey: GrantType = isGrantType(g.grantType)
                      ? g.grantType
                      : 'admin_manual';
                    const statusLabel =
                      status === 'active'
                        ? t('adFree.grantStatusActive')
                        : status === 'upcoming'
                          ? t('adFree.grantStatusUpcoming')
                          : t('adFree.grantStatusExpired');
                    const statusClass =
                      status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                        : status === 'upcoming'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                          : 'bg-muted text-muted-foreground';
                    return (
                      <li
                        key={g.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {t(`grantTypeLabel.${grantTypeKey}`)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('adFree.grantPeriod', {
                              startDate: dateFmt(startsAt),
                              endDate: dateFmt(expiresAt),
                            })}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {hasMoreTopicPostGrants && (
                  <div className="mt-4">
                    <Link
                      href={`/mypage/benefits/topic_post`}
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
        </div>

        <Divider />

        <Breadcrumb
          locale={locale}
          items={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
        />
      </PagePanel>
    </div>
  );
}
