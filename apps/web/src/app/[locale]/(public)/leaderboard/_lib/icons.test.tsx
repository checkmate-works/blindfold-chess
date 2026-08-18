import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getLeaderboardIcon } from './icons';

vi.mock('@blindfold-chess/icons', () => ({
  ChessPieceIcon: ({ type, color, size }: { type: string; color: string; size: number }) => (
    <svg data-testid="chess-piece-icon" data-type={type} data-color={color} data-size={size} />
  ),
}));

vi.mock('react-icons/fa', () => ({
  FaQuestion: ({ className }: { className?: string }) => (
    <span data-testid="fa-question" className={className}>
      ?
    </span>
  ),
}));

vi.mock('@/app/[locale]/(public)/practice/_lib/practice-emojis', () => ({
  PRACTICE_EMOJIS: {
    coordinate_quiz: '\u{1F3AF}',
    legal_moves: '\u265F\uFE0F',
    square_colors: '\u{1F3A8}',
    diagonal_quiz: '\u2197\uFE0F',
    board_symmetry: '\u{1F98B}',
    route_planner: '\u{1F4CD}',
  },
}));

describe('getLeaderboardIcon', () => {
  describe('piece keys', () => {
    it.each([
      ['king', 'k'],
      ['queen', 'q'],
      ['rook', 'r'],
      ['bishop', 'b'],
      ['knight', 'n'],
    ])('should return ChessPieceIcon for "%s" (pieceType=%s)', (key, expectedType) => {
      render(<>{getLeaderboardIcon('coordinate_quiz', key)}</>);

      const icon = screen.getByTestId('chess-piece-icon');
      expect(icon).toHaveAttribute('data-type', expectedType);
      expect(icon).toHaveAttribute('data-color', 'w');
    });

    it('should use sm size (24) by default for piece keys', () => {
      render(<>{getLeaderboardIcon('legal_moves', 'knight')}</>);

      expect(screen.getByTestId('chess-piece-icon')).toHaveAttribute('data-size', '24');
    });

    it('should use lg size (48) when size is "lg" for piece keys', () => {
      render(<>{getLeaderboardIcon('legal_moves', 'knight', 'lg')}</>);

      expect(screen.getByTestId('chess-piece-icon')).toHaveAttribute('data-size', '48');
    });
  });

  describe('random key', () => {
    it('should return FaQuestion icon for "random"', () => {
      render(<>{getLeaderboardIcon('coordinate_quiz', 'random')}</>);

      expect(screen.getByTestId('fa-question')).toBeInTheDocument();
    });

    it('should use sm class by default for random', () => {
      render(<>{getLeaderboardIcon('coordinate_quiz', 'random')}</>);

      expect(screen.getByTestId('fa-question')).toHaveClass('w-5', 'h-5');
    });

    it('should use lg class when size is "lg" for random', () => {
      render(<>{getLeaderboardIcon('coordinate_quiz', 'random', 'lg')}</>);

      expect(screen.getByTestId('fa-question')).toHaveClass('w-10', 'h-10');
    });
  });

  describe('default / fallback key', () => {
    it('should return emoji span for "default" key', () => {
      render(<>{getLeaderboardIcon('coordinate_quiz', 'default')}</>);

      expect(screen.getByText('\u{1F3AF}')).toBeInTheDocument();
    });

    it('should return emoji span for unknown (non-piece, non-random) keys', () => {
      render(<>{getLeaderboardIcon('square_colors', 'something_else')}</>);

      expect(screen.getByText('\u{1F3A8}')).toBeInTheDocument();
    });

    it('should use sm class by default for emoji', () => {
      const { container } = render(<>{getLeaderboardIcon('coordinate_quiz', 'default')}</>);

      const span = container.querySelector('span');
      expect(span).toHaveClass('text-2xl', 'leading-none');
    });

    it('should use lg class when size is "lg" for emoji', () => {
      const { container } = render(<>{getLeaderboardIcon('coordinate_quiz', 'default', 'lg')}</>);

      const span = container.querySelector('span');
      expect(span).toHaveClass('text-3xl', 'leading-none');
    });
  });

  describe('module emoji mapping', () => {
    it.each([
      ['coordinate_quiz', '\u{1F3AF}'],
      ['legal_moves', '\u265F\uFE0F'],
      ['square_colors', '\u{1F3A8}'],
      ['diagonal_quiz', '\u2197\uFE0F'],
      ['board_symmetry', '\u{1F98B}'],
      ['route_planner', '\u{1F4CD}'],
    ] as const)('should show correct emoji for module "%s"', (module, emoji) => {
      render(<>{getLeaderboardIcon(module, 'default')}</>);

      expect(screen.getByText(emoji)).toBeInTheDocument();
    });
  });
});
