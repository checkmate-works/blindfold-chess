// @vitest-environment jsdom
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { FormattedPgnMove } from '@/app/[locale]/play/_lib/pgn-parser';

import { InlineBoardView } from './InlineBoardView';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock ChessBoard since it has complex SVG rendering
vi.mock('@/app/_components', () => ({
  ChessBoard: (props: Record<string, unknown>) => (
    <div data-testid="chess-board" data-fen={props.fen} data-flipped={String(props.flipped)} />
  ),
}));

const defaultPreferences: GamePreferences = {
  showCoordinates: true,
  highlightLastMove: true,
  boardTheme: 'monotone',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  moveInputMode: 'button',
  enabledMoveInputModes: ['text', 'select', 'button'],
  buttonInputPieceLabel: 'icon',
  enableAutoComplete: true,
  showBoardButtonInGame: true,
  peekMode: 'inline',
  adsEnabled: true,
};

const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const defaultProps = {
  fen: defaultFen,
  playerSide: 'white' as const,
  lastMove: null,
  preferences: defaultPreferences,
  movesLength: 0,
  currentPosition: -1,
  formattedPgn: [] as FormattedPgnMove[],
  onNavigateToStart: vi.fn(),
  onNavigatePrevious: vi.fn(),
  onNavigateNext: vi.fn(),
  onNavigateToEnd: vi.fn(),
  onNavigateToPosition: vi.fn(),
};

