import * as Sentry from '@sentry/nextjs';
import { and, asc, inArray, lt } from 'drizzle-orm';
import 'server-only';

import { BENEFIT_ACTIVE_STATUSES } from '@/lib/billing/subscription-constants';
import { db, subscriptions } from '@/lib/db';

/**
 * How far past `current_period_end` a benefit-active row may sit before it is
 * treated as evidence of a lost webhook rather than ordinary delivery lag.
 *
 * Three days. At renewal the new period arrives in the same
 * `customer.subscription.updated` event that would have moved the status, so a
 * period end a few seconds or minutes in the past is the normal state of a
 * subscription mid-renewal. Stripe also re-sends a delivery that failed,
 * backing off over a window measured in days, so a shorter grace would report
 * rows that were about to heal on their own — and a warning that resolves
 * itself is the kind operators learn to ignore. Three days is past the point
 * where a monthly renewal can still be explained by retries, while being far
 * short of the next period, so a genuinely stuck row is reported once per day
 * from then on rather than only at the next billing cycle.
 */
export const STALE_PERIOD_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * The most rows a single report carries. Anything past this is a systemic
 * failure — the webhook endpoint down, not one delivery lost — and the exact
 * tail adds nothing an operator would act on differently.
 */
const SAMPLE_LIMIT = 50;

export type StaleSubscriptionPeriodReport = {
  /** Rows found, capped at the sample limit. */
  staleCount: number;
  /** True when more rows matched than the report carries. */
  truncated: boolean;
  /** The `current_period_end` boundary this run used, as an ISO string. */
  cutoff: string;
  checkedAt: string;
};

/**
 * Report subscriptions whose mirrored period ended long ago while their status
 * still grants benefits.
 *
 * @description
 * Benefit entitlement is decided by status alone — `isSubscriptionActive` and
 * its SQL twin `hasActiveSubscription` both test membership of
 * `BENEFIT_ACTIVE_STATUSES` and neither looks at `current_period_end`. That is
 * deliberate (requiring the period to still cover now would turn webhook
 * delivery lag into a benefit outage for a paying subscriber, and the answer
 * is served from a tag-invalidated cache that cannot honestly carry a
 * time-dependent term). The risk it accepts is the mirror image: if the event
 * that should have moved the status never arrives, the row keeps granting
 * benefits indefinitely and nothing notices.
 *
 * This job measures that risk instead of pre-empting it. A row that is
 * benefit-active with a period end more than {@link STALE_PERIOD_GRACE_MS} in
 * the past cannot be explained by ordinary delivery lag, so it is reported to
 * Sentry and left alone. Nobody's benefits are revoked here: over-granting to
 * a handful of users is a far milder failure than cutting off subscribers
 * whose renewal webhook is merely slow, and an operator who sees the report
 * can reconcile the row against Stripe directly.
 *
 * A quiet report is itself the finding worth having — it says the status
 * stream is keeping up, which is the assumption the status-only entitlement
 * rule rests on.
 *
 * @design Reported as a warning, not an error
 *
 * Nothing is broken in this process: the query ran and answered. The finding
 * is about data that drifted somewhere else, and it needs a human to compare
 * against Stripe rather than a stack trace. `captureError` is for a throw this
 * code did not expect — `runCronJob` already funnels those.
 *
 * @design Why the scan is not indexed
 *
 * `subscriptions` carries one row per subscriber and the existing indexes are
 * all keyed on `user_id` or the Stripe id, so this filter is a sequential
 * scan. That is the right shape for a table this size read once a day by a
 * single background job; an index on `(status, current_period_end)` would cost
 * a migration and a write-path penalty on every webhook to save a scan nobody
 * is waiting on.
 */
export async function reportStaleSubscriptionPeriods(
  now: Date = new Date()
): Promise<StaleSubscriptionPeriodReport> {
  const cutoff = new Date(now.getTime() - STALE_PERIOD_GRACE_MS);

  // One row over the limit, so the report can say it was truncated without a
  // second COUNT(*) over the same predicate.
  const rows = await db
    .select({
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(
      and(
        inArray(subscriptions.status, [...BENEFIT_ACTIVE_STATUSES]),
        lt(subscriptions.currentPeriodEnd, cutoff)
      )
    )
    .orderBy(asc(subscriptions.currentPeriodEnd))
    .limit(SAMPLE_LIMIT + 1);

  const truncated = rows.length > SAMPLE_LIMIT;
  const sample = truncated ? rows.slice(0, SAMPLE_LIMIT) : rows;

  if (sample.length > 0) {
    // The Stripe subscription id is the operator's lookup key for
    // reconciling the row in the Stripe dashboard, and carries nothing about
    // the person behind it. That is the whole payload on purpose: an
    // entitlement audit has no reason to put user identifiers in a report
    // that fans out to an external service.
    console.warn(
      `[stale-subscription-periods] ${sample.length} benefit-active subscription(s) ended before ${cutoff.toISOString()}`
    );
    Sentry.captureMessage('subscription-period-stale', {
      level: 'warning',
      tags: { 'subscription_audit.truncated': String(truncated) },
      extra: {
        'subscription_audit.cutoff': cutoff.toISOString(),
        'subscription_audit.count': sample.length,
        'subscription_audit.rows': sample.map((row) => ({
          stripeSubscriptionId: row.stripeSubscriptionId,
          status: row.status,
          currentPeriodEnd: row.currentPeriodEnd.toISOString(),
        })),
      },
    });
  }

  return {
    staleCount: sample.length,
    truncated,
    cutoff: cutoff.toISOString(),
    checkedAt: now.toISOString(),
  };
}
