import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type StartMethod, StartMethodSelector } from './StartMethodSelector';

// Mock useTranslations
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

afterEach(() => {
  cleanup();
});

describe('StartMethodSelector', () => {
  describe('rendering', () => {
    it('renders all three start method options', () => {
      render(<StartMethodSelector value="new" onChange={() => {}} />);

      expect(screen.getByText('newGame')).toBeInTheDocument();
      expect(screen.getByText('fromPgn')).toBeInTheDocument();
      expect(screen.getByText('customPosition')).toBeInTheDocument();
    });

    it('renders descriptions for each option', () => {
      render(<StartMethodSelector value="new" onChange={() => {}} />);

      expect(screen.getByText('newGameDescription')).toBeInTheDocument();
      expect(screen.getByText('fromPgnDescription')).toBeInTheDocument();
      expect(screen.getByText('customPositionDescription')).toBeInTheDocument();
    });

    it('renders three buttons', () => {
      render(<StartMethodSelector value="new" onChange={() => {}} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });
  });

  describe('selection state', () => {
    it('shows check icon on the selected option (new)', () => {
      render(<StartMethodSelector value="new" onChange={() => {}} />);

      // The check icon is an SVG within the selected button
      const buttons = screen.getAllByRole('button');
      // First button (new) should have the check icon (an SVG with a path)
      const svgsInFirst = buttons[0].querySelectorAll('svg');
      expect(svgsInFirst.length).toBe(1);

      // Other buttons should not have check icon
      const svgsInSecond = buttons[1].querySelectorAll('svg');
      expect(svgsInSecond.length).toBe(0);
      const svgsInThird = buttons[2].querySelectorAll('svg');
      expect(svgsInThird.length).toBe(0);
    });

    it('shows check icon on pgn option when selected', () => {
      render(<StartMethodSelector value="pgn" onChange={() => {}} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons[0].querySelectorAll('svg').length).toBe(0);
      expect(buttons[1].querySelectorAll('svg').length).toBe(1);
      expect(buttons[2].querySelectorAll('svg').length).toBe(0);
    });

    it('shows check icon on position option when selected', () => {
      render(<StartMethodSelector value="position" onChange={() => {}} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons[0].querySelectorAll('svg').length).toBe(0);
      expect(buttons[1].querySelectorAll('svg').length).toBe(0);
      expect(buttons[2].querySelectorAll('svg').length).toBe(1);
    });

    it('applies active styling to the selected option', () => {
      render(<StartMethodSelector value="new" onChange={() => {}} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons[0].className).toContain('border-foreground');
      expect(buttons[1].className).not.toContain('border-foreground bg-foreground/10');
      expect(buttons[2].className).not.toContain('border-foreground bg-foreground/10');
    });
  });

  describe('interaction', () => {
    it('calls onChange with "new" when new game option is clicked', () => {
      const onChange = vi.fn();
      render(<StartMethodSelector value="pgn" onChange={onChange} />);

      fireEvent.click(screen.getByText('newGame'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('new');
    });

    it('calls onChange with "pgn" when PGN option is clicked', () => {
      const onChange = vi.fn();
      render(<StartMethodSelector value="new" onChange={onChange} />);

      fireEvent.click(screen.getByText('fromPgn'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('pgn');
    });

    it('calls onChange with "position" when custom position option is clicked', () => {
      const onChange = vi.fn();
      render(<StartMethodSelector value="new" onChange={onChange} />);

      fireEvent.click(screen.getByText('customPosition'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('position');
    });

    it('calls onChange even when clicking the already selected option', () => {
      const onChange = vi.fn();
      render(<StartMethodSelector value="new" onChange={onChange} />);

      fireEvent.click(screen.getByText('newGame'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('new');
    });
  });

  describe('StartMethod type coverage', () => {
    it('accepts all valid StartMethod values', () => {
      const methods: StartMethod[] = ['new', 'pgn', 'position'];
      methods.forEach((method) => {
        const { unmount } = render(<StartMethodSelector value={method} onChange={() => {}} />);
        unmount();
      });
    });
  });
});
