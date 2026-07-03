import { revalidatePath } from 'next/cache';

import * as Sentry from '@sentry/nextjs';
import { and, eq, isNull } from 'drizzle-orm';
import 'server-only';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, feedItems, positions } from '@/lib/db';
import type { GrantedRank } from '@/lib/db/data/ranks';
import { checkAndGrantRanks } from '@/lib/db/rank-evaluation';
import type { DbTx } from '@/lib/db/types';
import { notifyFollowersOfNewPosition } from '@/lib/notifications/notification';
import { clawbackPointsForPost, grantPointsForPost } from '@/lib/points';
import { validateForkSource } from '@/lib/positions/fork';
import { validateAndDedupeTagIds } from '@/lib/positions/tag-validation';
import { insertPositionTags, replacePositionTags } from '@/lib/positions/tag-writes';
import { logActivityEvent } from '@/lib/users/activity-log';

/**
 * Shared core for the user-facing `positions` CRUD Server Actions. The
 * position-memory and puzzle entry points are structurally identical —
 * same auth guard, ownership / soft-delete checks, transaction shape,
 * point grant / clawback, activity log and revalidation — differing only
 * in the `positions.type` discriminator and a few derived labels. These
 * base functions own that shared body; each route's `_actions/` file is a
 * thin async wrapper supplying its `kind`, rate limit, validation and any
 * extra writes (puzzles also persist a `puzzle_solutions` row).
 */

/** Rate-limit rule shape accepted by `authenticateAndGuard`. */
type RateLimitRule = Parameters<typeof authenticateAndGuard>[0];

export type PositionKind = 'memory' | 'puzzle';

type PositionKindConfig = {
  /** The `positions.type` discriminator value. */
  type: PositionKind;
  /** The point-event entity type for grant / clawback. */
  pointType: 'position_memory' | 'puzzle';
  /** URL segment under `/practice` used for revalidation. */
  urlSegment: 'position-memory' | 'puzzle';
  /**
   * activity-log action verb for the update path. Create and delete are not
   * logged (the positions row — live, or soft-deleted with `deletedAt` — is
   * itself the durable record); only an in-place edit, which overwrites
   * fields with no revision history, warrants an activity-log row.
   */
  activityActions: { update: string };
};

const POSITION_KINDS: Record<PositionKind, PositionKindConfig> = {
  memory: {
    type: 'memory',
    pointType: 'position_memory',
    urlSegment: 'position-memory',
    activityActions: {
      update: 'update_position',
    },
  },
  puzzle: {
    type: 'puzzle',
    pointType: 'puzzle',
    urlSegment: 'puzzle',
    activityActions: {
      update: 'update_puzzle',
    },
  },
};

export type CreatePositionEntryResult =
  | {
      success: true;
      id: string;
      /**
       * Present when the create awarded points. Callers route the user
       * through `/thanks?pointEventId=...&returnUrl=...` so the Thanks
       * page can show how many points were earned.
       */
      pointGrant?: { pointEventId: string; amount: number };
      /**
       * Belt ranks unlocked by this submission. Surfaced via sessionStorage
       * by the caller so {@link RankAchievementModal} can pick them up on
       * the next navigation. Mirrors the challenge-completion flow.
       */
      grantedRanks?: GrantedRank[];
    }
  | { error: string };

export type UpdatePositionEntryResult = ActionResult;

/**
 * Create a `positions` row of the given kind: validate, resolve an
 * optional fork source, validate tags, then in one transaction insert the
 * position, run `applyExtraWrites` (puzzles insert `puzzle_solutions`),
 * attach tags, emit a feed item and grant creation points.
 */
