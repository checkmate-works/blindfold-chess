/**
 * Tests that the pawn-hide chip is visually distinct from the whole-side
 * "hidden" sample, so the two cannot be confused at a glance.
 *
 * - Whole-side hidden (showOwnPieces=false): a boxed pawn with a red diagonal
 *   slash — rendered as an SVG <line>. Means "this side is gone".
 * - Pawns hidden (pawnHideMode != none): an eye-off pill with a plain,
 *   un-slashed pawn glyph and the "pawnsHidden" label — NO <line>. Means "only
 *   the pawns are blindfolded".
 *
 * Translations resolve through the mocked safe-translations fallback (echoes the
 * key), so the label asserts on the stable `pawnsHidden` key.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GamePlaySettings } from '@/lib/games/saved-game-types';

import { PlaySettingsIndicator } from './PlaySettingsIndicator';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

const BASE: GamePlaySettings = {
  boardVisibility: 'always',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
};

afterEach(() => cleanup());

describe('PlaySettingsIndicator — pawn-hide vs side-hide distinction', () => {
  it('renders the pawn-hide chip with the label and NO red slash', () => {
    const { container } = render(
      <PlaySettingsIndicator
        settings={{ ...BASE, pawnHideMode: 'all' }}
        playerColor="white"
        label={null}
      />
    );
    // The eye-off pill carries the "pawnsHidden" label...
    expect(container.textContent ?? '').toContain('pawnsHidden');
    // ...and uses NO diagonal-slash <line> (that marker belongs to side-hide).
    expect(container.querySelectorAll('line')).toHaveLength(0);
  });

  it('renders the whole-side hidden sample with a red slash and no pawn-hide label', () => {
    const { container } = render(
      <PlaySettingsIndicator
        settings={{ ...BASE, showOwnPieces: false }}
        playerColor="white"
        label={null}
      />
    );
    // The side sample slashes the hidden side...
    expect(container.querySelectorAll('line').length).toBeGreaterThanOrEqual(1);
    // ...and there is no pawn-hide chip (pawnHideMode is 'none').
    expect(container.textContent ?? '').not.toContain('pawnsHidden');
  });
});
