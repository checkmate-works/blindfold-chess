import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import type { GameLimitError } from '@/lib/errors';
import type { SkillLevel } from '@/lib/types';

type PendingGameData = {
  moves: AlgebraicNotation[];
  playerColor: Side;
  skillLevel: SkillLevel;
  status: string;
};

/**
 * Handle a GameLimitError by storing pending game data in sessionStorage
 * and dispatching the appropriate event.
 *
 * If the game has no moves (direct access to /play), dispatches a start error event.
 * Otherwise, stores the game data for rescue and dispatches a limit-reached event.
 */
export function handleGameLimitError(error: GameLimitError, gameData: PendingGameData): void {
  console.warn('Game limit reached, cannot save game:', error.message);

  // When there are no moves, the user hit the limit on game start (e.g. direct
  // access to /play). Dispatching start-error instead of writing to sessionStorage
  // is intentional: there is no game data worth rescuing, so we redirect to an
  // error page rather than the rescue flow. This branch originally existed only in
  // the initial-save path, but applying it uniformly is the correct behavior for
  // all callers — a zero-move GameLimitError should never store pending game data.
  if (gameData.moves.length === 0) {
    window.dispatchEvent(new Event('blindfold-chess:game-limit-start-error'));
  } else {
    sessionStorage.setItem(
      'blindfold_chess_pending_game',
      JSON.stringify({
        moves: gameData.moves,
        playerColor: gameData.playerColor,
        skillLevel: gameData.skillLevel,
        status: gameData.status,
      })
    );
    sessionStorage.setItem('blindfold_chess_game_limit_reached', 'true');
    window.dispatchEvent(new Event('blindfold-chess:game-limit-reached'));
  }
}
