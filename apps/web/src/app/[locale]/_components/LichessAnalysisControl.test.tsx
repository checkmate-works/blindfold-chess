// @vitest-environment jsdom
/**
 * The control sends either the moves (switch on, the default) or only the
 * shown position (off); the choice survives a remount through browser
 * storage; and a game too long for a Lichess link says so with a chip that
 * explains the way around it. Translations resolve through the mocked
 * safe-translations fallback (echoes the key), so assertions use the keys.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LichessAnalysisUrls } from '../_lib/lichess-analysis-urls';
import { resetIncludeMovesForTests } from '../_lib/lichess-include-moves-store';
import { LichessAnalysisControl } from './LichessAnalysisControl';

vi.mock('@/i18n/use-safe-translations');

const POSITION_URL = 'https://lichess.org/analysis/8/8/8/8/8/8/8/k6K_w_-_-_0_1';
const GAME_URL = 'https://lichess.org/analysis/pgn/e4_e5#2';

function urls(truncated = false): LichessAnalysisUrls {
  return {
    position: POSITION_URL,
    game: {
      url: GAME_URL,
      includedMoves: truncated ? 1 : 2,
      truncated,
      cut: truncated ? { lastIncludedMove: '1. e4', lastMove: '1...e5' } : null,
    },
  };
}

const link = () => screen.getByRole('link', { name: /analyzeOnLichess/ });
const toggle = () => screen.getByRole('switch', { name: /includeMoves/ });
const chip = () => screen.queryByRole('button', { name: /truncatedChip/ });

beforeEach(() => {
  window.localStorage.clear();
  resetIncludeMovesForTests();
});

describe('LichessAnalysisControl', () => {
  it('sends the moves by default, in a new tab', () => {
    render(<LichessAnalysisControl urls={urls()} getPgnText={() => '1. e4 e5'} />);

    expect(toggle().getAttribute('aria-checked')).toBe('true');
    expect(link().getAttribute('href')).toBe(GAME_URL);
    expect(link().getAttribute('target')).toBe('_blank');
    expect(link().getAttribute('rel')).toContain('noopener');
  });

  // The label alone does not say that "off" means the position with no
  // moves, so a line under it spells out what the link opens in each state.
  it('describes what the link opens, for the current state', () => {
    render(<LichessAnalysisControl urls={urls()} getPgnText={() => '1. e4 e5'} />);

    const describedBy = () => document.getElementById(toggle().getAttribute('aria-describedby')!);
    expect(describedBy()?.textContent).toBe('includeMovesOnHint');
    expect(link().getAttribute('aria-describedby')).toBe(toggle().getAttribute('aria-describedby'));

    fireEvent.click(toggle());
    expect(describedBy()?.textContent).toBe('includeMovesOffHint');
  });

  it('sends only the position when switched off, and remembers it', () => {
    const { unmount } = render(
      <LichessAnalysisControl urls={urls()} getPgnText={() => '1. e4 e5'} />
    );
    fireEvent.click(toggle());

    expect(toggle().getAttribute('aria-checked')).toBe('false');
    expect(link().getAttribute('href')).toBe(POSITION_URL);

    unmount();
    resetIncludeMovesForTests();
    render(<LichessAnalysisControl urls={urls()} getPgnText={() => '1. e4 e5'} />);
    expect(link().getAttribute('href')).toBe(POSITION_URL);
  });

  it('shows no chip for a game that fits', () => {
    render(<LichessAnalysisControl urls={urls()} getPgnText={() => '1. e4 e5'} />);
    expect(chip()).toBeNull();
  });

  it('flags a cut-off game with a chip that opens the explanation', () => {
    render(<LichessAnalysisControl urls={urls(true)} getPgnText={() => '1. e4 e5'} />);

    fireEvent.click(chip()!);

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/truncatedBody/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /openImport/ }).getAttribute('href')).toBe(
      'https://lichess.org/paste'
    );
  });

  // The PGN of a long game is only built when someone copies it.
  it('builds the PGN only when it is copied', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const getPgnText = vi.fn(() => '1. e4 e5');
    render(<LichessAnalysisControl urls={urls(true)} getPgnText={getPgnText} />);

    fireEvent.click(chip()!);
    expect(getPgnText).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /copyPgn/ }));
    expect(getPgnText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('1. e4 e5');
  });

  // The cut only affects the game link, so the chip goes with it.
  it('hides the chip when only the position is sent', () => {
    render(<LichessAnalysisControl urls={urls(true)} getPgnText={() => '1. e4 e5'} />);
    fireEvent.click(toggle());
    expect(chip()).toBeNull();
  });
});
