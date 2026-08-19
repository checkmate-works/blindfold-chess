import { DEFAULT_AI_REPLY_DURATION } from '@/lib/games/ai-reply-duration';

import type { GamePreferences } from '../GamePreferencesContext';

/**
 * A complete {@link GamePreferences} for tests that stub
 * `useGamePreferences`.
 *
 * Typed on purpose: the five component tests that built this object did so
 * inside a `vi.mock` factory, where an object literal is checked against
 * nothing. All five were missing `showPieceDestinations`, `pawnHideMode` and
 * `aiReplyDuration`, and four still carried a `peekMode` that moved to
 * per-game settings and no longer exists on the type — so the component under
 * test was reading `undefined` for three real settings while the fixture
 * asserted a fourth that the app had stopped having.
 *
 * The values are the fixture's own, not the production defaults: the
 * production object is what `GamePreferencesContext.test` verifies, and
 * sharing it would make that test tautological.
 */
export function makeGamePreferences(overrides: Partial<GamePreferences> = {}): GamePreferences {
  return {
    showCoordinates: true,
    highlightLastMove: true,
    showPieceDestinations: true,
    boardTheme: 'monotone',
    showOwnPieces: true,
    showOpponentPieces: true,
    pieceShapeMode: 'normal',
    pieceColors: 'normal',
    pawnHideMode: 'none',
    moveInputMode: 'button',
    enabledMoveInputModes: ['button'],
    buttonInputPieceLabel: 'icon',
    enableAutoComplete: true,
    boardVisibility: 'peek',
    aiReplyDuration: DEFAULT_AI_REPLY_DURATION,
    ...overrides,
  };
}
