// @vitest-environment jsdom
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { ControlSettingsContent } from './ControlSettingsContent';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const defaultSettings: GamePreferences = {
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
  peekMode: 'modal',
  adsEnabled: true,
};

describe('ControlSettingsContent - peekMode', () => {
  describe('visibility', () => {
    it('shows the peek mode section when showBoardButtonInGame is true', () => {
      render(<ControlSettingsContent settings={defaultSettings} onSettingsChange={vi.fn()} />);

      expect(screen.getByText('controls.peekMode')).toBeInTheDocument();
      expect(screen.getByText('controls.peekModeDescription')).toBeInTheDocument();
    });

    it('hides the peek mode section when showBoardButtonInGame is false', () => {
      render(
        <ControlSettingsContent
          settings={{ ...defaultSettings, showBoardButtonInGame: false }}
          onSettingsChange={vi.fn()}
        />
      );

      expect(screen.queryByText('controls.peekMode')).not.toBeInTheDocument();
      expect(screen.queryByText('controls.peekModeDescription')).not.toBeInTheDocument();
    });
  });

  describe('segment control rendering', () => {
    it('renders both modal and inline options', () => {
      render(<ControlSettingsContent settings={defaultSettings} onSettingsChange={vi.fn()} />);

      expect(screen.getByText('controls.peekModes.modal')).toBeInTheDocument();
      expect(screen.getByText('controls.peekModes.inline')).toBeInTheDocument();
    });

    it('highlights the modal button when peekMode is "modal"', () => {
      render(
        <ControlSettingsContent
          settings={{ ...defaultSettings, peekMode: 'modal' }}
          onSettingsChange={vi.fn()}
        />
      );

      const modalButton = screen.getByText('controls.peekModes.modal');
      expect(modalButton.className).toContain('bg-primary');
    });

    it('highlights the inline button when peekMode is "inline"', () => {
      render(
        <ControlSettingsContent
          settings={{ ...defaultSettings, peekMode: 'inline' }}
          onSettingsChange={vi.fn()}
        />
      );

      const inlineButton = screen.getByText('controls.peekModes.inline');
      expect(inlineButton.className).toContain('bg-primary');
    });

    it('does not highlight modal button when peekMode is "inline"', () => {
      render(
        <ControlSettingsContent
          settings={{ ...defaultSettings, peekMode: 'inline' }}
          onSettingsChange={vi.fn()}
        />
      );

      const modalButton = screen.getByText('controls.peekModes.modal');
      expect(modalButton.className).not.toContain('bg-primary');
    });
  });

  describe('segment control interaction', () => {
    it('calls onSettingsChange with peekMode "inline" when inline button is clicked', () => {
      const onSettingsChange = vi.fn();
      render(
        <ControlSettingsContent
          settings={{ ...defaultSettings, peekMode: 'modal' }}
          onSettingsChange={onSettingsChange}
        />
      );

      fireEvent.click(screen.getByText('controls.peekModes.inline'));

      expect(onSettingsChange).toHaveBeenCalledWith({ peekMode: 'inline' });
    });

    it('calls onSettingsChange with peekMode "modal" when modal button is clicked', () => {
      const onSettingsChange = vi.fn();
      render(
        <ControlSettingsContent
          settings={{ ...defaultSettings, peekMode: 'inline' }}
          onSettingsChange={onSettingsChange}
        />
      );

      fireEvent.click(screen.getByText('controls.peekModes.modal'));

      expect(onSettingsChange).toHaveBeenCalledWith({ peekMode: 'modal' });
    });

    it('can click the already selected mode (idempotent)', () => {
      const onSettingsChange = vi.fn();
      render(
        <ControlSettingsContent
          settings={{ ...defaultSettings, peekMode: 'modal' }}
          onSettingsChange={onSettingsChange}
        />
      );

      fireEvent.click(screen.getByText('controls.peekModes.modal'));

      expect(onSettingsChange).toHaveBeenCalledWith({ peekMode: 'modal' });
    });
  });

  describe('divider', () => {
    it('shows a divider between peek mode and move input sections when showBoardButtonInGame is true', () => {
      const { container } = render(
        <ControlSettingsContent settings={defaultSettings} onSettingsChange={vi.fn()} />
      );

      const dividers = container.querySelectorAll('.border-t.border-border');
      expect(dividers.length).toBeGreaterThanOrEqual(1);
    });

    it('does not show the divider when showBoardButtonInGame is false', () => {
      const { container } = render(
        <ControlSettingsContent
          settings={{ ...defaultSettings, showBoardButtonInGame: false }}
          onSettingsChange={vi.fn()}
        />
      );

      // Only check direct child dividers of the space-y-8 container
      const spaceContainer = container.querySelector('.space-y-8');
      const dividers = spaceContainer?.querySelectorAll(':scope > .border-t.border-border') || [];
      expect(dividers.length).toBe(0);
    });
  });
});
