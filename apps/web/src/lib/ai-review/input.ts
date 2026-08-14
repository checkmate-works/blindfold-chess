import type { Side } from '@blindfold-chess/types';

import type { MoveAnalysis, MoveJudgment } from '@/lib/games/analysis/types';
import { MOVE_JUDGMENTS } from '@/lib/games/analysis/types';

import type { AnalysisSummaryStats, ReviewMoment } from './types';

/**
 * How many critical moments the review covers at most. Bounds both the LLM
 * input size (each moment is a JSON line in the prompt) and the reading
 * length of the finished review.
 */
export const MAX_REVIEW_MOMENTS = 12;

/** Everything the prompt builder needs, distilled from one analyzed game. */
export type ReviewInput = {
  moments: ReviewMoment[];
  summaryStats: AnalysisSummaryStats;
};

function toMoment(a: MoveAnalysis): ReviewMoment {
  return {
    ply: a.ply,
    san: a.san,
    moveNumber: a.moveNumber,
    color: a.color,
    evalBefore: a.evalBefore,
    evalAfter: a.evalAfter,
    cpLoss: a.cpLoss,
    bestMoveSan: a.bestMoveSan,
    judgment: a.judgment,
  };
}

/**
 * Select the critical moments and aggregate stats a review is written about.
 *
 * Selection is deliberately player-first — this is coaching, not commentary:
 * every player inaccuracy-or-worse is a candidate (worst first), and the
 * opponent contributes only outright blunders (the "missed chance" moments).
 * The pool is capped at {@link MAX_REVIEW_MOMENTS} by severity, then
 * re-sorted chronologically so the prose can follow the game. Pure and
 * deterministic — same analyses in, same moments out (which also keeps the
 * LLM input reproducible for a given game).
 */
export function buildReviewInput(analyses: MoveAnalysis[], playerColor: Side): ReviewInput {
  const playerMoves = analyses.filter((a) => a.color === playerColor);

  const byLossDesc = (a: MoveAnalysis, b: MoveAnalysis) => b.cpLoss - a.cpLoss || a.ply - b.ply;
  const playerCandidates = playerMoves
    .filter((a) => a.judgment !== 'best' && a.judgment !== 'good')
    .sort(byLossDesc);
  const opponentBlunders = analyses
    .filter((a) => a.color !== playerColor && a.judgment === 'blunder')
    .sort(byLossDesc);

  const moments = [...playerCandidates, ...opponentBlunders]
    .slice(0, MAX_REVIEW_MOMENTS)
    .sort((a, b) => a.ply - b.ply)
    .map(toMoment);

  const judgmentCountsPlayer = Object.fromEntries(MOVE_JUDGMENTS.map((j) => [j, 0])) as Record<
    MoveJudgment,
    number
  >;
  let totalLoss = 0;
  for (const a of playerMoves) {
    judgmentCountsPlayer[a.judgment] += 1;
    totalLoss += a.cpLoss;
  }

  return {
    moments,
    summaryStats: {
      totalPlies: analyses.length,
      playerColor,
      avgCpLossPlayer: playerMoves.length === 0 ? 0 : Math.round(totalLoss / playerMoves.length),
      judgmentCountsPlayer,
    },
  };
}
