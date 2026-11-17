// @vitest-environment jsdom
/**
 * The puzzle result's "Analyze on Lichess" sends the solution line from the
 * puzzle's own start and opens it there (the result has no move cursor —
 * the replay only animates); switched off, it sends the puzzle position
 * alone, as the old button did. The rest of the screen is stubbed.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetIncludeMovesForTests } from '@/app/[locale]/_lib/lichess-include-moves-store';

import { PuzzleResultClient } from './PuzzleResultClient';

vi.mock('@/i18n/use-safe-translations');
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/app/[locale]/(public)/practice/(free-play)/_actions/toggleLike', () => ({
  toggleLike: vi.fn(),
}));
vi.mock('@/app/[locale]/(public)/practice/_components/ExpGainDisplay', () => ({
  ExpGainDisplay: () => null,
}));
vi.mock('@/app/[locale]/(public)/practice/_components/SignUpBanner', () => ({
  SignUpBanner: () => null,
}));
vi.mock('@/app/[locale]/_components/UserAvatar', () => ({ UserAvatar: () => null }));
vi.mock('../../_components/ResultLikeCta', () => ({ ResultLikeCta: () => null }));
vi.mock('./PuzzleSolutionReplay', () => ({ PuzzleSolutionReplay: () => null }));

// White to move at move 3, after 1. e4 e5 2. Nf3 Nc6.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

function renderResult() {
  return render(
    <PuzzleResultClient
      locale="en"
      positionId="p1"
      fen={FEN}
      solutionLines={['Bb5 a6 Ba4']}
      solutionMoveLists={[
        [
          { san: 'Bb5', note: null },
          { san: 'a6', note: null },
          { san: 'Ba4', note: null },
        ],
      ]}
      expInfo={null}
      initialLikeCount={0}
      initialLikedByMe={false}
      profile={null}
      displayName="author"
    />
  );
}

const lichessHref = () =>
  screen.getByRole('link', { name: /analyzeOnLichess/ }).getAttribute('href');

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetIncludeMovesForTests();
});

describe('PuzzleResultClient — Lichess link', () => {
  it('sends the solution from the puzzle start, opened at the start', () => {
    renderResult();

    // Ply 4 is White to move at move 3: the puzzle position, before Bb5.
    expect(lichessHref()).toBe(
      'https://lichess.org/analysis/pgn/' +
        '%5BFEN_%22r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R_w_KQkq_-_2_3%22%5D_Bb5_a6_Ba4' +
        '#4'
    );
  });

  it('sends only the puzzle position once moves are switched off', () => {
    renderResult();
    fireEvent.click(screen.getByRole('switch', { name: /includeMoves/ }));

    expect(lichessHref()).toBe(`https://lichess.org/analysis/${FEN.replaceAll(' ', '_')}`);
  });
});