describe('InlineBoardView', () => {
  describe('accordion behavior', () => {
    it('renders the toggle button with showBoard label', () => {
      render(<InlineBoardView {...defaultProps} />);
      expect(screen.getByText('showBoard')).toBeInTheDocument();
    });

    it('does not show the chess board initially (collapsed state)', () => {
      render(<InlineBoardView {...defaultProps} />);
      expect(screen.queryByTestId('chess-board')).not.toBeInTheDocument();
    });

    it('shows the chess board after clicking the toggle button', () => {
      render(<InlineBoardView {...defaultProps} />);

      fireEvent.click(screen.getByText('showBoard'));

      expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    });

    it('hides the chess board when clicking the toggle button again', () => {
      render(<InlineBoardView {...defaultProps} />);

      // Open
      fireEvent.click(screen.getByText('showBoard'));
      expect(screen.getByTestId('chess-board')).toBeInTheDocument();

      // Close
      fireEvent.click(screen.getByText('showBoard'));
      expect(screen.queryByTestId('chess-board')).not.toBeInTheDocument();
    });

    it('toggles multiple times', () => {
      render(<InlineBoardView {...defaultProps} />);

      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByText('showBoard'));
        expect(screen.getByTestId('chess-board')).toBeInTheDocument();

        fireEvent.click(screen.getByText('showBoard'));
        expect(screen.queryByTestId('chess-board')).not.toBeInTheDocument();
      }
    });
  });

  describe('chess board rendering', () => {
    it('passes the correct fen to the chess board', () => {
      const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      render(<InlineBoardView {...defaultProps} fen={customFen} />);

      fireEvent.click(screen.getByText('showBoard'));

      expect(screen.getByTestId('chess-board')).toHaveAttribute('data-fen', customFen);
    });

    it('flips the board when playerSide is black', () => {
      render(<InlineBoardView {...defaultProps} playerSide="black" />);

      fireEvent.click(screen.getByText('showBoard'));

      expect(screen.getByTestId('chess-board')).toHaveAttribute('data-flipped', 'true');
    });

    it('does not flip the board when playerSide is white', () => {
      render(<InlineBoardView {...defaultProps} playerSide="white" />);

      fireEvent.click(screen.getByText('showBoard'));

      expect(screen.getByTestId('chess-board')).toHaveAttribute('data-flipped', 'false');
    });
  });

  describe('move navigation controls', () => {
    it('does not show navigation controls when there are no moves', () => {
      render(<InlineBoardView {...defaultProps} movesLength={0} />);

      fireEvent.click(screen.getByText('showBoard'));

      expect(screen.queryByLabelText('Go to start')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Previous move')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Next move')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Go to end')).not.toBeInTheDocument();
    });

    it('shows navigation controls when there are moves', () => {
      render(<InlineBoardView {...defaultProps} movesLength={2} />);

      fireEvent.click(screen.getByText('showBoard'));

      expect(screen.getByLabelText('Go to start')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous move')).toBeInTheDocument();
      expect(screen.getByLabelText('Next move')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to end')).toBeInTheDocument();
    });

    it('calls onNavigateToStart when start button is clicked', () => {
      const onNavigateToStart = vi.fn();
      render(
        <InlineBoardView
          {...defaultProps}
          movesLength={2}
          currentPosition={1}
          onNavigateToStart={onNavigateToStart}
        />
      );

      fireEvent.click(screen.getByText('showBoard'));
      fireEvent.click(screen.getByLabelText('Go to start'));

      expect(onNavigateToStart).toHaveBeenCalledTimes(1);
    });

    it('calls onNavigatePrevious when previous button is clicked', () => {
      const onNavigatePrevious = vi.fn();
      render(
        <InlineBoardView
          {...defaultProps}
          movesLength={2}
          currentPosition={1}
          onNavigatePrevious={onNavigatePrevious}
        />
      );

      fireEvent.click(screen.getByText('showBoard'));
      fireEvent.click(screen.getByLabelText('Previous move'));

      expect(onNavigatePrevious).toHaveBeenCalledTimes(1);
    });

    it('calls onNavigateNext when next button is clicked', () => {
      const onNavigateNext = vi.fn();
      render(
        <InlineBoardView
          {...defaultProps}
          movesLength={4}
          currentPosition={0}
          onNavigateNext={onNavigateNext}
        />
      );

      fireEvent.click(screen.getByText('showBoard'));
      fireEvent.click(screen.getByLabelText('Next move'));

      expect(onNavigateNext).toHaveBeenCalledTimes(1);
    });

    it('calls onNavigateToEnd when end button is clicked', () => {
      const onNavigateToEnd = vi.fn();
      render(
        <InlineBoardView
          {...defaultProps}
          movesLength={4}
          currentPosition={0}
          onNavigateToEnd={onNavigateToEnd}
        />
      );

      fireEvent.click(screen.getByText('showBoard'));
      fireEvent.click(screen.getByLabelText('Go to end'));

      expect(onNavigateToEnd).toHaveBeenCalledTimes(1);
    });

    it('disables previous/start buttons at the start position', () => {
      render(<InlineBoardView {...defaultProps} movesLength={2} currentPosition={-2} />);

      fireEvent.click(screen.getByText('showBoard'));

      expect(screen.getByLabelText('Go to start')).toBeDisabled();
      expect(screen.getByLabelText('Previous move')).toBeDisabled();
    });

    it('disables next/end buttons at the latest position', () => {
      render(<InlineBoardView {...defaultProps} movesLength={4} currentPosition={-1} />);

      fireEvent.click(screen.getByText('showBoard'));

      expect(screen.getByLabelText('Next move')).toBeDisabled();
      expect(screen.getByLabelText('Go to end')).toBeDisabled();
    });
  });

  describe('move list display', () => {
    const formattedPgn: FormattedPgnMove[] = [
      {
        moveNumber: 1,
        whiteMove: 'e4',
        whiteMoveIndex: 0,
        blackMove: 'e5',
        blackMoveIndex: 1,
      },
      {
        moveNumber: 2,
        whiteMove: 'Nf3',
        whiteMoveIndex: 2,
        blackMove: 'Nc6',
        blackMoveIndex: 3,
      },
    ];

    it('does not show move list when there are no formatted moves', () => {
      render(<InlineBoardView {...defaultProps} formattedPgn={[]} />);

      fireEvent.click(screen.getByText('showBoard'));

      expect(screen.queryByText('1.')).not.toBeInTheDocument();
    });

    it('shows move list when there are formatted moves', () => {
      render(<InlineBoardView {...defaultProps} movesLength={4} formattedPgn={formattedPgn} />);

      fireEvent.click(screen.getByText('showBoard'));

      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('e4')).toBeInTheDocument();
      expect(screen.getByText('e5')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
      expect(screen.getByText('Nf3')).toBeInTheDocument();
      expect(screen.getByText('Nc6')).toBeInTheDocument();
    });

    it('calls onNavigateToPosition when a move is clicked', () => {
      const onNavigateToPosition = vi.fn();
      render(
        <InlineBoardView
          {...defaultProps}
          movesLength={4}
          formattedPgn={formattedPgn}
          onNavigateToPosition={onNavigateToPosition}
        />
      );

      fireEvent.click(screen.getByText('showBoard'));
      fireEvent.click(screen.getByText('Nf3'));

      expect(onNavigateToPosition).toHaveBeenCalledWith(2);
    });

    it('calls onNavigateToPosition for black moves', () => {
      const onNavigateToPosition = vi.fn();
      render(
        <InlineBoardView
          {...defaultProps}
          movesLength={4}
          formattedPgn={formattedPgn}
          onNavigateToPosition={onNavigateToPosition}
        />
      );

      fireEvent.click(screen.getByText('showBoard'));
      fireEvent.click(screen.getByText('Nc6'));

      expect(onNavigateToPosition).toHaveBeenCalledWith(3);
    });

    it('highlights the current position move', () => {
      render(
        <InlineBoardView
          {...defaultProps}
          movesLength={4}
          currentPosition={0}
          formattedPgn={formattedPgn}
        />
      );

      fireEvent.click(screen.getByText('showBoard'));

      // The 'e4' button at position 0 should have the highlighted class
      const e4Button = screen.getByText('e4');
      expect(e4Button.className).toContain('font-semibold');
    });

    it('does not highlight non-current position moves', () => {
      render(
        <InlineBoardView
          {...defaultProps}
          movesLength={4}
          currentPosition={0}
          formattedPgn={formattedPgn}
        />
      );

      fireEvent.click(screen.getByText('showBoard'));

      const nf3Button = screen.getByText('Nf3');
      expect(nf3Button.className).not.toContain('font-semibold');
    });
  });

  describe('edge cases', () => {
    it('renders correctly with a single white move (no black move)', () => {
      const singleMovePgn: FormattedPgnMove[] = [
        {
          moveNumber: 1,
          whiteMove: 'e4',
          whiteMoveIndex: 0,
          blackMove: undefined,
          blackMoveIndex: undefined,
        },
      ];

      render(<InlineBoardView {...defaultProps} movesLength={1} formattedPgn={singleMovePgn} />);

      fireEvent.click(screen.getByText('showBoard'));

      expect(screen.getByText('e4')).toBeInTheDocument();
      expect(screen.getByText('1.')).toBeInTheDocument();
    });

    it('does not show navigation controls when collapsed', () => {
      render(<InlineBoardView {...defaultProps} movesLength={4} />);

      // Don't open the accordion
      expect(screen.queryByLabelText('Go to start')).not.toBeInTheDocument();
    });

    it('renders move list without white move (shows ".." placeholder)', () => {
      const noWhiteMovePgn: FormattedPgnMove[] = [
        {
          moveNumber: 1,
          whiteMove: undefined,
          whiteMoveIndex: undefined,
          blackMove: 'e5',
          blackMoveIndex: 0,
        },
      ];

      render(<InlineBoardView {...defaultProps} movesLength={1} formattedPgn={noWhiteMovePgn} />);

      fireEvent.click(screen.getByText('showBoard'));

      expect(screen.getByText('..')).toBeInTheDocument();
      expect(screen.getByText('e5')).toBeInTheDocument();
    });
  });
});
