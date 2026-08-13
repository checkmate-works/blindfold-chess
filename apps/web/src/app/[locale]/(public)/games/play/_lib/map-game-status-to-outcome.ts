import type { GameStatus } from '@blindfold-chess/features/ai-game';
import type { FinalGameOutcome } from '@blindfold-chess/types';

import type { GameOutcome } from '@/lib/games/saved-game-types';

/**
 * Map internal game status + player result to the repository's GameOutcome.
 *
 * - While the game is still being played, always returns `'in_progress'`.
 * - Once the game is over, the player's result (`win` / `loss` / `draw`) determines
 *   the outcome. `null` is treated as a draw.
 */
export function mapGameStatusToOutcome(
  gameStatus: GameStatus,
  playerResult: FinalGameOutcome | null
): GameOutcome {
  if (gameStatus === 'in_progress') return 'in_progress';
  if (playerResult === 'win') return 'win';
  if (playerResult === 'loss') return 'loss';
  return 'draw';
}
