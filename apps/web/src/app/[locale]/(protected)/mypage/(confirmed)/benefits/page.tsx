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
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/lib/auth';
import { getUserSubscription } from '@/lib/billing/subscription';
import { BENEFIT_ACTIVE_STATUSES } from '@/lib/billing/subscription-constants';
import { db, positions, topicPosts, userGrants } from '@/lib/db';
import { type GrantType, isGrantType } from '@/lib/db/data/grant-types';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

type RowStatus = 'active' | 'upcoming' | 'expired';

type EntitlementRow = {
  id: string;
  sourceLabel: string;
  /**
   * Locale-prefixed absolute path to the post / position that triggered this
   * grant, when resolvable. Null for the subscription row, admin_manual
   * grants, and grants whose source row could not be looked up (e.g., the
   * post was hard-deleted). When non-null, the source label is rendered as
   * a link so the user can confirm "which submission earned me this".
   */
  sourceHref: string | null;
  startsAt: Date;
  expiresAt: Date;
  status: RowStatus;
};

/**
 * Convert a `topic_posts.topic_type` into the URL segment the public route
 * uses. Mirrors `getTopicSegment` in the notification item for consistency.
 */
function topicTypeToSegment(topicType: string): string {
  if (topicType === 'opening') return 'openings';
  return `${topicType}s`;
}

/**
 * Build a public detail path for a topic_post (no locale prefix — the
 * next-intl `Link` adds it). position_memory / position_puzzle topics live
 * under `/practice/...` (same anchor scheme NotificationItem uses);
 * everything else routes to `/topics/...`.
 */
function buildTopicPostHref(topicType: string, topicKey: string, postId: string): string {
  if (topicType === 'position_memory') {
    return `/practice/position-memory/${topicKey}#post-${postId}`;
  }
  if (topicType === 'position_puzzle') {
    return `/practice/puzzle/${topicKey}#post-${postId}`;
  }
  return `/topics/${topicTypeToSegment(topicType)}/${topicKey}/posts/${postId}`;
}

function buildPositionHref(positionType: string, positionId: string): string | null {
  if (positionType === 'puzzle') return `/practice/puzzle/${positionId}`;
  if (positionType === 'memory') return `/practice/position-memory/${positionId}`;
  return null;
}

function classify(now: Date, startsAt: Date, expiresAt: Date): RowStatus {
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

  // Resolve each visible grant's source row (topic_post or position) so the
  // table can show "which submission earned me this" as a link. Batched into
  // two IN queries to avoid N+1, scoped to the 5 rows actually rendered.
  // Hard-deleted source rows fall back to a non-link label rather than 404ing.
  const recentGrants = allGrants.slice(0, 5);
  const topicPostIds = recentGrants
    .filter((g) => g.sourceType === 'topic_post' && g.sourceId)
    .map((g) => g.sourceId as string);
  const positionIds = recentGrants
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

  // Build a single unified entitlement list across both sources. Subscription
  // and each grant share the same row shape (sourceLabel / period / status),
  // which removes the visual asymmetry of the previous two-section layout.
  // Subscription is only included when active — matching the prior behavior
  // of the (now-removed) per-source subscription card. Grants are kept
  // capped at 5 like before; the "View full history" link still routes to
  // the grant-only audit page, so subscription is not counted toward the cap.
  const entitlementRows: EntitlementRow[] = [];
  if (subscriptionActive && subscription && subscriptionExpiresAt) {
    entitlementRows.push({
      id: 'subscription',
      sourceLabel: t('adFree.sourceSubscription'),
      sourceHref: null,
      startsAt: new Date(subscription.currentPeriodStart),
      expiresAt: subscriptionExpiresAt,
      status: 'active',
    });
  }
  for (const g of recentGrants) {
    const startsAt = new Date(g.startsAt);
    const expiresAt = new Date(g.expiresAt);
    const grantTypeKey: GrantType = isGrantType(g.grantType) ? g.grantType : 'admin_manual';

    // Pick the label and (optional) link in lockstep:
    //   - admin_manual / unknown grantType → fixed staff-grant label, no link
    //   - topic_post grant + sourceType='topic_post' → "topic post" label,
    //     link to the public post detail (squares/openings/chunks) or to
    //     the practice surface (position_memory / position_puzzle)
    //   - topic_post grant + sourceType='position' → distinct
    //     "position submission" label; link to the practice detail page
    //   - source row missing (hard-deleted) → keep the label, drop the link
    let sourceLabel = t(`grantTypeLabel.${grantTypeKey}`);
    let sourceHref: string | null = null;
    if (grantTypeKey === 'topic_post') {
      if (g.sourceType === 'topic_post' && g.sourceId) {
        const post = topicPostMap.get(g.sourceId);
        if (post) {
          sourceHref = buildTopicPostHref(post.topicType, post.topicKey, post.id);
        }
      } else if (g.sourceType === 'position' && g.sourceId) {
        sourceLabel = t('grantTypeLabel.position_creation');
        const pos = positionMap.get(g.sourceId);
        if (pos) {
          sourceHref = buildPositionHref(pos.type, pos.id);
        }
      }
    }

    entitlementRows.push({
      id: g.id,
      sourceLabel,
      sourceHref,
      startsAt,
      expiresAt,
      status: classify(now, startsAt, expiresAt),
    });
  }
  entitlementRows.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const hasMoreGrants = allGrants.length > 5;

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
                            {row.sourceLabel}
                          </Link>
                        ) : (
                          row.sourceLabel
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
