import { executeMove } from '@blindfold-chess/features/chess-core';

import { getChessEngine } from '@/app/[locale]/(public)/play/_lib/chess-engine';

export type MoveLogEntry = {
  moveNumber: number;
  isWhiteMove: boolean;
  move: string;
  status: 'correct' | 'incorrect' | 'auto'; // correct: 正解, incorrect: 間違い, auto: 自動入力
  incorrectMove?: string; // 間違えた場合のユーザーの入力
  evaluation?: {
    score: number;
    mate?: number;
    text: string; // 最善です, 好手です, etc.
    loss: number; // Evaluation loss from this move (centipawns)
    bestMove?: string; // Best move in algebraic notation (if not the best)
    nextBestMove?: string; // Best move from evalAfter (for next evaluation)
  };
};

export type EvaluationFilters = {
  player: { own: boolean; opponent: boolean };
  evaluation: {
    best: boolean;
    good: boolean;
    inaccuracy: boolean;
    mistake: boolean;
    blunder: boolean;
  };
};

// Helper function to get evaluation text based on evaluation loss
// loss is the absolute difference from the previous position (always positive)
function getEvaluationText(t: (key: string) => string, loss: number): string {
  if (loss <= 20) return t('evalBest');
  if (loss <= 50) return t('evalGood');
  if (loss <= 100) return t('evalInaccuracy');
  if (loss <= 300) return t('evalMistake');
  return t('evalBlunder');
}

// Cache for position evaluations to avoid re-evaluating the same position
const evaluationCache = new Map<string, { score: number; mate?: number; bestMove?: string }>();

export function clearEvaluationCache(): void {
  evaluationCache.clear();
}

// Helper function to get evaluation from engine
export async function getPositionEvaluation(
  fenBefore: string, // FEN of the position before the move
  fenAfter: string, // FEN of the position after the move
  moveIndex: number,
  t: (key: string) => string,
  previousEval?: { score: number; mate?: number; bestMove?: string } // Pass previous evaluation to avoid re-calculation
): Promise<
  | {
      score: number;
      mate?: number;
      text: string;
      loss: number; // Evaluation loss from this move
      bestMove?: string; // Best move in algebraic notation (if not the best)
      nextBestMove?: string; // Best move from evalAfter (for next evaluation)
    }
  | undefined
> {
  try {
    const engine = getChessEngine();

    // Get evaluation BEFORE the move (use cached value if available)
    let evalBefore: { score: number; mate?: number; bestMove?: string };

    if (previousEval) {
      // Use the previous evaluation (which is the position before this move)
      evalBefore = previousEval;
    } else {
      // First move - evaluate the starting position
      // Check cache
      if (evaluationCache.has(fenBefore)) {
        evalBefore = evaluationCache.get(fenBefore)!;
      } else {
        evalBefore = await engine.getEvaluation(fenBefore, 12);
        evaluationCache.set(fenBefore, evalBefore);
      }
    }

    // Get evaluation AFTER the move
    let evalAfter: { score: number; mate?: number; bestMove?: string };
    if (evaluationCache.has(fenAfter)) {
      evalAfter = evaluationCache.get(fenAfter)!;
    } else {
      evalAfter = await engine.getEvaluation(fenAfter, 12);
      evaluationCache.set(fenAfter, evalAfter);
    }

    // Calculate evaluation loss
    // For white's move: loss = evalBefore - evalAfter (positive means worse for white)
    // For black's move: loss = evalAfter - evalBefore (positive means worse for black)
    const isWhiteMove = fenBefore.split(' ')[1] === 'w';
    let loss: number;

    if (evalAfter.mate !== undefined) {
      // If there's a mate, consider it a best move (0 loss)
      loss = 0;
    } else if (evalBefore.mate !== undefined) {
      // If we had a mate and lost it, that's a big blunder
      loss = 1000;
    } else {
      // Normal case: calculate centipawn loss
      if (isWhiteMove) {
        // White wants higher scores, so loss = before - after
        loss = evalBefore.score - evalAfter.score;
      } else {
        // Black wants lower scores, so loss = after - before
        loss = evalAfter.score - evalBefore.score;
      }
      // Ensure loss is non-negative
      loss = Math.max(0, loss);
    }

    // Convert best move from UCI to algebraic notation if available and loss is significant
    let bestMoveAlgebraic: string | undefined;
    if (evalBefore.bestMove && loss > 20) {
      // Only show best move if loss > 20 centipawns (not a best move)
      try {
        // Check if bestMove is in UCI format (e.g., "e2e4") or already in algebraic notation
        const isUciFormat = /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(evalBefore.bestMove);

        if (isUciFormat) {
          bestMoveAlgebraic = engine.convertUciToAlgebraic(
            evalBefore.bestMove as `${string}${number}${string}${number}`,
            fenBefore
          );
        } else {
          // Already in algebraic notation, verify it's valid
          const testResult = executeMove(fenBefore, evalBefore.bestMove);
          if (testResult) {
            bestMoveAlgebraic = testResult.moveResult.san;
          }
        }
      } catch (error) {
        console.warn('Failed to convert best move to algebraic:', error);
      }
    }

    return {
      score: evalAfter.score,
      mate: evalAfter.mate,
      text: getEvaluationText(t, loss),
      loss,
      bestMove: bestMoveAlgebraic,
      // Store the engine's bestMove from evalAfter for the next evaluation
      nextBestMove: evalAfter.bestMove,
    };
  } catch (error) {
    // Silently handle evaluation errors (e.g., timeout in background tabs)
    // This is expected behavior and doesn't affect the core postmortem functionality
    if (error instanceof Error && error.message !== 'Evaluation timeout') {
      console.warn('Evaluation skipped:', error.message);
    }
  }
  return undefined;
}
