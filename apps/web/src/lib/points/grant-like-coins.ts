import { eq } from 'drizzle-orm';
import 'server-only';

import { db, notifications, pointBatchWatermarks } from '@/lib/db';
import { captureError } from '@/lib/sentry/capture-error';

import {
  LIKE_COIN_AMOUNT,
  LIKE_GRANT_BATCH_TYPE,
  LIKE_GRANT_SCAN_SAFETY_MARGIN_MS,
  LIKE_GRANT_SOURCE,
} from './constants';
import { buildGrantIntents } from './grant-like-coins-intents';
import {
  filterLiveIntents,
  groupIntentsByRecipient,
  loadLikesForBatch,
  resolveGrantTargets,
} from './grant-like-coins-steps';
import { recordPointMovement } from './internal-ledger';

/**
 * `notifications.type` for the one-per-run "you earned coins from likes"
 * notification. Mirrored as a string literal in `NotificationItem.tsx`
 * (the notification UI keys off plain literals, not a shared enum).
 */
const LIKE_COIN_GRANT_NOTIFICATION_TYPE = 'like_coin_grant';

export type GrantLikeCoinsResult = {
  /** True on the very first run — the watermark was just seeded, nothing paid. */
  initialized: boolean;
  /** Watermark this run started from (ISO). */
  watermark: string;
  /** Wall-clock time this run started (ISO) — the scan's actual upper bound trails this by LIKE_GRANT_SCAN_SAFETY_MARGIN_MS. */
  scanStartedAt: string;
  likesScanned: number;
  directIntents: number;
  forkIntents: number;
  /** Distinct recipients after dropping intents to withdrawn users. */
  recipientsProcessed: number;
  /** `point_events` rows actually inserted (idempotent-skipped rows excluded). */
  coinsGranted: number;
  notificationsSent: number;
  recipientsFailed: number;
  watermarkAdvanced: boolean;
};

/**
 * Daily batch — converts UGC likes into coins for the liked content's owner
 * (and, for forked positions, the fork parent's owner). See issue #87 and
 * the `buildGrantIntents` TSDoc for the business rules.
 *
 * @design Watermark + idempotency key — two independent safety nets
 *
 * `point_batch_watermarks` (`batch_type='like_grant'`) bounds the `likes`
 * scan for efficiency only. *Correctness* rests entirely on the UNIQUE
 * `point_events.idempotency_key`: every payout key is derived from the
 * `(targetType, targetId, likerId)` pair, so a rerun re-emits identical
 * keys and the UNIQUE constraint absorbs the duplicates as no-ops.
 *
 * The watermark is advanced to `scanUpperBound` **only when every recipient
 * transaction succeeded**. A partial failure leaves it untouched, so the
 * next run reprocesses the whole window — already-paid recipients simply
 * idempotent-skip (and, with zero newly-minted coins, send no notification,
 * so no double-notify).
 *
 * `scanUpperBound` trails the actual `scanStartedAt` clock read by
 * `LIKE_GRANT_SCAN_SAFETY_MARGIN_MS` (see its TSDoc) — this is the one gap
 * the idempotency key cannot cover, because a like whose row is not yet
 * visible to this run's scan never gets a payout intent generated for it
 * at all, so there is no key for a later run to reconcile against. Once
 * the watermark passes such a like's `created_at`, it is skipped forever.
 * The margin keeps the advertised watermark behind the point in time where
 * every committed like is guaranteed visible.
 *
 * @design Coin grant + notification share one transaction per recipient
 *
 * Each recipient's coins and their single "earned N coins" notification
 * commit atomically. Splitting them would risk "coins paid, notification
 * lost forever" — a crash after the (idempotent) coin insert but before the
 * notification would, on rerun, see every coin idempotent-skipped, compute
 * `newlyGranted = 0`, and never send the notification. One transaction
 * makes that unrepresentable.
 */
