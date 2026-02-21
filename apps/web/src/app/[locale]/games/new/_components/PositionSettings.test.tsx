import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type CastlingRights, PositionSettings } from './PositionSettings';

// Mock useTranslations
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

afterEach(() => {
  cleanup();
});

const defaultCastling: CastlingRights = { K: false, Q: false, k: false, q: false };
const allAvailable: CastlingRights = { K: true, Q: true, k: true, q: true };

function renderPositionSettings(
  overrides: Partial<React.ComponentProps<typeof PositionSettings>> = {}
) {
  const props = {
    turn: 'w' as const,
    castling: defaultCastling,
    castlingAvailability: allAvailable,
    onCastlingChange: vi.fn(),
    enPassant: '-',
    onEnPassantChange: vi.fn(),
    ...overrides,
  };
  const result = render(<PositionSettings {...props} />);
  return { ...result, props };
}

describe('PositionSettings', () => {
  describe('castling rights', () => {
    it('renders all four castling checkboxes', () => {
      renderPositionSettings();

      expect(screen.getByText('whiteKingside')).toBeInTheDocument();
      expect(screen.getByText('whiteQueenside')).toBeInTheDocument();
      expect(screen.getByText('blackKingside')).toBeInTheDocument();
      expect(screen.getByText('blackQueenside')).toBeInTheDocument();
    });

    it('renders checkboxes as unchecked when all castling rights are false', () => {
      renderPositionSettings({ castling: { K: false, Q: false, k: false, q: false } });

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4);
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it('renders checkboxes as checked when all castling rights are true', () => {
      renderPositionSettings({ castling: { K: true, Q: true, k: true, q: true } });

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });

    it('toggles individual castling rights independently', () => {
      const { props } = renderPositionSettings({
        castling: { K: false, Q: false, k: false, q: false },
      });

      // Click the first checkbox (white kingside)
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      expect(props.onCastlingChange).toHaveBeenCalledTimes(1);
      expect(props.onCastlingChange).toHaveBeenCalledWith({
        K: true,
        Q: false,
        k: false,
        q: false,
      });
    });

    it('unchecks a castling right that is currently checked', () => {
      const { props } = renderPositionSettings({
        castling: { K: true, Q: false, k: false, q: false },
      });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // Uncheck K

      expect(props.onCastlingChange).toHaveBeenCalledWith({
        K: false,
        Q: false,
        k: false,
        q: false,
      });
    });

    it('toggles black queenside independently', () => {
      const { props } = renderPositionSettings({
        castling: { K: true, Q: true, k: true, q: false },
      });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[3]); // Click q checkbox

      expect(props.onCastlingChange).toHaveBeenCalledWith({
        K: true,
        Q: true,
        k: true,
        q: true,
      });
    });

    it('disables checkboxes when castling is unavailable', () => {
      renderPositionSettings({
        castlingAvailability: { K: false, Q: false, k: true, q: true },
      });

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeDisabled(); // K
      expect(checkboxes[1]).toBeDisabled(); // Q
      expect(checkboxes[2]).not.toBeDisabled(); // k
      expect(checkboxes[3]).not.toBeDisabled(); // q
    });

    it('applies reduced opacity to labels of unavailable castling rights', () => {
      renderPositionSettings({
        castlingAvailability: { K: false, Q: true, k: true, q: true },
      });

      const labels = screen.getAllByText(/Kingside|Queenside/i).map((el) => el.closest('label')!);

      expect(labels[0].className).toContain('opacity-50');
      expect(labels[1].className).not.toContain('opacity-50');
    });
  });

  describe('en passant selector', () => {
    it('renders a select with "none" option', () => {
      renderPositionSettings();

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('none')).toBeInTheDocument();
    });

    it('shows rank 6 squares for white turn', () => {
      renderPositionSettings({ turn: 'w' });

      const select = screen.getByRole('combobox');
      const options = within(select).getAllByRole('option');

      // "none" + 8 files on rank 6
      expect(options).toHaveLength(9);
      expect(options[0]).toHaveTextContent('none');
      expect(options[1]).toHaveTextContent('a6');
      expect(options[2]).toHaveTextContent('b6');
      expect(options[3]).toHaveTextContent('c6');
      expect(options[4]).toHaveTextContent('d6');
      expect(options[5]).toHaveTextContent('e6');
      expect(options[6]).toHaveTextContent('f6');
      expect(options[7]).toHaveTextContent('g6');
      expect(options[8]).toHaveTextContent('h6');
    });

    it('shows rank 3 squares for black turn', () => {
      renderPositionSettings({ turn: 'b' });

      const select = screen.getByRole('combobox');
      const options = within(select).getAllByRole('option');

      // "none" + 8 files on rank 3
      expect(options).toHaveLength(9);
      expect(options[0]).toHaveTextContent('none');
      expect(options[1]).toHaveTextContent('a3');
      expect(options[2]).toHaveTextContent('b3');
      expect(options[3]).toHaveTextContent('c3');
      expect(options[4]).toHaveTextContent('d3');
      expect(options[5]).toHaveTextContent('e3');
      expect(options[6]).toHaveTextContent('f3');
      expect(options[7]).toHaveTextContent('g3');
      expect(options[8]).toHaveTextContent('h3');
    });

    it('calls onEnPassantChange when a square is selected', () => {
      const { props } = renderPositionSettings({ turn: 'w' });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'e6' } });

      expect(props.onEnPassantChange).toHaveBeenCalledTimes(1);
      expect(props.onEnPassantChange).toHaveBeenCalledWith('e6');
    });

    it('calls onEnPassantChange with "-" when none is selected', () => {
      const { props } = renderPositionSettings({ turn: 'w', enPassant: 'e6' });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '-' } });

      expect(props.onEnPassantChange).toHaveBeenCalledWith('-');
    });

    it('displays the current en passant value', () => {
      renderPositionSettings({ turn: 'w', enPassant: 'd6' });

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('d6');
    });
  });
});
