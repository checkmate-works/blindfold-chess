import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { ButtonInput } from './ButtonInput';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock useTranslations
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Helper to render with required providers
function renderWithProviders(ui: React.ReactElement) {
  return render(<GamePreferencesProvider>{ui}</GamePreferencesProvider>);
}

describe('ButtonInput UI Visibility', () => {
  const mockOnSubmit = vi.fn();
  const defaultProps = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    onSubmit: mockOnSubmit,
  };

  describe('Pawn Mode (Default)', () => {
    it('should show file buttons (a-h) initially', () => {
      renderWithProviders(<ButtonInput {...defaultProps} />);
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].forEach((file) => {
        expect(screen.getByRole('button', { name: file })).toBeInTheDocument();
      });
    });

    it('should NOT show rank buttons initially', () => {
      renderWithProviders(<ButtonInput {...defaultProps} />);
      ['1', '2', '3', '4', '5', '6', '7', '8'].forEach((rank) => {
        expect(screen.queryByRole('button', { name: rank })).not.toBeInTheDocument();
      });
    });

    describe('Promotion', () => {
      it('should toggle promotion UI only when reaching rank 1 or 8', () => {
        renderWithProviders(<ButtonInput {...defaultProps} />);

        // Select File 'e'
        fireEvent.click(screen.getByRole('button', { name: 'e' }));

        // Verify Ranks appeared
        const rank4 = screen.getByRole('button', { name: '4' });
        const rank8 = screen.getByRole('button', { name: '8' });
        expect(rank4).toBeInTheDocument();

        // Click Rank 4 (Normal move e4) -> No Promotion UI
        fireEvent.click(rank4);
        expect(screen.queryByText('=')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Q' })).not.toBeInTheDocument();

        // Change selection to Rank 8 (Move e8)
        fireEvent.click(rank8);

        // Assert Promotion UI IS visible
        expect(screen.getByText('=')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Q' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'N' })).toBeInTheDocument();
      });

      it('should HIDE Check (+) button during promotion selection, and SHOW it after piece selection', () => {
        renderWithProviders(<ButtonInput {...defaultProps} />);

        // e8 (Promotion pending)
        fireEvent.click(screen.getByRole('button', { name: 'e' }));
        fireEvent.click(screen.getByRole('button', { name: '8' }));

        // Check (+) should NOT be visible yet (must pick piece first)
        expect(screen.queryByText('+')).not.toBeInTheDocument();

        // Select Queen
        fireEvent.click(screen.getByRole('button', { name: 'Q' }));

        // NOW Check (+) should be visible
        expect(screen.getByText('+')).toBeInTheDocument();
      });
    });

    describe('Capture (x)', () => {
      it('should show Capture (x) only AFTER a file is selected in Pawn Mode', () => {
        renderWithProviders(<ButtonInput {...defaultProps} />);

        // Initially (No file) -> Hidden
        expect(screen.queryByText('x')).not.toBeInTheDocument();

        // Select File 'd'
        fireEvent.click(screen.getByRole('button', { name: 'd' }));

        // Now Visible
        expect(screen.getByText('x')).toBeInTheDocument();
      });
    });
  });

  describe('Castling', () => {
    it('should hide Files, Ranks, and Pieces when "O-O" is selected', () => {
      renderWithProviders(<ButtonInput {...defaultProps} />);

      const castleButton = screen.getByRole('button', { name: 'O-O' });
      fireEvent.click(castleButton);

      // Assert Files are GONE
      expect(screen.queryByRole('button', { name: 'a' })).not.toBeInTheDocument();

      // Assert Pieces are GONE
      expect(screen.queryByRole('button', { name: 'K' })).not.toBeInTheDocument();

      // Assert Preview shows castling
      const texts = screen.getAllByText('O-O');
      expect(texts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Piece Mode', () => {
    it('should still show Target File buttons when a piece is selected', () => {
      renderWithProviders(<ButtonInput {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'N' }));

      // Files should still be visible (target squares)
      expect(screen.getByRole('button', { name: 'f' })).toBeInTheDocument();
    });

    it('should ALWAYS show Capture (x) when a Piece is selected', () => {
      renderWithProviders(<ButtonInput {...defaultProps} />);

      // Select Piece 'B'
      fireEvent.click(screen.getByRole('button', { name: 'B' }));

      // Capture should be visible immediately
      expect(screen.getByText('x')).toBeInTheDocument();
    });

    describe('Disambiguation', () => {
      it('should show "Disambiguation..." button only when a Piece is selected', () => {
        renderWithProviders(<ButtonInput {...defaultProps} />);

        // Initial (Pawn mode) -> Hidden
        expect(screen.queryByText('disambiguationButton')).not.toBeInTheDocument();

        // Select Piece 'N'
        fireEvent.click(screen.getByRole('button', { name: 'N' }));

        // Assert it appears
        expect(screen.getByText('disambiguationButton')).toBeInTheDocument();

        // Test toggling the panel
        fireEvent.click(screen.getByText('disambiguationButton'));
        expect(screen.getByText('sourceLabel')).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    it('should Show/Hide Trash button based on input presence', () => {
      renderWithProviders(<ButtonInput {...defaultProps} />);

      // Initial -> No trash button (empty input)
      // Note: Trash button has title="Clear"
      expect(screen.queryByTitle('Clear')).not.toBeInTheDocument();

      // Select something
      fireEvent.click(screen.getByRole('button', { name: 'e' }));

      // Now visible
      const trashBtn = screen.getByTitle('Clear');
      expect(trashBtn).toBeInTheDocument();

      // Click Trash
      fireEvent.click(trashBtn);

      // Should be gone again
      expect(screen.queryByTitle('Clear')).not.toBeInTheDocument();
      // And selection reset
      expect(screen.queryByRole('button', { name: '4' })).not.toBeInTheDocument(); // ranks hidden implies reset
    });
  });
});
