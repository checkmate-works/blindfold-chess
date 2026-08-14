import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Opening } from '@/app/[locale]/_components/OpeningSearch';

import { OpeningGameForm } from './OpeningGameForm';

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations');

vi.mock('@/i18n/use-safe-locale', () => ({
  useSafeLocale: () => 'en',
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('@blindfold-chess/features/chess-core', () => ({
  parsePgn: (pgn: string) => {
    const moveMap: Record<string, string[]> = {
      '1. e4 c5': ['e4', 'c5'],
      '1. e4 e5 2. Nf3 Nc6 3. Bb5': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
      '1. d4 d5 2. c4': ['d4', 'd5', 'c4'],
    };
    return moveMap[pgn] ?? [];
  },
}));

vi.mock('@/app/[locale]/_components/OpeningCardWithProvider', () => ({
  OpeningCardWithProvider: ({
    displayName,
  }: {
    opening: unknown;
    displayName: string;
    locale: string;
    disableLink?: boolean;
  }) => <div data-testid="opening-card">{displayName}</div>,
}));

const sampleOpenings: Opening[] = [
  {
    slug: 'sicilian-defense',
    name: 'Sicilian Defense',
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    ecoCode: 'B20',
    pgn: '1. e4 c5',
    translatedName: 'Sicilian Defense',
  },
  {
    slug: 'ruy-lopez',
    name: 'Ruy Lopez',
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    ecoCode: 'C60',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
    translatedName: 'Ruy Lopez',
  },
  {
    slug: 'queens-gambit',
    name: "Queen's Gambit",
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
    ecoCode: 'D06',
    pgn: '1. d4 d5 2. c4',
    translatedName: "Queen's Gambit",
  },
];

describe('OpeningGameForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should render the search input and opening list', () => {
      render(<OpeningGameForm openings={sampleOpenings} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('should not show the opening card or start button initially', () => {
      render(<OpeningGameForm openings={sampleOpenings} />);

      expect(screen.queryByTestId('opening-card')).not.toBeInTheDocument();
      expect(screen.queryByText('startGame')).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('should show opening card and start button when an opening is selected', () => {
      render(<OpeningGameForm openings={sampleOpenings} />);

      fireEvent.click(screen.getByText('Sicilian Defense'));

      expect(screen.getByTestId('opening-card')).toBeInTheDocument();
      expect(screen.getByText('startGame')).toBeInTheDocument();
    });

    it('should update the displayed card when a different opening is selected', () => {
      render(<OpeningGameForm openings={sampleOpenings} />);

      fireEvent.click(screen.getByText('Sicilian Defense'));
      expect(screen.getByTestId('opening-card')).toHaveTextContent('Sicilian Defense');

      fireEvent.click(screen.getByText('Ruy Lopez'));
      expect(screen.getByTestId('opening-card')).toHaveTextContent('Ruy Lopez');
    });
  });

  describe('navigation', () => {
    it('should navigate to PGN page with correct params for a white opening (FEN has "w" turn = black opening)', () => {
      render(<OpeningGameForm openings={sampleOpenings} />);

      fireEvent.click(screen.getByText('Sicilian Defense'));
      fireEvent.click(screen.getByText('startGame'));

      expect(mockPush).toHaveBeenCalledTimes(1);
      const url = mockPush.mock.calls[0][0] as string;
      expect(url).toContain('/en/games/new/pgn?');

      const params = new URLSearchParams(url.split('?')[1]);
      expect(JSON.parse(params.get('moves')!)).toEqual(['e4', 'c5']);
      expect(params.get('color')).toBe('black');
    });

    it('should navigate with color=white for a black turn opening (FEN has "b" turn = white opening)', () => {
      render(<OpeningGameForm openings={sampleOpenings} />);

      fireEvent.click(screen.getByText('Ruy Lopez'));
      fireEvent.click(screen.getByText('startGame'));

      expect(mockPush).toHaveBeenCalledTimes(1);
      const url = mockPush.mock.calls[0][0] as string;

      const params = new URLSearchParams(url.split('?')[1]);
      expect(JSON.parse(params.get('moves')!)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
      expect(params.get('color')).toBe('white');
    });

    it('should not navigate when start button is clicked without a selection', () => {
      render(<OpeningGameForm openings={sampleOpenings} />);

      // No opening selected, so the button should not be present
      expect(screen.queryByText('startGame')).not.toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('search + select flow', () => {
    it('should allow filtering then selecting an opening', () => {
      render(<OpeningGameForm openings={sampleOpenings} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'gambit' } });
      expect(screen.getAllByRole('option')).toHaveLength(1);

      fireEvent.click(screen.getByText("Queen's Gambit"));

      expect(screen.getByTestId('opening-card')).toHaveTextContent("Queen's Gambit");
      expect(screen.getByText('startGame')).toBeInTheDocument();
    });

    it('should navigate correctly after filtering and selecting', () => {
      render(<OpeningGameForm openings={sampleOpenings} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'queen' } });
      fireEvent.click(screen.getByText("Queen's Gambit"));
      fireEvent.click(screen.getByText('startGame'));

      const url = mockPush.mock.calls[0][0] as string;
      const params = new URLSearchParams(url.split('?')[1]);
      expect(JSON.parse(params.get('moves')!)).toEqual(['d4', 'd5', 'c4']);
      expect(params.get('color')).toBe('white');
    });
  });
});
