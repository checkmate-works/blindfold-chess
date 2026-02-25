import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PositionGameForm } from './PositionGameForm';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
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

// Track FEN changes from EditableChessBoard mock
let capturedOnFenChange: ((fen: string) => void) | null = null;
let capturedFen: string | null = null;
vi.mock('@/app/[locale]/practice/_components/EditableChessBoard', () => ({
  EditableChessBoard: ({
    fen,
    onFenChange,
  }: {
    fen: string;
    onFenChange: (fen: string) => void;
  }) => {
    capturedFen = fen;
    capturedOnFenChange = onFenChange;
    return <div data-testid="editable-chess-board" />;
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  capturedOnFenChange = null;
  capturedFen = null;
  mockSearchParams = new URLSearchParams();
});

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function setValidPosition() {
  act(() => {
    capturedOnFenChange!(VALID_FEN);
  });
}

function getSkillLevelSelect(): HTMLSelectElement {
  // PositionSettings has an en passant combobox, SkillLevelSelector also has one.
  // The skill level select is the last combobox on the page.
  const selects = screen.getAllByRole('combobox');
  return selects[selects.length - 1] as HTMLSelectElement;
}

describe('PositionGameForm', () => {
  it('renders board editor and position settings', () => {
    render(<PositionGameForm locale="en" />);

    expect(screen.getByTestId('editable-chess-board')).toBeInTheDocument();
    expect(screen.getByText('positionSettings.title')).toBeInTheDocument();
  });

  it('renders color selector and skill level selector', () => {
    render(<PositionGameForm locale="en" />);

    expect(screen.getByText('selectColor')).toBeInTheDocument();
    expect(screen.getByText('playAsWhite')).toBeInTheDocument();
    expect(screen.getByText('playAsBlack')).toBeInTheDocument();
    expect(screen.getByText('selectLevel')).toBeInTheDocument();
  });

  it('shows position empty error for empty board', () => {
    render(<PositionGameForm locale="en" />);

    expect(screen.getByText('positionEmpty')).toBeInTheDocument();
  });

  it('disables start button when board is empty', () => {
    render(<PositionGameForm locale="en" />);

    const startButton = screen.getByText('startGame').closest('button')!;
    expect(startButton).toBeDisabled();
  });

  it('enables start button when position is valid', () => {
    render(<PositionGameForm locale="en" />);

    setValidPosition();

    const startButton = screen.getByText('startGame').closest('button')!;
    expect(startButton).not.toBeDisabled();
  });

  it('shows valid position message when position is valid', () => {
    render(<PositionGameForm locale="en" />);

    setValidPosition();

    expect(screen.getByText('positionValid')).toBeInTheDocument();
  });

  it('shows invalid position error for invalid FEN', () => {
    render(<PositionGameForm locale="en" />);

    // A board with just pawns and no kings is invalid
    act(() => {
      capturedOnFenChange!('8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1');
    });

    expect(screen.getByText('positionInvalid')).toBeInTheDocument();
  });

  it('color selector defaults to white', () => {
    render(<PositionGameForm locale="en" />);

    const whiteColorButton = screen.getByText('playAsWhite').closest('button')!;
    expect(whiteColorButton.className).toContain('border-foreground');
  });

  it('color selector is enabled and can be changed', () => {
    render(<PositionGameForm locale="en" />);

    const colorButton = screen.getByText('playAsWhite').closest('button')!;
    expect(colorButton).not.toBeDisabled();

    fireEvent.click(screen.getByText('playAsBlack'));

    const blackColorButton = screen.getByText('playAsBlack').closest('button')!;
    expect(blackColorButton.className).toContain('border-foreground');
  });

  it('navigates with correct FEN in URL params on start', () => {
    render(<PositionGameForm locale="en" />);

    setValidPosition();

    fireEvent.click(screen.getByText('startGame'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('/en/play?');
    expect(url).toContain('color=white');
    expect(url).toContain('skillLevel=5');
    expect(url).toContain('fen=');
  });

  it('uses locale in navigation URL', () => {
    render(<PositionGameForm locale="ja" />);

    setValidPosition();

    fireEvent.click(screen.getByText('startGame'));

    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('/ja/play?');
  });

  it('navigates with changed skill level', () => {
    render(<PositionGameForm locale="en" />);

    setValidPosition();

    const select = getSkillLevelSelect();
    fireEvent.change(select, { target: { value: '8' } });

    fireEvent.click(screen.getByText('startGame'));

    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('skillLevel=8');
  });

  it('includes turn in FEN when navigating with black color selected', () => {
    render(<PositionGameForm locale="en" />);

    act(() => {
      capturedOnFenChange!('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
    });

    // Select black color
    fireEvent.click(screen.getByText('playAsBlack'));

    fireEvent.click(screen.getByText('startGame'));

    const url = mockPush.mock.calls[0][0] as string;
    const urlObj = new URL(`http://localhost${url}`);
    const fen = urlObj.searchParams.get('fen')!;
    // FEN should contain 'b' for black turn (derived from color)
    const fenParts = fen.split(' ');
    expect(fenParts[1]).toBe('b');
  });

  it('includes white turn in FEN when white color is selected', () => {
    render(<PositionGameForm locale="en" />);

    setValidPosition();

    fireEvent.click(screen.getByText('startGame'));

    const url = mockPush.mock.calls[0][0] as string;
    const urlObj = new URL(`http://localhost${url}`);
    const fen = urlObj.searchParams.get('fen')!;
    const fenParts = fen.split(' ');
    expect(fenParts[1]).toBe('w');
  });

  it('resets en passant when switching color from white to black', () => {
    render(<PositionGameForm locale="en" />);

    // Set a valid position that includes en passant possibility
    act(() => {
      capturedOnFenChange!('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
    });

    // The en passant select is the first combobox; skill level is the last
    const enPassantSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    fireEvent.change(enPassantSelect, { target: { value: 'e6' } });
    expect(enPassantSelect.value).toBe('e6');

    // Switch color to black - should reset en passant
    fireEvent.click(screen.getByText('playAsBlack'));

    // En passant should be reset to '-'
    expect(enPassantSelect.value).toBe('-');
  });

  it('shows rank 3 en passant options after switching to black', () => {
    render(<PositionGameForm locale="en" />);

    // Switch to black
    fireEvent.click(screen.getByText('playAsBlack'));

    const enPassantSelect = screen.getAllByRole('combobox')[0];
    const options = within(enPassantSelect).getAllByRole('option');

    // "none" + 8 files on rank 3
    expect(options).toHaveLength(9);
    expect(options[1]).toHaveTextContent('a3');
    expect(options[8]).toHaveTextContent('h3');
  });

  it('shows rank 6 en passant options when white is selected', () => {
    render(<PositionGameForm locale="en" />);

    const enPassantSelect = screen.getAllByRole('combobox')[0];
    const options = within(enPassantSelect).getAllByRole('option');

    // "none" + 8 files on rank 6
    expect(options).toHaveLength(9);
    expect(options[1]).toHaveTextContent('a6');
    expect(options[8]).toHaveTextContent('h6');
  });

  it('does not navigate when position is invalid', () => {
    render(<PositionGameForm locale="en" />);

    const startButton = screen.getByText('startGame').closest('button')!;
    fireEvent.click(startButton);

    expect(mockPush).not.toHaveBeenCalled();
  });

  describe('FEN query parameter initialization', () => {
    it('initializes board, color, castling, and en passant from FEN query parameter', () => {
      mockSearchParams = new URLSearchParams({
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      });
      render(<PositionGameForm locale="en" />);

      // Board FEN should be set
      expect(capturedFen).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');

      // Color should be black
      const blackColorButton = screen.getByText('playAsBlack').closest('button')!;
      expect(blackColorButton.className).toContain('border-foreground');

      // En passant should be e3
      const enPassantSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
      expect(enPassantSelect.value).toBe('e3');
    });

    it('initializes only board part from incomplete FEN (board part only)', () => {
      mockSearchParams = new URLSearchParams({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
      });
      render(<PositionGameForm locale="en" />);

      // Board FEN should be set
      expect(capturedFen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');

      // Color should remain default (white)
      const whiteColorButton = screen.getByText('playAsWhite').closest('button')!;
      expect(whiteColorButton.className).toContain('border-foreground');
    });

    it('uses default empty board when no FEN query parameter is present', () => {
      mockSearchParams = new URLSearchParams();
      render(<PositionGameForm locale="en" />);

      // Board should be empty
      expect(capturedFen).toBe('8/8/8/8/8/8/8/8 w - - 0 1');

      // Color should be default (white)
      const whiteColorButton = screen.getByText('playAsWhite').closest('button')!;
      expect(whiteColorButton.className).toContain('border-foreground');
    });
  });
});
