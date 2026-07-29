/**
 * Tests for the result-page change log's per-change-point from→to text.
 *
 * The change log lists only what actually changed at each move, as an explicit
 * "Label: from → to" transition. The `from` is reconstructed by folding the
 * to-only `playSettingsLog` over the start-of-game `playSettings` snapshot
 * (see `resolvePlaySettingsChanges`), so the result page and the shared replay
 * render the identical change log from the same inputs — no `from`-bearing log
 * is needed. A setting that did not change at a given move never appears on that
 * row (the earlier folded-state icons showed an always-on board-visibility chip
 * that read as "changed" when it was not).
 *
 * Translations resolve through the mocked safe-translations fallback (echoes the
 * key), so assertions key off the stable value paths (`boardVisibilities.*`,
 * `pawnHideModes.*`).
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GameStats } from '@/lib/games/compute-game-stats';
import type { GamePlaySettings, PlaySettingsChangeEntry } from '@/lib/games/saved-game-types';

import { GameStatsOverview } from './GameStatsOverview';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

// `@/i18n/routing`'s `Link` pulls in next-intl's navigation factory, which fails
// to resolve `next/navigation` under vitest's ESM. The opening-row chain imports
// it transitively; stub it (this test never renders the opening row).
vi.mock('@/i18n/routing', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => children,
}));

// The Starting-position thumbnail reads the board theme from this context; the
// tests drive it directly instead of mounting the provider.
const mockUseGamePreferences = vi.fn(() => ({ preferences: { boardTheme: 'lichess' } }));
vi.mock('@/app/[locale]/_contexts/GamePreferencesContext', () => ({
  useGamePreferences: () => mockUseGamePreferences(),
}));

const STATS: GameStats = {
  totalMoves: 1,
  peeks: 0,
  illegal: 0,
  takebacks: 0,
  hints: 0,
  cleanMoves: 1,
  aidedMoves: 0,
  perMove: ['clean'],
};

const baseSettings = (over: Partial<GamePlaySettings> = {}): GamePlaySettings => ({
  boardVisibility: 'always',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
  ...over,
});

afterEach(() => cleanup());

describe('GameStatsOverview change log', () => {
  it('reconstructs from→to for each changed key from the snapshot + to-only log', () => {
    // Start: board peekable, own pawns hidden. Board flips to always-visible at
    // move 10; pawn-hide turned off at move 40. The `from` of each must come from
    // the folded state, not be left blank.
    const log: PlaySettingsChangeEntry[] = [
      { atMoveIndex: 10, key: 'boardVisibility', to: 'always' },
      { atMoveIndex: 40, key: 'pawnHideMode', to: 'none' },
    ];
    const { container } = render(
      <GameStatsOverview
        stats={STATS}
        playerMoveIndices={[0]}
        moves={['e4']}
        onSelectMove={vi.fn()}
        playSettings={baseSettings({ boardVisibility: 'peek', pawnHideMode: 'own' })}
        playerColor="white"
        playSettingsLog={log}
      />
    );
    const text = container.textContent ?? '';
    expect(text).toContain('boardVisibilities.peek → boardVisibilities.always');
    expect(text).toContain('pawnHideModes.own → pawnHideModes.none');
  });

  it('shows only the setting that changed at a move — not unrelated state', () => {
    // Only pawn-hide changes at move 40; board visibility is untouched, so the
    // row must NOT mention board visibility at all (the user-reported bug).
    const log: PlaySettingsChangeEntry[] = [{ atMoveIndex: 40, key: 'pawnHideMode', to: 'own' }];
    const { container } = render(
      <GameStatsOverview
        stats={STATS}
        playerMoveIndices={[0]}
        moves={['e4']}
        onSelectMove={vi.fn()}
        playSettings={baseSettings()}
        playerColor="white"
        playSettingsLog={log}
      />
    );
    const text = container.textContent ?? '';
    expect(text).toContain('pawnHideModes.none → pawnHideModes.own');
    // The unchanged board visibility must not appear as a change-log transition.
    // (The Initial Settings indicator uses the `visibility.*` keys, not
    // `boardVisibilities.*`, so this stays specific to the change log.)
    expect(text).not.toContain('boardVisibilities');
  });
});

describe('GameStatsOverview starting position', () => {
  // Regression guard: the Starting-position thumbnail used to render an
  // unthemed BoardThumbnail, so it always fell back to the default (lichess)
  // board colours — a user on chesscom/monotone saw it clash with the replay
  // board right above it on the same page.
  it('renders the starting position with the user’s selected board theme', () => {
    mockUseGamePreferences.mockReturnValue({ preferences: { boardTheme: 'chesscom' } });

    const { container } = render(
      <GameStatsOverview
        stats={STATS}
        playerMoveIndices={[0]}
        moves={['e4']}
        onSelectMove={vi.fn()}
        playerColor="white"
        startPosition={{
          fen: '8/8/8/8/8/8/8/K6k w - - 0 1',
          movesLine: null,
          jumpIndex: -2,
        }}
      />
    );

    expect(container.innerHTML).toContain('--color-board-chesscom-light');
    expect(container.innerHTML).not.toContain('--color-board-lichess-light');
  });
});
