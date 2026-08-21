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

import type { MoveAnalysis, MoveJudgment } from '@/lib/games/analysis/types';

/**
 * One critical moment selected for the review — server-derived engine fact
 * (see the module TSDoc). Persisted in `game_ai_reviews.moments`.
 *
 * The same shape as {@link MoveAnalysis}, because a moment IS an analyzed
 * move: selection picks a subset of them, it does not reshape them. The two
 * were declared separately with a nine-field copy function between them, which
 * meant a field added to the analysis had to be added here and there to reach
 * storage. The alias keeps the name — this is the persisted vocabulary, and
 * `games.ts` types the `moments` jsonb column with it — while making the
 * column follow the analysis automatically.
 *
 * That last part is the reason to be careful: widening `MoveAnalysis` now
 * widens what is written to `game_ai_reviews.moments`. Rows already stored
 * lack any new field, so anything added must be optional, or read back
 * defensively, exactly as before.
 */
export type ReviewMoment = MoveAnalysis;

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
  /**
   * The TL;DR: 3-4 one-sentence takeaways (result, what decided it, the one
   * thing to work on). A list rather than a paragraph because a paragraph
   * got read as the review's intro and ran to 400-500 characters that nobody
   * finished; the details it was summarising already follow in the sections
   * below. Rows written before 2026-08-22 stored the paragraph — see
   * `normalizeStoredContent`.
   */
  summary: string[];
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
 * Whether a given viewer may generate this game's review, and if not, why —
 * the one value both the page (which renders either the generate button or the
 * upsell) and the Server Action (which refuses) branch on.
 *
 * The union deliberately separates two different kinds of "no":
 *
 * - `blocked` is about the (game, viewer) pair and never changes by paying —
 *   a third party cannot buy the right to publish an assessment of someone
 *   else's game, and a 3-ply game has nothing to coach. Resolved by the pure
 *   `canGenerateAiReview`.
 * - `subscription_required` is about entitlement only. The viewer is the right
 *   person asking about the right game; they just have nothing that pays for
 *   the LLM call yet. This is the state the paywall CTA renders for.
 *
 * @design Room for the coin charge
 * Paid-per-use access arrives as one more member, `{ kind: 'payable'; cost;
 * balance }`, produced when the viewer has no subscription but enough coins.
 * The UI gains a "spend N coins" branch beside the CTA; the Server Action
 * gains a debit. Nothing else in the union has to move, because generation
 * eligibility and entitlement are already separate members rather than one
 * boolean. See `resolveAiReviewGenerationState` for where the balance lookup
 * would go and `generateReview`'s save step for where the debit belongs.
 */
export type AiReviewGenerationState =
  | { kind: 'allowed' }
  | { kind: 'subscription_required' }
  | { kind: 'blocked'; reason: 'not_owner' | 'game_not_eligible' };

/**
 * The generation states worth rendering something for. A blocked viewer is
 * offered nothing at all — not even an explanation — so the UI takes this
 * narrowed type and `null` for "no offer", rather than a fourth branch it
 * would have to remember never to render. Derived by subtraction so that the
 * planned `payable` state reaches the UI without touching this line.
 */
export type AiReviewGenerationOffer = Exclude<AiReviewGenerationState, { kind: 'blocked' }>;

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
  | 'subscription_required'
  | 'rate_limited'
  | 'llm_error'
  | 'unexpected_error';

export type GenerateAiReviewResponse =
  { success: true; review: AiReview } | { success: false; error: AiReviewError };
