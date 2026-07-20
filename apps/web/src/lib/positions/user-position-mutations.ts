import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';
import 'server-only';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, feedItems, positionContentRevisions, positions } from '@/lib/db';
import type { GrantedRank } from '@/lib/db/data/ranks';
import { diffFields } from '@/lib/db/diff-fields';
import { evaluateRanksAndRefreshEntitlements } from '@/lib/db/rank-grant-flow';
import type { DbTx } from '@/lib/db/types';
import {
  notifyFollowersOfNewPosition,
  notifyPositionForkedIntoPuzzle,
} from '@/lib/notifications/notification';
import { guardOwnership } from '@/lib/ownership-guard';
import { clawbackPointsForPost, grantPointsForPost } from '@/lib/points';
import {
  POSITION_FORK_SOURCE_TYPES,
  PUZZLE_FORK_SOURCE_TYPES,
  validateForkSource,
} from '@/lib/positions/fork';
import { validateAndDedupeTagIds } from '@/lib/positions/tag-validation';
import { insertPositionTags, replacePositionTags } from '@/lib/positions/tag-writes';
import type { PositionType } from '@/lib/positions/types';
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
   * `positions.type` values a `forkedFromId` source may have — mirrors
   * `PUZZLE_FORK_SOURCE_TYPES` / `POSITION_FORK_SOURCE_TYPES` in
   * `@/lib/positions/fork` (puzzles additionally accept a position-memory
   * source; see that module's `@design Cross-type sourcing` note).
   */
  allowedForkSourceTypes: readonly PositionType[];
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
    allowedForkSourceTypes: POSITION_FORK_SOURCE_TYPES,
    activityActions: {
      update: 'update_position',
    },
  },
  puzzle: {
    type: 'puzzle',
    pointType: 'puzzle',
    urlSegment: 'puzzle',
    allowedForkSourceTypes: PUZZLE_FORK_SOURCE_TYPES,
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
 * Columns fetched for every owner-scoped position mutation — a single
 * superset shape rather than per-mutation column lists. `fen` / `title` /
 * `description` are the pre-update values the update path diffs into the
 * activity log (positions keep no revision history); the rest feed the
 * shared not-found / kind / ownership / soft-delete checks.
 */
const ownedPositionColumns = {
  id: positions.id,
  userId: positions.userId,
  type: positions.type,
  deletedAt: positions.deletedAt,
  fen: positions.fen,
  title: positions.title,
  description: positions.description,
};

function selectPositionById(id: string) {
  return db.select(ownedPositionColumns).from(positions).where(eq(positions.id, id)).limit(1);
}

type OwnedPosition = Awaited<ReturnType<typeof selectPositionById>>[number];

/**
 * Shared preamble of the update / delete position mutations: load the row
 * by id, reject with `notFound` when it doesn't exist or is of a different
 * kind (an id of the wrong kind must look nonexistent, not forbidden), then
 * apply the ownership / soft-delete guard. Mirrors `loadOwnedChunk` in
 * `lib/chunks/chunk-mutation-guards.ts`.
 */
async function loadOwnedPosition(
  id: string,
  userId: string,
  type: PositionKind
): Promise<{ position: OwnedPosition } | { error: string }> {
  const [position] = await selectPositionById(id);

  if (!position || position.type !== type) {
    return { error: 'notFound' };
  }
  const ownershipError = guardOwnership(position, userId);
  if (ownershipError) {
    return { error: ownershipError };
  }
  return { position };
}

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
  // Captured so the post-commit notification (puzzles only, see below) knows
  // who to notify and how to word the message — without a second DB read.
  let forkSource: { ownerId: string | null; type: PositionType } | null = null;
  if (data.forkedFromId) {
    const forkCheck = await validateForkSource({
      forkedFromId: data.forkedFromId,
      currentUserId: user.id,
      sourceTypes: config.allowedForkSourceTypes,
    });
    if (!forkCheck.ok) {
      return { error: `fork_source_${forkCheck.reason}` };
    }
    resolvedForkedFromId = forkCheck.source.id;
    forkSource = { ownerId: forkCheck.source.userId, type: forkCheck.source.type };
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

  // Notify the fork source's owner — puzzles only (a same-type puzzle fork
  // or the cross-type "Create Puzzle" action from a position-memory entry).
  // Self-forks are excluded, mirroring the self-like guard in
  // performEntityToggleLike; an anonymised owner (userId null) is a no-op
  // inside createNotification itself.
  if (config.type === 'puzzle' && forkSource?.ownerId && forkSource.ownerId !== user.id) {
    notifyPositionForkedIntoPuzzle({
      actorId: user.id,
      ownerId: forkSource.ownerId,
      newPuzzleId: txResult.position.id,
      sourceType: forkSource.type === 'memory' ? 'memory' : 'puzzle',
    });
  }

  // No activity-log row: the positions row itself is the durable record of
  // a creation, so logging here would only duplicate it.

  // Evaluate belt ranks AFTER the transaction commits, so that the freshly
  // inserted `positions` row counts toward `position_submission_count`
  // requirements (e.g. 2kyu). Best-effort by design — see
  // evaluateRanksAfterCreate.
  const grantedRanks: GrantedRank[] = await evaluateRanksAndRefreshEntitlements(
    user.id,
    'position create'
  );

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

/** Old → new pairs for any field an update's `applyExtraWrites` diffed on its own (e.g. puzzle solution moves). */
export type ExtraRevisionChanges = Record<string, { from: unknown; to: unknown }>;

/**
 * Update a `positions` row of the given kind in place: validate, assert
 * existence + ownership + not soft-deleted, then in one transaction write
 * the new fields, run `applyExtraWrites` (puzzles replace their
 * `puzzle_solutions` row and diff the old vs. new solution moves), replace
 * the theme / chunk tags, and — when anything actually changed — insert a
 * `position_content_revisions` row. The revision insert lives in the same
 * transaction as the rest so the user-facing edit history can never record
 * an edit that didn't actually commit, or vice versa.
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
  /**
   * Extra in-transaction writes keyed by the position id. May return the
   * old → new changes it diffed on its own (fields outside `fen` / `title` /
   * `description`, e.g. puzzle solution moves) so they're folded into the
   * same revision row as the rest of the edit.
   */
  applyExtraWrites?: (tx: DbTx, positionId: string) => Promise<ExtraRevisionChanges | void>;
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

  const loaded = await loadOwnedPosition(data.id, user.id, config.type);
  if ('error' in loaded) {
    return loaded;
  }
  const { position } = loaded;

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

  // Preserve the overwritten values for the activity log and the revision
  // row (a position row has no revision history of its own). Nothing
  // changed → nothing worth recording.
  const scalarChanges = diffFields(position, nextValues, ['fen', 'title', 'description']);

  await db.transaction(async (tx) => {
    await tx
      .update(positions)
      .set(nextValues)
      .where(
        and(eq(positions.id, data.id), eq(positions.userId, user.id), isNull(positions.deletedAt))
      );

    const extraChanges = (await params.applyExtraWrites?.(tx, data.id)) ?? {};

    await replacePositionTags(tx, data.id, user.id, dedupedThemeIds, dedupedChunkIds);

    const changes: ExtraRevisionChanges = { ...scalarChanges, ...extraChanges };
    if (Object.keys(changes).length > 0) {
      await tx.insert(positionContentRevisions).values({
        positionId: data.id,
        editorId: user.id,
        changes,
      });
    }
  });

  if (Object.keys(scalarChanges).length > 0) {
    logActivityEvent({
      userId: user.id,
      action: config.activityActions.update,
      targetType: 'position',
      targetId: data.id,
      metadata: { type: config.type, changes: scalarChanges },
    });
  }

  revalidatePath(`/practice/${config.urlSegment}`);
  revalidatePath(`/practice/${config.urlSegment}/${data.id}`);
  revalidatePath(`/practice/${config.urlSegment}/${data.id}/history`);

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

  const loaded = await loadOwnedPosition(positionId, user.id, config.type);
  if ('error' in loaded) {
    return loaded;
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
