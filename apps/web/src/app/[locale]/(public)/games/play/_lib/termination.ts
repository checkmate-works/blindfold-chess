import type { GameStatus } from '@blindfold-chess/features/ai-game';

/** How the game actually ended, as far as it can be told from the game record. */
export type Termination = 'checkmate' | 'resignation' | 'stalemate' | 'draw';

/**
 * Tell a real checkmate apart from a resignation.
 *
 * Resigning stores `gameStatus: 'checkmate'` + `playerResult: 'loss'` (see
 * `useGameActions.handleResign`) — the status enum has no `resigned` member and
 * neither does the persisted record, so "the player gave up" is nowhere in the
 * stored data. It is still *derivable*: replaying the move list gives the
 * position's own status, and a stored terminal status that the position does
 * not itself justify can only have come from a resignation.
 *
 * The position wins every disagreement, which also repairs a lossy reload: a
 * restored game only carries its win/loss/draw outcome, so `useGamePersistence`
 * rebuilds a stalemate as the generic `'draw'` — the replayed position still
 * knows it was a stalemate.
 *
 * @param gameStatus the session's stored/live status (a resignation shows as `'checkmate'`)
 * @param derivedStatus the status recomputed from the move list alone
 */
export function resolveTermination(
  gameStatus: GameStatus,
  derivedStatus: GameStatus
): Termination | null {
  if (gameStatus === 'in_progress') return null;
  if (derivedStatus === 'checkmate') return 'checkmate';
  if (derivedStatus === 'stalemate') return 'stalemate';
  if (derivedStatus === 'draw') return 'draw';
  // The position is still playable, so the terminal status came from the
  // player, not the board: a resignation (the only such ending we offer).
  return gameStatus === 'checkmate' ? 'resignation' : 'draw';
}