export async function createPositionEntry(params: {
  kind: PositionKind;
  rateLimit: RateLimitRule;
  data: {
    fen: string;
    title: string;
    description?: string | null;
    themeIds?: string[];
    chunkIds?: string[];
    forkedFromId?: string | null;
  };
  /** Returns an error key, or `null` when the input is valid. */
  validate: (userId: string) => string | null;
  /** Extra in-transaction writes keyed by the new position id. */
  applyExtraWrites?: (tx: DbTx, positionId: string) => Promise<void>;
}): Promise<CreatePositionEntryResult> {
  const config = POSITION_KINDS[params.kind];
  const { data } = params;

  const guardResult = await authenticateAndGuard(params.rateLimit);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const validationError = params.validate(user.id);
  if (validationError) {
    return { error: validationError };
  }

  let resolvedForkedFromId: string | null = null;
  if (data.forkedFromId) {
    const forkCheck = await validateForkSource({
      forkedFromId: data.forkedFromId,
      currentUserId: user.id,
      type: config.type,
    });
    if (!forkCheck.ok) {
      return { error: `fork_source_${forkCheck.reason}` };
    }
    resolvedForkedFromId = forkCheck.source.id;
  }

  const tagValidation = await validateAndDedupeTagIds({
    themeIds: data.themeIds,
    chunkIds: data.chunkIds,
  });
  if (!tagValidation.ok) {
    return { error: tagValidation.error };
  }
  const { themeIds: dedupedThemeIds, chunkIds: dedupedChunkIds } = tagValidation.deduped;

  const txResult = await db.transaction(async (tx) => {
    const [position] = await tx
      .insert(positions)
      .values({
        fen: data.fen.trim(),
        title: data.title.trim(),
        description: data.description?.trim() || null,
        userId: user.id,
        type: config.type,
        forkedFromId: resolvedForkedFromId,
      })
      .returning({ id: positions.id });

    await params.applyExtraWrites?.(tx, position.id);

    await insertPositionTags(tx, position.id, user.id, dedupedThemeIds, dedupedChunkIds);

    await tx.insert(feedItems).values({
      entityType: 'position',
      entityId: position.id,
      actorId: user.id,
      metadata: { type: config.type },
    });

    // Award points for the new entry — immediately spendable.
    const pointGrant = await grantPointsForPost(tx, user.id, {
      type: config.pointType,
      id: position.id,
    });

    return { position, pointGrant };
  });

  notifyFollowersOfNewPosition({
    actorId: user.id,
    positionId: txResult.position.id,
    positionType: config.type,
  });

  // No activity-log row: the positions row itself is the durable record of
  // a creation, so logging here would only duplicate it.

  // Evaluate belt ranks AFTER the transaction commits, so that the freshly
  // inserted `positions` row counts toward `position_submission_count`
  // requirements (e.g. 2kyu). Wrapped in try-catch — rank evaluation is
  // supplementary and must not fail the create.
  let grantedRanks: GrantedRank[] = [];
  try {
    grantedRanks = await checkAndGrantRanks(user.id);
  } catch (error) {
    console.error('Failed to check/grant ranks after position create:', error);
    Sentry.captureException(error);
  }

  revalidatePath(`/practice/${config.urlSegment}`);

  return {
    success: true,
    id: txResult.position.id,
    ...(txResult.pointGrant
      ? {
          pointGrant: {
            pointEventId: txResult.pointGrant.pointEventId,
            amount: txResult.pointGrant.amount,
          },
        }
      : {}),
    ...(grantedRanks.length > 0 ? { grantedRanks } : {}),
  };
}

/**
 * Update a `positions` row of the given kind in place: validate, assert
 * existence + ownership + not soft-deleted, then in one transaction write
 * the new fields, run `applyExtraWrites` (puzzles replace their
 * `puzzle_solutions` row) and replace the theme / chunk tags.
 */
