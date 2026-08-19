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
 * Not built from the production `defaultPreferences`: that object is what
 * `GamePreferencesContext.test` verifies, and sharing it would make the test
 * tautological. Several values are deliberately not the defaults (a
 * `'monotone'` board, button input, `'peek'` visibility) because that is the
 * configuration these tests exercise; the three restored fields happen to
 * carry the same values the defaults do, which is what a real user of this
 * screen would have.
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
