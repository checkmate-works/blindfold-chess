/**
 * AI game review — domain types (plain module, importable from client
 * components, the DB schema, and `"use server"` files alike; keep it free of
 * `server-only` and runtime dependencies).
 *
 * ## Who writes what — the engine/LLM separation, in the type system
 *
 * The feature's core constraint is that the LLM must never act as a chess
 * engine. That is enforced structurally, not by prompt alone:
 *
 * - {@link ReviewMoment} carries every number and move (evals, cp loss,
 *   best move, judgment). It is derived SERVER-SIDE from the Stockfish sweep
 *   (`deriveMoveAnalyses`) and stored as fact. The LLM never produces one.
 * - {@link AiReviewContent} is what the LLM produces: prose only. Its moment
 *   comments reference a {@link ReviewMoment} by `ply`; they cannot restate
 *   or override its numbers because the output schema has no such fields.
 *
 * The UI joins the two by `ply` at render time.
 */
import type { Side } from '@blindfold-chess/types';

import type { MoveJudgment } from '@/lib/games/analysis/types';

/**
 * One critical moment selected for the review — server-derived engine fact
 * (see the module TSDoc). Persisted in `game_ai_reviews.moments`.
 */
export type ReviewMoment = {
  /** 0-based index into `games.moves[]`. */
  ply: number;
  /** The move as played (SAN). */
  san: string;
  /** Fullmove number for display ("18. Nd5" / "18... Nd5"). */
  moveNumber: number;
  color: Side;
  /** Centipawns, white perspective, before/after the move. */
  evalBefore: number;
  evalAfter: number;
  cpLoss: number;
  bestMoveSan: string | null;
  judgment: MoveJudgment;
};

/** Aggregate stats over the PLAYER's moves, for display and LLM context. */
export type AnalysisSummaryStats = {
  totalPlies: number;
  playerColor: Side;
  /** Mean centipawn loss across the player's moves (rounded). */
  avgCpLossPlayer: number;
  /** Player move counts per judgment. */
  judgmentCountsPlayer: Record<MoveJudgment, number>;
};

/** LLM prose anchored to one selected moment (joined to it by `ply`). */
export type AiReviewMomentComment = {
  ply: number;
  /** Why the moment mattered and what to look for in such positions. */
  explanation: string;
  /** The transferable takeaway. */
  lesson: string;
};

/** The validated LLM output — prose only, no numbers, no moves. */
export type AiReviewContent = {
  summary: string;
  momentComments: AiReviewMomentComment[];
  strengths: string[];
  weaknesses: string[];
  advice: string[];
};

/** The full review as served to the UI (RSC-serializable). */
export type AiReview = {
  /**
   * The language `content` is written in, chosen by the author at generation
   * time — NOT the viewer's locale. A viewer reading in another language gets
   * this one anyway (there is one review per game), labelled as such.
   */
  locale: string;
  content: AiReviewContent;
  moments: ReviewMoment[];
  summaryStats: AnalysisSummaryStats;
  /** LLM model id that produced `content` (shown as a disclaimer detail). */
  model: string;
  /** ISO 8601. */
  createdAt: string;
};

/**
 * Error codes the generation flow can surface to the UI (mapped to i18n
 * messages under `sharedGames.aiReview.errors`). Kept as a closed union so a
 * future coin charge only needs to add `'insufficient_balance'` here and in
 * the message files.
 */
export type AiReviewError =
  | 'not_authenticated'
  | 'invalid_input'
  | 'not_found'
  | 'not_owner'
  | 'game_not_eligible'
  | 'rate_limited'
  | 'llm_error'
  | 'unexpected_error';

export type GenerateAiReviewResponse =
  { success: true; review: AiReview } | { success: false; error: AiReviewError };
