import { cache } from 'react';

import { and, asc, eq } from 'drizzle-orm';
import 'server-only';

import { db, gameAiReviews } from '@/lib/db';
import type { GameAiReviewRecord, NewGameAiReviewRecord } from '@/lib/db/schema';

import type { AiReview } from './types';

function toAiReview(row: GameAiReviewRecord): AiReview {
  return {
    locale: row.locale,
    content: row.content,
    moments: row.moments,
    summaryStats: row.summaryStats,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
  };
}

async function fetchAiReview(gameId: string, locale: string): Promise<AiReview | null> {
  const [row] = await db
    .select()
    .from(gameAiReviews)
    .where(and(eq(gameAiReviews.gameId, gameId), eq(gameAiReviews.locale, locale)))
    .limit(1);
  return row ? toAiReview(row) : null;
}

/**
 * The cached review for (game, locale), or null. RSC-serializable.
 *
 * `React.cache`-wrapped so the generation action's pre-check and
 * `generateReview`'s own `store.find` share one query per request.
 * `dbAiReviewStore.save`'s conflict path deliberately bypasses the memo
 * (via {@link fetchAiReview}): after losing an insert race it must see the
 * winner's row, not the `null` this request memoized before generating.
 */
export const getAiReview = cache(fetchAiReview);

/**
 * The review to SHOW a viewer reading this game in `preferredLocale`: that
 * locale's review when it exists, otherwise the game's oldest review in any
 * language (labelled by the UI).
 *
 * The fallback is what makes one review serve every visitor. Generation is
 * the author's alone, so without it a game reviewed in Japanese would offer
 * nothing at all to its `/en` and `/es` readers — nobody among them is
 * allowed to fill those slots. The per-locale rows stay in the schema for a
 * future "also generate in my language" affordance; today the first
 * generation is the game's review.
 */
export const getAiReviewForViewer = cache(
  async (gameId: string, preferredLocale: string): Promise<AiReview | null> => {
    const rows = await db
      .select()
      .from(gameAiReviews)
      .where(eq(gameAiReviews.gameId, gameId))
      // Oldest first, so the fallback is stable as later languages appear.
      .orderBy(asc(gameAiReviews.createdAt));
    if (rows.length === 0) return null;
    const exact = rows.find((row) => row.locale === preferredLocale);
    return toAiReview(exact ?? rows[0]);
  }
);

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
    const existing = await fetchAiReview(row.gameId, row.locale);
    if (!existing) {
      // Conflict yet no row: only reachable if the winner was deleted between
      // the two statements — surface as an error rather than fabricate.
      throw new Error('ai review insert conflicted but no existing row found');
    }
    return existing;
  },
};
