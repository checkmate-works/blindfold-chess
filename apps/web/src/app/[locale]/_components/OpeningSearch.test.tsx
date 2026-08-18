import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Opening } from './OpeningSearch';
import { OpeningSearch } from './OpeningSearch';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const sampleOpenings: Opening[] = [
  {
    slug: 'sicilian-defense',
    name: 'Sicilian Defense',
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    ecoCode: 'B20',
    pgn: '1. e4 c5',
    translatedName: 'シシリアン・ディフェンス',
  },
  {
    slug: 'french-defense',
    name: 'French Defense',
    fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    ecoCode: 'C00',
    pgn: '1. e4 e6',
    translatedName: 'フレンチ・ディフェンス',
  },
  {
    slug: 'ruy-lopez',
    name: 'Ruy Lopez',
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    ecoCode: 'C60',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
    translatedName: 'ルイ・ロペス',
  },
];

describe('OpeningSearch', () => {
  const defaultProps = {
    openings: sampleOpenings,
    selectedSlug: '',
    onSelect: vi.fn(),
  };

  describe('rendering', () => {
    it('should render the search input', () => {
      render(<OpeningSearch {...defaultProps} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render all openings when no search term is entered', () => {
      render(<OpeningSearch {...defaultProps} />);
      const listbox = screen.getByRole('listbox');
      const options = screen.getAllByRole('option');
      expect(listbox).toBeInTheDocument();
      expect(options).toHaveLength(3);
    });

    it('should display translated names for each opening', () => {
      render(<OpeningSearch {...defaultProps} />);
      expect(screen.getByText('シシリアン・ディフェンス')).toBeInTheDocument();
      expect(screen.getByText('フレンチ・ディフェンス')).toBeInTheDocument();
      expect(screen.getByText('ルイ・ロペス')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('should filter by translated name', () => {
      render(<OpeningSearch {...defaultProps} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'シシリアン' } });

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(screen.getByText('シシリアン・ディフェンス')).toBeInTheDocument();
    });

    it('should filter by English name', () => {
      render(<OpeningSearch {...defaultProps} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'Ruy' } });

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(screen.getByText('ルイ・ロペス')).toBeInTheDocument();
    });

    it('should filter by slug', () => {
      render(<OpeningSearch {...defaultProps} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'french-defense' } });

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(screen.getByText('フレンチ・ディフェンス')).toBeInTheDocument();
    });

    it('should be case-insensitive', () => {
      render(<OpeningSearch {...defaultProps} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'SICILIAN' } });

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(screen.getByText('シシリアン・ディフェンス')).toBeInTheDocument();
    });

    it('should show multiple results when search term matches multiple openings', () => {
      render(<OpeningSearch {...defaultProps} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'defense' } });

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
      expect(screen.getByText('シシリアン・ディフェンス')).toBeInTheDocument();
      expect(screen.getByText('フレンチ・ディフェンス')).toBeInTheDocument();
    });

    it('should show no results when search term does not match', () => {
      render(<OpeningSearch {...defaultProps} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'xyz-nonexistent' } });

      expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('should show all openings when search is cleared', () => {
      render(<OpeningSearch {...defaultProps} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'sicilian' } });
      expect(screen.getAllByRole('option')).toHaveLength(1);

      fireEvent.change(input, { target: { value: '' } });
      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('should treat whitespace-only input as empty and show all openings', () => {
      render(<OpeningSearch {...defaultProps} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: '   ' } });

      expect(screen.getAllByRole('option')).toHaveLength(3);
    });
  });

  describe('selection', () => {
    it('should call onSelect when an opening is clicked', () => {
      const onSelect = vi.fn();
      render(<OpeningSearch {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByText('シシリアン・ディフェンス'));

      expect(onSelect).toHaveBeenCalledWith('sicilian-defense');
    });

    it('should mark the selected opening with aria-selected', () => {
      render(<OpeningSearch {...defaultProps} selectedSlug="french-defense" />);

      const frenchOption = screen.getByText('フレンチ・ディフェンス').closest('[role="option"]');
      const sicilianOption = screen
        .getByText('シシリアン・ディフェンス')
        .closest('[role="option"]');

      expect(frenchOption).toHaveAttribute('aria-selected', 'true');
      expect(sicilianOption).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('empty state', () => {
    it('should render without errors when openings list is empty', () => {
      render(<OpeningSearch openings={[]} selectedSlug="" onSelect={vi.fn()} />);

      expect(screen.queryAllByRole('option')).toHaveLength(0);
    });
  });
});
