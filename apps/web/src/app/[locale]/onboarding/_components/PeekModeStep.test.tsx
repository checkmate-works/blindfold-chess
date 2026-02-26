// @vitest-environment jsdom
import React from 'react';

import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PeekModeStep } from './PeekModeStep';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock react-icons/fa
vi.mock('react-icons/fa', () => ({
  FaWindowMaximize: () => React.createElement('span', { 'data-testid': 'icon-window-maximize' }),
  FaChevronDown: () => React.createElement('span', { 'data-testid': 'icon-chevron-down' }),
  FaEye: () => React.createElement('span', { 'data-testid': 'icon-eye' }),
}));

describe('PeekModeStep', () => {
  describe('rendering', () => {
    it('renders the title and description', () => {
      render(<PeekModeStep selectedMode="modal" onSelectMode={vi.fn()} />);

      expect(screen.getByText('step2.title')).toBeInTheDocument();
      expect(screen.getByText('step2.description')).toBeInTheDocument();
    });

    it('renders both peek mode options', () => {
      render(<PeekModeStep selectedMode="modal" onSelectMode={vi.fn()} />);

      expect(screen.getByText('step2.modes.modal.label')).toBeInTheDocument();
      expect(screen.getByText('step2.modes.modal.description')).toBeInTheDocument();
      expect(screen.getByText('step2.modes.inline.label')).toBeInTheDocument();
      expect(screen.getByText('step2.modes.inline.description')).toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('highlights modal mode when selected', () => {
      render(<PeekModeStep selectedMode="modal" onSelectMode={vi.fn()} />);

      const modalOption = screen.getByText('step2.modes.modal.label').closest('button')!;
      const inlineOption = screen.getByText('step2.modes.inline.label').closest('button')!;

      expect(modalOption.className).toContain('border-primary');
      expect(inlineOption.className).not.toContain('border-primary');
    });

    it('highlights inline mode when selected', () => {
      render(<PeekModeStep selectedMode="inline" onSelectMode={vi.fn()} />);

      const modalOption = screen.getByText('step2.modes.modal.label').closest('button')!;
      const inlineOption = screen.getByText('step2.modes.inline.label').closest('button')!;

      expect(modalOption.className).not.toContain('border-primary');
      expect(inlineOption.className).toContain('border-primary');
    });

    it('shows radio indicator (filled circle) only for selected mode', () => {
      const { container } = render(<PeekModeStep selectedMode="modal" onSelectMode={vi.fn()} />);

      // Radio indicators use rounded-full border-2
      const radioIndicators = container.querySelectorAll('.rounded-full.border-2');
      expect(radioIndicators.length).toBe(2);

      // Only the selected one should have border-primary
      const selectedRadios = container.querySelectorAll('.rounded-full.border-2.border-primary');
      expect(selectedRadios.length).toBe(1);
    });

    it('shows preview only for the selected mode', () => {
      render(<PeekModeStep selectedMode="modal" onSelectMode={vi.fn()} />);

      // Only one preview label should be shown (for the selected mode)
      const previewLabels = screen.getAllByText('step2.preview.label');
      expect(previewLabels.length).toBe(1);
    });

    it('shows preview for inline mode when inline is selected', () => {
      render(<PeekModeStep selectedMode="inline" onSelectMode={vi.fn()} />);

      const previewLabels = screen.getAllByText('step2.preview.label');
      expect(previewLabels.length).toBe(1);
    });
  });

  describe('interaction', () => {
    it('calls onSelectMode with "modal" when modal option is clicked', () => {
      const onSelectMode = vi.fn();
      render(<PeekModeStep selectedMode="inline" onSelectMode={onSelectMode} />);

      const modalOption = screen.getByText('step2.modes.modal.label').closest('button')!;
      fireEvent.click(modalOption);

      expect(onSelectMode).toHaveBeenCalledWith('modal');
    });

    it('calls onSelectMode with "inline" when inline option is clicked', () => {
      const onSelectMode = vi.fn();
      render(<PeekModeStep selectedMode="modal" onSelectMode={onSelectMode} />);

      const inlineOption = screen.getByText('step2.modes.inline.label').closest('button')!;
      fireEvent.click(inlineOption);

      expect(onSelectMode).toHaveBeenCalledWith('inline');
    });

    it('calls onSelectMode even when clicking the already selected mode', () => {
      const onSelectMode = vi.fn();
      render(<PeekModeStep selectedMode="modal" onSelectMode={onSelectMode} />);

      const modalOption = screen.getByText('step2.modes.modal.label').closest('button')!;
      fireEvent.click(modalOption);

      expect(onSelectMode).toHaveBeenCalledWith('modal');
    });

    it('does not call onSelectMode without user interaction', () => {
      const onSelectMode = vi.fn();
      render(<PeekModeStep selectedMode="modal" onSelectMode={onSelectMode} />);

      expect(onSelectMode).not.toHaveBeenCalled();
    });
  });

  describe('label text styling', () => {
    it('applies primary text color to the selected mode label', () => {
      render(<PeekModeStep selectedMode="modal" onSelectMode={vi.fn()} />);

      const modalLabel = screen.getByText('step2.modes.modal.label');
      expect(modalLabel.className).toContain('text-primary');
    });

    it('applies foreground text color to non-selected mode label', () => {
      render(<PeekModeStep selectedMode="modal" onSelectMode={vi.fn()} />);

      const inlineLabel = screen.getByText('step2.modes.inline.label');
      expect(inlineLabel.className).toContain('text-foreground');
    });
  });

  describe('icon styling', () => {
    it('applies primary text color to selected mode icon container', () => {
      const { container } = render(<PeekModeStep selectedMode="modal" onSelectMode={vi.fn()} />);

      // Get all icon containers (text-2xl elements)
      const iconContainers = container.querySelectorAll('.text-2xl');
      expect(iconContainers.length).toBe(2);

      // First option (modal) should have text-primary
      expect(iconContainers[0].className).toContain('text-primary');
      // Second option (inline) should have text-muted-foreground
      expect(iconContainers[1].className).toContain('text-muted-foreground');
    });
  });
});
