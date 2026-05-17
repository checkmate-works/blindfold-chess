import * as Sentry from '@sentry/nextjs';
import { and, eq, gt, inArray, isNull, lte } from 'drizzle-orm';
import 'server-only';

import {
  db,
  likes,
  notifications,
  pointBatchWatermarks,
  positions,
  profiles,
  topicPosts,
} from '@/lib/db';

import {
  LIKE_COIN_AMOUNT,
  LIKE_GRANT_BATCH_TYPE,
  LIKE_GRANT_SOURCE,
  LIKE_GRANT_TARGET_TYPES,
} from './constants';
import type { ContentRow, GrantIntent, LikeRow, PositionRow } from './grant-like-coins-intents';
import { buildGrantIntents } from './grant-like-coins-intents';
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
  /** Upper bound of the scan window / candidate next watermark (ISO). */
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
 * The watermark is advanced to `scanStartedAt` **only when every recipient
 * transaction succeeded**. A partial failure leaves it untouched, so the
 * next run reprocesses the whole window — already-paid recipients simply
 * idempotent-skip (and, with zero newly-minted coins, send no notification,
 * so no double-notify).
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

  // (2) Scan the likes in `(watermark, scanStartedAt]`. Bounding the upper
  //     edge keeps the next watermark a clean cut — likes that land mid-run
  //     fall into the next run's window.
  const likeRowsRaw = await db
    .select({
      likerId: likes.userId,
      targetType: likes.targetType,
      targetId: likes.targetId,
    })
    .from(likes)
    .where(
      and(
        gt(likes.createdAt, watermark),
        lte(likes.createdAt, scanStartedAt),
        inArray(likes.targetType, LIKE_GRANT_TARGET_TYPES as readonly string[])
      )
    );

  const likeRows: LikeRow[] = likeRowsRaw;

  // (3) Resolve the liked content — owner + soft-delete state.
  const positionIds = [
    ...new Set(likeRows.filter((l) => l.targetType === 'position').map((l) => l.targetId)),
  ];
  const topicPostIds = [
    ...new Set(likeRows.filter((l) => l.targetType === 'topic_post').map((l) => l.targetId)),
  ];

  // Two independent tables — fetch concurrently.
  const [positionRows, topicPostRows] = await Promise.all([
    positionIds.length
      ? db
          .select({
            id: positions.id,
            ownerId: positions.userId,
            forkedFromId: positions.forkedFromId,
            deletedAt: positions.deletedAt,
          })
          .from(positions)
          .where(inArray(positions.id, positionIds))
      : [],
    topicPostIds.length
      ? db
          .select({
            id: topicPosts.id,
            ownerId: topicPosts.userId,
            deletedAt: topicPosts.deletedAt,
          })
          .from(topicPosts)
          .where(inArray(topicPosts.id, topicPostIds))
      : [],
  ]);

  const positionById = new Map<string, PositionRow>(
    positionRows.map((r) => [
      r.id,
      { ownerId: r.ownerId, forkedFromId: r.forkedFromId, deletedAt: r.deletedAt },
    ])
  );
  const topicPostById = new Map<string, ContentRow>(
    topicPostRows.map((r) => [r.id, { ownerId: r.ownerId, deletedAt: r.deletedAt }])
  );

  // (4) Resolve fork parents — one level up from each live forked position.
  const forkParentIds = [
    ...new Set(
      positionRows
        .filter((r) => r.deletedAt === null && r.forkedFromId !== null)
        .map((r) => r.forkedFromId as string)
    ),
  ];
  const forkParentRows = forkParentIds.length
    ? await db
        .select({
          id: positions.id,
          ownerId: positions.userId,
          deletedAt: positions.deletedAt,
        })
        .from(positions)
        .where(inArray(positions.id, forkParentIds))
    : [];
  const forkParentById = new Map<string, ContentRow>(
    forkParentRows.map((r) => [r.id, { ownerId: r.ownerId, deletedAt: r.deletedAt }])
  );

  // (5) Derive payout intents (pure — see grant-like-coins-intents.ts).
  const intents = buildGrantIntents({ likeRows, positionById, topicPostById, forkParentById });

  // (6) Drop intents whose recipient has withdrawn (no profile / soft-deleted).
  const recipientIds = [...new Set(intents.map((i) => i.recipientId))];
  const activeRows = recipientIds.length
    ? await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(and(inArray(profiles.id, recipientIds), isNull(profiles.deletedAt)))
    : [];
  const activeRecipients = new Set(activeRows.map((r) => r.id));
  const liveIntents = intents.filter((i) => activeRecipients.has(i.recipientId));

  // (7) Group by recipient — one transaction (coins + notification) each.
  const byRecipient = new Map<string, GrantIntent[]>();
  for (const intent of liveIntents) {
    const list = byRecipient.get(intent.recipientId) ?? [];
    list.push(intent);
    byRecipient.set(intent.recipientId, list);
  }

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
      console.error(
        `[grantLikeCoins] recipient ${recipientId} failed:`,
        error instanceof Error ? error.message : error
      );
      Sentry.captureException(error);
    }
  }

  // (8) Advance the watermark only on a fully clean run.
  const watermarkAdvanced = recipientsFailed === 0;
  if (watermarkAdvanced) {
    await db
      .update(pointBatchWatermarks)
      .set({ watermark: scanStartedAt, completedAt: new Date() })
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
