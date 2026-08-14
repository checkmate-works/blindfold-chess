import { EVALUATION_LOSS_THRESHOLDS } from '@/lib/games/evaluation-types';

import type { MoveJudgment } from './types';

/**
 * Grade a move by its centipawn loss, using the same thresholds as the board
 * badge (`getEvaluationIcon`) so the two surfaces never disagree.
 */
export function classifyMove(cpLoss: number): MoveJudgment {
  if (cpLoss <= EVALUATION_LOSS_THRESHOLDS.best) return 'best';
  if (cpLoss <= EVALUATION_LOSS_THRESHOLDS.good) return 'good';
  if (cpLoss <= EVALUATION_LOSS_THRESHOLDS.inaccuracy) return 'inaccuracy';
  if (cpLoss <= EVALUATION_LOSS_THRESHOLDS.mistake) return 'mistake';
  return 'blunder';
}
