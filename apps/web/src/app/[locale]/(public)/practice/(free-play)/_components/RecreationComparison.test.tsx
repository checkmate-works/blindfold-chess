import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { RecreationComparison } from './RecreationComparison';

vi.mock('@/i18n/use-safe-translations');

const ORIGINAL_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const RECREATED_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function renderComparison(showCoordinates: boolean) {
  const { container } = render(
    <RecreationComparison
      namespace="practice.positionMemory"
      originalPosition={{ fen: ORIGINAL_FEN, isBlackToMove: true }}
      recreatedPosition={RECREATED_FEN}
      boardTheme={DEFAULT_BOARD_THEME}
      showCoordinates={showCoordinates}
    />
  );
  const grid = container.firstElementChild as HTMLElement;
  const [original, recreation] = Array.from(grid.children) as HTMLElement[];
  return { original, recreation };
}

/** Every file letter and rank digit the board drew as a coordinate label. */
function coordinateLabels(board: HTMLElement): string[] {
  return within(board)
    .queryAllByText(/^[a-h1-8]$/)
    .map((el) => el.textContent ?? '');
}

describe('RecreationComparison', () => {
  it('labels the original and the recreation', () => {
    const { original, recreation } = renderComparison(true);

    expect(within(original).getByText('original')).toBeInTheDocument();
    expect(within(recreation).getByText('yourRecreation')).toBeInTheDocument();
  });

  // The reader's coordinate preference applies to the whole result, so a
  // caller passing it once must see it on both boards — the recreation board
  // used to silently fall back to its own default.
  it('draws coordinates on both boards when showCoordinates is true', () => {
    const { original, recreation } = renderComparison(true);

    expect(coordinateLabels(original)).toEqual(expect.arrayContaining(['a', 'h', '1', '8']));
    expect(coordinateLabels(recreation)).toEqual(expect.arrayContaining(['a', 'h', '1', '8']));
  });

  it('draws coordinates on neither board when showCoordinates is false', () => {
    const { original, recreation } = renderComparison(false);

    expect(coordinateLabels(original)).toEqual([]);
    expect(coordinateLabels(recreation)).toEqual([]);
  });
});