export async function grantLikeCoins(): Promise<GrantLikeCoinsResult> {
  const scanStartedAt = new Date();

  // (1) Read — or, on the first ever run, seed — the watermark. Seeding at
  //     "now" is deliberate: historical likes are NOT retroactively paid.
  const [watermarkRow] = await db
    .select({ watermark: pointBatchWatermarks.watermark })
    .from(pointBatchWatermarks)
    .where(eq(pointBatchWatermarks.batchType, LIKE_GRANT_BATCH_TYPE))
    .limit(1);

  if (!watermarkRow) {
    await db.insert(pointBatchWatermarks).values({
      batchType: LIKE_GRANT_BATCH_TYPE,
      watermark: scanStartedAt,
      completedAt: scanStartedAt,
    });
    return {
      initialized: true,
      watermark: scanStartedAt.toISOString(),
      scanStartedAt: scanStartedAt.toISOString(),
      likesScanned: 0,
      directIntents: 0,
      forkIntents: 0,
      recipientsProcessed: 0,
      coinsGranted: 0,
      notificationsSent: 0,
      recipientsFailed: 0,
      watermarkAdvanced: false,
    };
  }

  const watermark = watermarkRow.watermark;

  // Trail the actual clock read so likes not yet visible to this run's scan
  // (in-flight commit, clock skew) get another run's margin-window to
  // appear before the watermark passes their `created_at` — see the
  // function's `@design` note and LIKE_GRANT_SCAN_SAFETY_MARGIN_MS's TSDoc.
  const scanUpperBound = new Date(scanStartedAt.getTime() - LIKE_GRANT_SCAN_SAFETY_MARGIN_MS);

  // (2) Scan likes in `(watermark, scanUpperBound]`.
  const likeRows = await loadLikesForBatch(watermark, scanUpperBound);

  // (3) + (4) Resolve liked content + fork parents.
  const { positionById, topicPostById, forkParentById } = await resolveGrantTargets(likeRows);

  // (5) Derive payout intents (pure — see grant-like-coins-intents.ts).
  const intents = buildGrantIntents({ likeRows, positionById, topicPostById, forkParentById });

  // (6) Drop intents whose recipient has withdrawn / been soft-deleted.
  const liveIntents = await filterLiveIntents(intents);

  // (7) Group by recipient — one transaction (coins + notification) each.
  const byRecipient = groupIntentsByRecipient(liveIntents);

  let coinsGranted = 0;
  let notificationsSent = 0;
  let recipientsFailed = 0;

  for (const [recipientId, recipientIntents] of byRecipient) {
    try {
      const newlyGranted = await db.transaction(async (tx) => {
        let granted = 0;
        for (const intent of recipientIntents) {
          const result = await recordPointMovement(
            tx,
            {
              userId: recipientId,
              delta: LIKE_COIN_AMOUNT,
              category: 'earned',
              source: LIKE_GRANT_SOURCE,
              sourceId: intent.targetId,
              idempotencyKey: intent.idempotencyKey,
              metadata: {
                via: intent.via,
                targetType: intent.targetType,
                targetId: intent.targetId,
                likerId: intent.likerId,
              },
            },
            { idempotent: true }
          );
          // `null` = idempotent skip (already paid on an earlier run).
          if (result !== null) granted += 1;
        }

        // One notification per run, counting only coins minted *this* run —
        // a pure rerun grants 0 and stays silent (no double-notify).
        if (granted > 0) {
          await tx.insert(notifications).values({
            userId: recipientId,
            actorId: null,
            type: LIKE_COIN_GRANT_NOTIFICATION_TYPE,
            targetType: null,
            targetId: null,
            groupKey: null,
            metadata: { count: granted },
          });
        }
        return granted;
      });

      coinsGranted += newlyGranted;
      if (newlyGranted > 0) notificationsSent += 1;
    } catch (error) {
      // Swallow per-recipient so other recipients still get paid; the
      // unadvanced watermark guarantees a retry next run. Report it —
      // the cron-route catch never sees a swallowed error.
      recipientsFailed += 1;
      captureError(error, `[grantLikeCoins] recipient ${recipientId} failed`);
    }
  }

  // (8) Advance the watermark only on a fully clean run, and only if the
  // margined upper bound is actually ahead of the current watermark — a
  // run invoked more often than the safety margin would otherwise push the
  // watermark backward (harmless but pointless: the next run rescans the
  // same already-idempotent range for nothing).
  const watermarkAdvanced =
    recipientsFailed === 0 && scanUpperBound.getTime() > watermark.getTime();
  if (watermarkAdvanced) {
    await db
      .update(pointBatchWatermarks)
      .set({ watermark: scanUpperBound, completedAt: new Date() })
      .where(eq(pointBatchWatermarks.batchType, LIKE_GRANT_BATCH_TYPE));
  }

  return {
    initialized: false,
    watermark: watermark.toISOString(),
    scanStartedAt: scanStartedAt.toISOString(),
    likesScanned: likeRows.length,
    directIntents: intents.filter((i) => i.via === 'direct').length,
    forkIntents: intents.filter((i) => i.via === 'fork').length,
    recipientsProcessed: byRecipient.size,
    coinsGranted,
    notificationsSent,
    recipientsFailed,
    watermarkAdvanced,
  };
}
