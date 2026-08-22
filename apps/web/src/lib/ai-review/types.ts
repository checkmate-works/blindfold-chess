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

import type { PrincipleId } from './principles';

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
  /**
   * How the principle applied in THIS position — not the principle itself,
   * which `principle` names (see `./principles`).
   */
  lesson: string;
  /** The general rule the moment illustrates, or `other`. */
  principle: PrincipleId;
};

/** The validated LLM output — prose only, no numbers, no moves. */
export type AiReviewContent = {
  /**
   * The TL;DR: 3-4 one-sentence takeaways (result, what decided it, the one
   * thing to work on). A list rather than a paragraph because a paragraph
   * got read as the review's intro and ran to 400-500 characters that nobody
   * finished; the details it was summarising already follow in the sections
   * below.
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
 * Whether a given viewer may generate this game's review, and on what terms —
 * the one value both the page (which renders the generate button, the coin
 * price, or the "earn coins" notice) and the Server Action (which refuses or
 * charges) branch on.
 *
 * The union deliberately separates three different answers:
 *
 * - `blocked` is about the (game, viewer) pair and never changes by paying —
 *   a third party cannot buy the right to publish an assessment of someone
 *   else's game, and a 3-ply game has nothing to coach. Resolved by the pure
 *   `canGenerateAiReview`.
 * - `allowed` / `payable` are the two ways the right person can pay for the
 *   LLM call: a subscription (no charge) or `cost` coins from `balance`.
 * - `insufficient_balance` is the right person with nothing that pays. The
 *   coin figures ride along so the notice can say how far off they are.
 */
export type AiReviewGenerationState =
  | { kind: 'allowed' }
  | { kind: 'payable'; cost: number; balance: number }
  | { kind: 'insufficient_balance'; cost: number; balance: number }
  | { kind: 'blocked'; reason: 'not_owner' | 'game_not_eligible' };

/**
 * The generation states worth rendering something for. A blocked viewer is
 * offered nothing at all — not even an explanation — so the UI takes this
 * narrowed type and `null` for "no offer", rather than a fourth branch it
 * would have to remember never to render.
 */
export type AiReviewGenerationOffer = Exclude<AiReviewGenerationState, { kind: 'blocked' }>;

/**
 * Lifecycle of a `game_ai_review_jobs` row. `pending` is accepted and
 * charged but not yet picked up; `processing` is claimed by a worker;
 * `done` / `failed` are terminal (a failed job has been refunded).
 */
export const AI_REVIEW_JOB_STATUSES = ['pending', 'processing', 'done', 'failed'] as const;
export type AiReviewJobStatus = (typeof AI_REVIEW_JOB_STATUSES)[number];

/** The job the author is waiting on, as the page and the action describe it. */
export type PendingAiReviewJob = {
  id: string;
  /** The language the review will be written in. */
  locale: string;
};

/**
 * Error codes the generation flow can surface to the UI (mapped to i18n
 * messages under `sharedGames.aiReview.errors`). A closed union so that a
 * new failure mode cannot ship without a message in every locale.
 */
export type AiReviewError =
  | 'not_authenticated'
  | 'invalid_input'
  | 'not_found'
  | 'not_owner'
  | 'game_not_eligible'
  | 'insufficient_balance'
  | 'rate_limited'
  | 'llm_error'
  | 'unexpected_error';

/**
 * What `requestAiReviewAction` answers. `ready` is the cache hit — the review
 * already exists and is returned in full; `queued` is the accepted request
 * (charged, if the viewer pays in coins) whose result arrives by notification
 * and by polling `getAiReviewJobStatusAction`.
 */
export type RequestAiReviewResponse =
  | { success: true; status: 'ready'; review: AiReview }
  | { success: true; status: 'queued'; job: PendingAiReviewJob }
  | { success: false; error: AiReviewError };

/**
 * One poll of a job the viewer requested. `pending` covers both the queued
 * and the in-worker states — the client has no use for the difference.
 * `not_found` is also what a job belonging to someone else returns.
 */
export type AiReviewJobStatusResponse =
  | { status: 'pending' }
  | { status: 'done'; review: AiReview }
  | { status: 'failed'; error: AiReviewError }
  | { status: 'not_found' };
