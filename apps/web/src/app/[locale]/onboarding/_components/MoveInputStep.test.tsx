// @vitest-environment jsdom
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MoveInputStep } from './MoveInputStep';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock @blindfold-chess/icons
vi.mock('@blindfold-chess/icons', () => ({
  ChessPieceIcon: ({ type, color, size }: { type: string; color: string; size: number }) =>
    `<svg data-testid="chess-piece-${type}" data-color="${color}" data-size="${size}" />`,
}));

describe('MoveInputStep', () => {
  describe('rendering', () => {
    it('renders the title and description', () => {
      render(<MoveInputStep selectedModes={['button']} onToggleMode={vi.fn()} />);

      expect(screen.getByText('step1.title')).toBeInTheDocument();
      expect(screen.getByText('step1.description')).toBeInTheDocument();
    });

    it('renders all three mode options', () => {
      render(<MoveInputStep selectedModes={['button']} onToggleMode={vi.fn()} />);

      expect(screen.getByText('step1.modes.text.label')).toBeInTheDocument();
      expect(screen.getByText('step1.modes.text.description')).toBeInTheDocument();
      expect(screen.getByText('step1.modes.select.label')).toBeInTheDocument();
      expect(screen.getByText('step1.modes.select.description')).toBeInTheDocument();
      expect(screen.getByText('step1.modes.button.label')).toBeInTheDocument();
      expect(screen.getByText('step1.modes.button.description')).toBeInTheDocument();
    });

    it('renders hint texts below the options', () => {
      render(<MoveInputStep selectedModes={['button']} onToggleMode={vi.fn()} />);

      expect(screen.getByText('step1.hint.multiSelect')).toBeInTheDocument();
      expect(screen.getByText('step1.hint.changeLater')).toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('highlights selected modes with primary border', () => {
      render(<MoveInputStep selectedModes={['text', 'button']} onToggleMode={vi.fn()} />);

      const textButton = screen.getByText('step1.modes.text.label').closest('button')!;
      const selectButton = screen.getByText('step1.modes.select.label').closest('button')!;
      const buttonButton = screen.getByText('step1.modes.button.label').closest('button')!;

      expect(textButton.className).toContain('border-primary');
      expect(selectButton.className).not.toContain('border-primary');
      expect(buttonButton.className).toContain('border-primary');
    });

    it('highlights all modes when all are selected', () => {
      render(<MoveInputStep selectedModes={['text', 'select', 'button']} onToggleMode={vi.fn()} />);

      const textButton = screen.getByText('step1.modes.text.label').closest('button')!;
      const selectButton = screen.getByText('step1.modes.select.label').closest('button')!;
      const buttonButton = screen.getByText('step1.modes.button.label').closest('button')!;

      expect(textButton.className).toContain('border-primary');
      expect(selectButton.className).toContain('border-primary');
      expect(buttonButton.className).toContain('border-primary');
    });

    it('highlights only a single mode when one is selected', () => {
      render(<MoveInputStep selectedModes={['select']} onToggleMode={vi.fn()} />);

      const textButton = screen.getByText('step1.modes.text.label').closest('button')!;
      const selectButton = screen.getByText('step1.modes.select.label').closest('button')!;
      const buttonButton = screen.getByText('step1.modes.button.label').closest('button')!;

      expect(textButton.className).not.toContain('border-primary');
      expect(selectButton.className).toContain('border-primary');
      expect(buttonButton.className).not.toContain('border-primary');
    });

    it('shows the checkbox indicator for selected modes only', () => {
      const { container } = render(
        <MoveInputStep selectedModes={['text']} onToggleMode={vi.fn()} />
      );

      // The checkbox indicators use rounded-sm instead of rounded-full
      const checkboxIndicators = container.querySelectorAll('.rounded-sm.border-2');
      expect(checkboxIndicators.length).toBe(3);

      // Only one should have the primary border
      const selectedCheckboxes = container.querySelectorAll('.rounded-sm.border-2.border-primary');
      expect(selectedCheckboxes.length).toBe(1);
    });

    it('shows checkbox indicators for multiple selected modes', () => {
      const { container } = render(
        <MoveInputStep selectedModes={['text', 'button']} onToggleMode={vi.fn()} />
      );

      const selectedCheckboxes = container.querySelectorAll('.rounded-sm.border-2.border-primary');
      expect(selectedCheckboxes.length).toBe(2);
    });
  });

  describe('interaction', () => {
    it('calls onToggleMode with "text" when text option is clicked', () => {
      const onToggleMode = vi.fn();
      render(<MoveInputStep selectedModes={['button']} onToggleMode={onToggleMode} />);

      const textButton = screen.getByText('step1.modes.text.label').closest('button')!;
      fireEvent.click(textButton);

      expect(onToggleMode).toHaveBeenCalledWith('text');
    });

    it('calls onToggleMode with "select" when select option is clicked', () => {
      const onToggleMode = vi.fn();
      render(<MoveInputStep selectedModes={['button']} onToggleMode={onToggleMode} />);

      const selectButton = screen.getByText('step1.modes.select.label').closest('button')!;
      fireEvent.click(selectButton);

      expect(onToggleMode).toHaveBeenCalledWith('select');
    });

    it('calls onToggleMode with "button" when button option is clicked', () => {
      const onToggleMode = vi.fn();
      render(<MoveInputStep selectedModes={['text']} onToggleMode={onToggleMode} />);

      const buttonButton = screen.getByText('step1.modes.button.label').closest('button')!;
      fireEvent.click(buttonButton);

      expect(onToggleMode).toHaveBeenCalledWith('button');
    });

    it('calls onToggleMode even when clicking an already selected mode', () => {
      const onToggleMode = vi.fn();
      render(<MoveInputStep selectedModes={['button']} onToggleMode={onToggleMode} />);

      const buttonButton = screen.getByText('step1.modes.button.label').closest('button')!;
      fireEvent.click(buttonButton);

      expect(onToggleMode).toHaveBeenCalledWith('button');
    });

    it('does not call onToggleMode without user interaction', () => {
      const onToggleMode = vi.fn();
      render(<MoveInputStep selectedModes={['button']} onToggleMode={onToggleMode} />);

      expect(onToggleMode).not.toHaveBeenCalled();
    });
  });

  describe('preview display', () => {
    it('shows preview for all selected modes', () => {
      render(<MoveInputStep selectedModes={['text', 'button']} onToggleMode={vi.fn()} />);

      // Both selected modes should show preview labels
      const previewLabels = screen.getAllByText('step1.preview.label');
      expect(previewLabels.length).toBe(2);
    });

    it('does not show preview for unselected modes', () => {
      render(<MoveInputStep selectedModes={['text']} onToggleMode={vi.fn()} />);

      // Only one preview should be shown
      const previewLabels = screen.getAllByText('step1.preview.label');
      expect(previewLabels.length).toBe(1);
    });
  });

  describe('label text styling', () => {
    it('applies primary text color to selected mode labels', () => {
      render(<MoveInputStep selectedModes={['text', 'button']} onToggleMode={vi.fn()} />);

      const textLabel = screen.getByText('step1.modes.text.label');
      const buttonLabel = screen.getByText('step1.modes.button.label');
      expect(textLabel.className).toContain('text-primary');
      expect(buttonLabel.className).toContain('text-primary');
    });

    it('applies foreground text color to non-selected mode labels', () => {
      render(<MoveInputStep selectedModes={['text']} onToggleMode={vi.fn()} />);

      const selectLabel = screen.getByText('step1.modes.select.label');
      expect(selectLabel.className).toContain('text-foreground');
    });
  });
});