export async function updatePositionEntry(params: {
  kind: PositionKind;
  rateLimit: RateLimitRule;
  data: {
    id: string;
    fen: string;
    title: string;
    description?: string | null;
    themeIds?: string[];
    chunkIds?: string[];
  };
  /** Returns an error key, or `null` when the input is valid. */
  validate: (userId: string) => string | null;
  /** Extra in-transaction writes keyed by the position id. */
  applyExtraWrites?: (tx: DbTx, positionId: string) => Promise<void>;
}): Promise<UpdatePositionEntryResult> {
  const config = POSITION_KINDS[params.kind];
  const { data } = params;

  const guardResult = await authenticateAndGuard(params.rateLimit);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const validationError = params.validate(user.id);
  if (validationError) {
    return { error: validationError };
  }

  const [position] = await db
    .select({
      id: positions.id,
      userId: positions.userId,
      type: positions.type,
      deletedAt: positions.deletedAt,
      // Pre-update values, captured so the activity log can preserve
      // whatever this in-place edit overwrites (positions keep no history).
      fen: positions.fen,
      title: positions.title,
      description: positions.description,
    })
    .from(positions)
    .where(eq(positions.id, data.id))
    .limit(1);

  if (!position || position.type !== config.type) {
    return { error: 'notFound' };
  }
  if (position.userId !== user.id) {
    return { error: 'unauthorized' };
  }
  if (position.deletedAt) {
    return { error: 'alreadyDeleted' };
  }

  const tagValidation = await validateAndDedupeTagIds({
    themeIds: data.themeIds,
    chunkIds: data.chunkIds,
  });
  if (!tagValidation.ok) {
    return { error: tagValidation.error };
  }
  const { themeIds: dedupedThemeIds, chunkIds: dedupedChunkIds } = tagValidation.deduped;

  const nextValues = {
    fen: data.fen.trim(),
    title: data.title.trim(),
    description: data.description?.trim() || null,
  };

  await db.transaction(async (tx) => {
    await tx
      .update(positions)
      .set(nextValues)
      .where(
        and(eq(positions.id, data.id), eq(positions.userId, user.id), isNull(positions.deletedAt))
      );

    await params.applyExtraWrites?.(tx, data.id);

    await replacePositionTags(tx, data.id, user.id, dedupedThemeIds, dedupedChunkIds);
  });

  // Diff the overwritten fields (old → new) so the activity log keeps the
  // prior values this in-place edit discarded. A position row has no
  // revision history. Nothing changed → nothing worth logging.
  const changes: Record<string, { from: string | null; to: string | null }> = {};
  for (const key of ['fen', 'title', 'description'] as const) {
    const from = position[key] ?? null;
    const to = nextValues[key] ?? null;
    if (from !== to) {
      changes[key] = { from, to };
    }
  }

  if (Object.keys(changes).length > 0) {
    logActivityEvent({
      userId: user.id,
      action: config.activityActions.update,
      targetType: 'position',
      targetId: data.id,
      metadata: { type: config.type, changes },
    });
  }

  revalidatePath(`/practice/${config.urlSegment}`);
  revalidatePath(`/practice/${config.urlSegment}/${data.id}`);

  return { success: true };
}

/**
 * Soft-delete a `positions` row of the given kind: assert existence (the
 * `type` guard rejects an id of the wrong kind) + ownership + not already
 * deleted, then in one transaction stamp `deletedAt` and reverse the
 * creation point grant.
 */
export async function deletePositionEntry(params: {
  positionId: string;
  locale: string;
  kind: PositionKind;
  rateLimit: RateLimitRule;
}): Promise<ActionResult> {
  const config = POSITION_KINDS[params.kind];
  const { positionId, locale } = params;

  const guardResult = await authenticateAndGuard(params.rateLimit);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const [position] = await db
    .select({
      id: positions.id,
      userId: positions.userId,
      type: positions.type,
      deletedAt: positions.deletedAt,
    })
    .from(positions)
    .where(eq(positions.id, positionId))
    .limit(1);

  if (!position || position.type !== config.type) {
    return { error: 'notFound' };
  }
  if (position.userId !== user.id) {
    return { error: 'unauthorized' };
  }
  if (position.deletedAt) {
    return { error: 'alreadyDeleted' };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(positions)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(positions.id, positionId),
          eq(positions.userId, user.id),
          isNull(positions.deletedAt)
        )
      );

    // Reverse the creation point grant for the removed entry. Capped at
    // the author's current `earned` balance (see `clawbackPointsForPost`),
    // so coins already spent are not pursued — the balance never goes
    // negative and self-deletion never lands a user in debt.
    await clawbackPointsForPost(tx, user.id, {
      type: config.pointType,
      id: positionId,
    });
  });

  // No activity-log row: deletion is a soft-delete, so the positions row
  // (with `deletedAt`) survives as the durable record.

  revalidatePath(`/${locale}/practice/${config.urlSegment}`);
  revalidatePath(`/${locale}/practice/${config.urlSegment}/${positionId}`);

  return { success: true };
}
