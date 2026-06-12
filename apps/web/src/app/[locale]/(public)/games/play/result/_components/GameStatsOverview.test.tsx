/**
 * Tests for the result-page change log's per-change-point from→to text.
 *
 * The icon snapshot (PlaySettingsIndicator) shows the *resulting* state at each
 * change point and so cannot convey direction — e.g. a "Pawns hidden" chip tells
 * you pawns are hidden from that move, but not whether the edit turned the mode
 * ON or OFF. The from→to text resolves that. It is result-page only: published
 * games persist just the `to` subset, so the shared page passes no
 * `preferenceChangeLog` and shows icons alone.
 *
 * Translations resolve through the safe-translations fallback (mocked to echo
 * the key path), so assertions key off the stable `pawnHideModes.*` value paths.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GameStats } from '@/lib/games/compute-game-stats';
import type {
  PlaySettingsChangeEntry,
  PreferenceChangeLogEntry,
} from '@/lib/games/saved-game-types';

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

const PLAY_SETTINGS = {
  boardVisibility: 'always',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
} as const;

// At move 5 the player enabled pawn-hide (none → own); at move 12 they turned it
// back off (own → none). The display subset (to-only) drives the icon snapshot /
// change-point list; the full log carries the `from` for the text.
const PLAY_SETTINGS_LOG: PlaySettingsChangeEntry[] = [
  { atMoveIndex: 5, key: 'pawnHideMode', to: 'own' },
  { atMoveIndex: 12, key: 'pawnHideMode', to: 'none' },
];
const FULL_LOG: PreferenceChangeLogEntry[] = [
  { atMoveIndex: 5, key: 'pawnHideMode', from: 'none', to: 'own' },
  { atMoveIndex: 12, key: 'pawnHideMode', from: 'own', to: 'none' },
];

afterEach(() => cleanup());

describe('GameStatsOverview change log — pawn-hide direction', () => {
  it('renders an explicit from→to per change point when the full log is provided', () => {
    const { container } = render(
      <GameStatsOverview
        stats={STATS}
        playerMoveIndices={[0]}
        moves={['e4']}
        onSelectMove={vi.fn()}
        playSettings={PLAY_SETTINGS}
        playerColor="white"
        playSettingsLog={PLAY_SETTINGS_LOG}
        preferenceChangeLog={FULL_LOG}
        showInitialSettings={false}
      />
    );
    const text = container.textContent ?? '';
    // Enable reads none → own; disable reads own → none — the two are now
    // unambiguous, which the icon snapshot alone could not express.
    expect(text).toContain('pawnHideModes.none → pawnHideModes.own');
    expect(text).toContain('pawnHideModes.own → pawnHideModes.none');
    // No folded-state snapshot on the result page: the always-on board
    // visibility chip ('visibility.*') would read as "changed" even on a move
    // that only touched pawns, so it is dropped in favour of the deltas.
    expect(text).not.toContain('visibility.');
  });

  it('omits the from→to text when no full log is passed (shared-page case)', () => {
    const { container } = render(
      <GameStatsOverview
        stats={STATS}
        playerMoveIndices={[0]}
        moves={['e4']}
        onSelectMove={vi.fn()}
        playSettings={PLAY_SETTINGS}
        playerColor="white"
        playSettingsLog={PLAY_SETTINGS_LOG}
        showInitialSettings={false}
      />
    );
    // No `from` available → no arrow text; the icon snapshot still renders
    // (the folded board-visibility chip is present).
    const text = container.textContent ?? '';
    expect(text).not.toContain('→');
    expect(text).toContain('visibility.');
  });
});
