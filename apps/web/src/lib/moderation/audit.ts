import type { moderationActions } from '@/lib/db';
import { moderationActions as moderationActionsTable } from '@/lib/db';

type Tx = Parameters<Parameters<typeof import('@/lib/db').db.transaction>[0]>[0];

/**
 * Every operation an admin can perform that leaves an audit trail.
 *
 * A union, not a free string, so a typo produces a compile error instead of a
 * row that no dashboard filter will ever match — `moderation_actions` is
 * append-only, so a mistyped action is permanent. The DB column stays
 * `varchar` on purpose (see the table's TSDoc): adding a value here needs no
 * migration.
 */
export type ModerationActionType =
  | 'ban'
  | 'unban'
  | 'grant_rank'
  | 'delete_post'
  | 'delete_chunk'
  | 'delete_position'
  | 'feature_puzzle'
  | 'unfeature_puzzle'
  | 'create_grant'
  | 'revoke_grant'
  | 'create_point_grant';

/** What the action was performed on. Pairs with `targetId`. */
export type ModerationTargetType = 'user' | 'topic_post' | 'chunk' | 'position';

type LogInput = {
  /** The admin performing the action (`requireAdmin()`'s `userId`). */
  actorId: string;
  action: ModerationActionType;
  targetType: ModerationTargetType;
  targetId: string;
  /** Human-readable justification, where the surface collects one. */
  reason?: string | null;
  /** Action-specific context — the deleted content, the grant's terms. */
  metadata?: Record<string, unknown>;
  /**
   * Caller's IP, for forensic analysis of admin actions.
   *
   * Resolve it with `getClientIp()` BEFORE opening the transaction: it reads
   * request headers, and every existing caller does so, keeping the
   * transaction to database work.
   */
  ipAddress: string | null;
};

/**
 * Append one row to the moderation audit trail, inside the caller's
 * transaction so the record and the change it describes commit together.
 *
 * Ten admin actions wrote this insert out themselves. The field set is not
 * the interesting part — the constraints are: the action and target vocabularies
 * are closed (see {@link ModerationActionType}), the row is immutable once
 * written, and the IP has to be resolved outside the transaction. None of that
 * is visible at a bare `tx.insert(...)` call, which is how `reason: null` came
 * to be spelled explicitly at some sites and omitted at others.
 */
export async function logModerationAction(tx: Tx, input: LogInput): Promise<void> {
  await tx.insert(moderationActionsTable).values({
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    // Normalized rather than passed through: the column is nullable with no
    // default, and callers were split between spelling this null and omitting
    // it for the same meaning.
    reason: input.reason ?? null,
    // Omitted when absent so the column's `{}` default applies, which is what
    // the callers that never set it were relying on.
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    ipAddress: input.ipAddress,
  } satisfies typeof moderationActions.$inferInsert);
}
