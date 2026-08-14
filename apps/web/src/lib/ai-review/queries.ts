import { and, eq } from 'drizzle-orm';
import 'server-only';

import { db, gameAiReviews } from '@/lib/db';
import type { GameAiReviewRecord, NewGameAiReviewRecord } from '@/lib/db/schema';

import type { AiReview } from './types';

function toAiReview(row: GameAiReviewRecord): AiReview {
  return {
    content: row.content,
    moments: row.moments,
    summaryStats: row.summaryStats,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
  };
}

/** The cached review for (game, locale), or null. RSC-serializable. */
export async function getAiReview(gameId: string, locale: string): Promise<AiReview | null> {
  const [row] = await db
    .select()
    .from(gameAiReviews)
    .where(and(eq(gameAiReviews.gameId, gameId), eq(gameAiReviews.locale, locale)))
    .limit(1);
  return row ? toAiReview(row) : null;
}

/**
 * Persistence port for `generateReview` — injected so its orchestration is
 * testable without a database. {@link dbAiReviewStore} is the production
 * implementation.
 */
export type AiReviewStore = {
  find(gameId: string, locale: string): Promise<AiReview | null>;
  /**
   * Insert the finished review; on a `(game_id, locale)` conflict (a
   * concurrent generation won the race) return the existing row instead.
   */
  save(row: NewGameAiReviewRecord): Promise<AiReview>;
};

export const dbAiReviewStore: AiReviewStore = {
  find: getAiReview,
  async save(row) {
    // NOTE(coin charge): when generation becomes coin-priced, wrap this in
    // `db.transaction` and debit inside it (idempotency key
    // `ai_review:<userId>:<gameId>:<locale>`, mirroring consumeMaiaGamePoint)
    // so the user pays exactly when — and only when — a review is stored.
    const [inserted] = await db.insert(gameAiReviews).values(row).onConflictDoNothing().returning();
    if (inserted) return toAiReview(inserted);
    const existing = await getAiReview(row.gameId, row.locale);
    if (!existing) {
      // Conflict yet no row: only reachable if the winner was deleted between
      // the two statements — surface as an error rather than fabricate.
      throw new Error('ai review insert conflicted but no existing row found');
    }
    return existing;
  },
};
