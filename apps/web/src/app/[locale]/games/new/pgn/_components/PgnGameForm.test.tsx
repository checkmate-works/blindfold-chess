import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PgnGameForm } from './PgnGameForm';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/en',
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock next-intl/navigation (used by @/i18n/routing via barrel exports)
vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: 'a',
    redirect: vi.fn(),
    usePathname: () => '/en',
    useRouter: () => ({ push: vi.fn() }),
    getPathname: vi.fn(),
  }),
}));

// Mock next-intl/routing
vi.mock('next-intl/routing', () => ({
  defineRouting: vi.fn(() => ({})),
}));

// Mock useGamePreferences
vi.mock('@/app/[locale]/_contexts/GamePreferencesContext', () => ({
  useGamePreferences: () => ({
    preferences: {
      showCoordinates: true,
      highlightLastMove: true,
      boardTheme: 'lichess',
      showOwnPieces: true,
      showOpponentPieces: true,
      pieceShapeMode: 'normal',
      pieceColors: 'normal',
      moveInputMode: 'text',
      enabledMoveInputModes: ['text', 'select', 'button'],
      buttonInputPieceLabel: 'icon',
      enableAutoComplete: true,
      adsEnabled: true,
    },
    updatePreferences: vi.fn(),
    resetPreferences: vi.fn(),
  }),
}));

// Mock BoardViewModal (heavy component with board rendering)
vi.mock('@/app/[locale]/play/_components/BoardViewModal', () => ({
  BoardViewModal: () => null,
}));

// Mock useMoveNavigation
vi.mock('@/app/[locale]/play/_hooks/use-move-navigation', () => ({
  useMoveNavigation: () => ({
    currentPosition: -1,
    displayFen: null,
    navigateToPosition: vi.fn(),
    navigateToStart: vi.fn(),
    navigatePrevious: vi.fn(),
    navigateNext: vi.fn(),
    navigateToEnd: vi.fn(),
    latestFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Reset search params
  for (const key of [...mockSearchParams.keys()]) {
    mockSearchParams.delete(key);
  }
});

function getPgnTextarea(): HTMLTextAreaElement {
  return screen.getByRole('textbox') as HTMLTextAreaElement;
}

function getStartButton(): HTMLButtonElement {
  return screen.getByText('startGame').closest('button') as HTMLButtonElement;
}

describe('PgnGameForm', () => {
  it('renders PGN input, color selector, and skill level selector', () => {
    render(<PgnGameForm locale="en" />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('playAsWhite')).toBeInTheDocument();
    expect(screen.getByText('playAsBlack')).toBeInTheDocument();
    expect(screen.getByText('selectLevel')).toBeInTheDocument();
    expect(screen.getByText('startGame')).toBeInTheDocument();
  });

  it('disables start button when PGN is empty', () => {
    render(<PgnGameForm locale="en" />);

    expect(getStartButton()).toBeDisabled();
  });

  it('disables start button when PGN is invalid', () => {
    render(<PgnGameForm locale="en" />);

    const textarea = getPgnTextarea();
    fireEvent.change(textarea, { target: { value: 'invalid pgn content' } });

    expect(getStartButton()).toBeDisabled();
  });

  it('enables start button when PGN is valid', () => {
    render(<PgnGameForm locale="en" />);

    const textarea = getPgnTextarea();
    fireEvent.change(textarea, { target: { value: '1. e4 e5' } });

    expect(getStartButton()).not.toBeDisabled();
  });

  it('auto-derives color to black after white moves last', () => {
    render(<PgnGameForm locale="en" />);

    const textarea = getPgnTextarea();
    // White moves last (1. e4) - color should be derived as black
    fireEvent.change(textarea, { target: { value: '1. e4' } });

    // The black button should be active (auto-derived)
    const blackButton = screen.getByText('playAsBlack').closest('button')!;
    expect(blackButton.className).toContain('border-foreground');
  });

  it('auto-derives color to white after black moves last', () => {
    render(<PgnGameForm locale="en" />);

    const textarea = getPgnTextarea();
    // Both sides move, black moves last
    fireEvent.change(textarea, { target: { value: '1. e4 e5' } });

    // Color should be derived as white
    const whiteButton = screen.getByText('playAsWhite').closest('button')!;
    expect(whiteButton.className).toContain('border-foreground');
  });

  it('shows derivedFromPgn text when PGN is valid and color not locked', () => {
    render(<PgnGameForm locale="en" />);

    const textarea = getPgnTextarea();
    fireEvent.change(textarea, { target: { value: '1. e4 e5' } });

    expect(screen.getByText('derivedFromPgn')).toBeInTheDocument();
  });

  it('navigates with correct URL params on start', () => {
    render(<PgnGameForm locale="en" />);

    const textarea = getPgnTextarea();
    fireEvent.change(textarea, { target: { value: '1. e4 e5' } });

    fireEvent.click(getStartButton());

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('/en/play?');
    expect(url).toContain('color=white');
    expect(url).toContain('skillLevel=5');
    expect(url).toContain('moves=');
    // Verify moves are JSON encoded
    const urlObj = new URL(`http://localhost${url}`);
    const moves = JSON.parse(urlObj.searchParams.get('moves')!);
    expect(moves).toEqual(['e4', 'e5']);
  });

  it('navigates with locale in URL', () => {
    render(<PgnGameForm locale="ja" />);

    const textarea = getPgnTextarea();
    fireEvent.change(textarea, { target: { value: '1. e4 e5' } });
    fireEvent.click(getStartButton());

    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('/ja/play?');
  });

  it('navigates with changed skill level', () => {
    render(<PgnGameForm locale="en" />);

    const textarea = getPgnTextarea();
    fireEvent.change(textarea, { target: { value: '1. e4 e5' } });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '15' } });

    fireEvent.click(getStartButton());

    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('skillLevel=15');
  });

  describe('URL parameter initialization', () => {
    it('initializes PGN from moves URL param', () => {
      mockSearchParams.set('moves', JSON.stringify(['e4', 'e5', 'Nf3']));

      render(<PgnGameForm locale="en" />);

      const textarea = getPgnTextarea();
      expect(textarea.value).toContain('e4');
      expect(textarea.value).toContain('e5');
      expect(textarea.value).toContain('Nf3');
    });

    it('initializes color from URL param and locks it', () => {
      mockSearchParams.set('moves', JSON.stringify(['e4', 'e5']));
      mockSearchParams.set('color', 'black');

      render(<PgnGameForm locale="en" />);

      // Black should be selected (from URL, not auto-derived)
      const blackButton = screen.getByText('playAsBlack').closest('button')!;
      expect(blackButton.className).toContain('border-foreground');
    });

    it('initializes skill level from URL param', () => {
      mockSearchParams.set('moves', JSON.stringify(['e4']));
      mockSearchParams.set('skillLevel', '12');

      render(<PgnGameForm locale="en" />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('12');
    });

    it('initializes PGN with FEN header from URL params', () => {
      const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      mockSearchParams.set('moves', JSON.stringify(['e5']));
      mockSearchParams.set('fen', customFen);

      render(<PgnGameForm locale="en" />);

      const textarea = getPgnTextarea();
      expect(textarea.value).toContain('[SetUp "1"]');
      expect(textarea.value).toContain(`[FEN "${customFen}"]`);
      expect(textarea.value).toContain('e5');
    });
  });
});
