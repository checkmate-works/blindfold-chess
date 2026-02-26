// @vitest-environment jsdom
import React from 'react';

import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { OnboardingClient } from './OnboardingClient';

expect.extend(matchers);

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock react-icons used by MoveInputStep
vi.mock('react-icons/fa', () => ({
  FaKeyboard: () => React.createElement('span', { 'data-testid': 'icon-keyboard' }),
  FaList: () => React.createElement('span', { 'data-testid': 'icon-list' }),
  FaThLarge: () => React.createElement('span', { 'data-testid': 'icon-grid' }),
  FaChevronDown: () => React.createElement('span', { 'data-testid': 'icon-chevron-down' }),
}));

// Mock @blindfold-chess/icons used by MoveInputStep
vi.mock('@blindfold-chess/icons', () => ({
  ChessPieceIcon: ({ type, color, size }: { type: string; color: string; size: number }) =>
    React.createElement('svg', {
      'data-testid': `chess-piece-${type}`,
      'data-color': color,
      'data-size': size,
    }),
}));

function renderWithProviders(locale = 'en') {
  return render(
    <GamePreferencesProvider>
      <OnboardingClient locale={locale} />
    </GamePreferencesProvider>
  );
}

describe('OnboardingClient', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  describe('initial rendering', () => {
    it('renders the step indicator', () => {
      renderWithProviders();

      // Step indicator should show step number "1"
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders the MoveInputStep content', () => {
      renderWithProviders();

      expect(screen.getByText('step1.title')).toBeInTheDocument();
      expect(screen.getByText('step1.description')).toBeInTheDocument();
    });

    it('renders skip button', () => {
      renderWithProviders();

      expect(screen.getByText('skip')).toBeInTheDocument();
    });

    it('renders finish button on the last step (single step = last step)', () => {
      renderWithProviders();

      // With only one step, it's both first and last, so it should show "finish"
      expect(screen.getByText('finish')).toBeInTheDocument();
    });

    it('does not render back button on the first step', () => {
      renderWithProviders();

      expect(screen.queryByText('back')).not.toBeInTheDocument();
    });

    it('renders all three move input mode options', () => {
      renderWithProviders();

      expect(screen.getByText('step1.modes.text.label')).toBeInTheDocument();
      expect(screen.getByText('step1.modes.select.label')).toBeInTheDocument();
      expect(screen.getByText('step1.modes.button.label')).toBeInTheDocument();
    });
  });

  describe('default selection', () => {
    it('defaults to only button mode selected', () => {
      renderWithProviders();

      const textOption = screen.getByText('step1.modes.text.label').closest('button')!;
      const selectOption = screen.getByText('step1.modes.select.label').closest('button')!;
      const buttonOption = screen.getByText('step1.modes.button.label').closest('button')!;

      expect(textOption.className).not.toContain('border-primary');
      expect(selectOption.className).not.toContain('border-primary');
      expect(buttonOption.className).toContain('border-primary');
    });
  });

  describe('mode toggling', () => {
    it('allows selecting additional modes', () => {
      renderWithProviders();

      // Only button is initially selected; select "text"
      const textOption = screen.getByText('step1.modes.text.label').closest('button')!;
      fireEvent.click(textOption);

      expect(textOption.className).toContain('border-primary');

      // Button should remain selected
      const buttonOption = screen.getByText('step1.modes.button.label').closest('button')!;
      expect(buttonOption.className).toContain('border-primary');
    });

    it('allows deselecting a mode when multiple are selected', () => {
      renderWithProviders();

      // Select "text" in addition to default "button"
      const textOption = screen.getByText('step1.modes.text.label').closest('button')!;
      fireEvent.click(textOption);
      expect(textOption.className).toContain('border-primary');

      // Deselect "text"
      fireEvent.click(textOption);
      expect(textOption.className).not.toContain('border-primary');
    });

    it('prevents deselecting the last remaining mode', () => {
      renderWithProviders();

      // Only "button" is selected by default; try to deselect it
      const buttonOption = screen.getByText('step1.modes.button.label').closest('button')!;
      fireEvent.click(buttonOption);

      // "button" should still be selected
      expect(buttonOption.className).toContain('border-primary');
    });
  });

  describe('skip button', () => {
    it('navigates to /en/play when skip is clicked (en locale)', () => {
      renderWithProviders('en');

      fireEvent.click(screen.getByText('skip'));

      expect(mockPush).toHaveBeenCalledWith('/en/play');
    });

    it('navigates to /ja/play when skip is clicked (ja locale)', () => {
      renderWithProviders('ja');

      fireEvent.click(screen.getByText('skip'));

      expect(mockPush).toHaveBeenCalledWith('/ja/play');
    });

    it('does not save preferences when skip is clicked', async () => {
      renderWithProviders();

      // Select additional "text" mode
      const textOption = screen.getByText('step1.modes.text.label').closest('button')!;
      fireEvent.click(textOption);

      // Click skip
      fireEvent.click(screen.getByText('skip'));

      // Wait for any potential effects
      await vi.waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/en/play');
      });

      // The preference should NOT have been saved via skip
      // (skip just navigates, it doesn't call saveCurrentStepPreferences)
      const stored = localStorage.getItem('blindfold-chess-game-preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        // If anything was stored, enabledMoveInputModes should still be the default (all three)
        expect(parsed.enabledMoveInputModes).toEqual(['text', 'select', 'button']);
      }
    });
  });

  describe('finish button (single step)', () => {
    it('navigates to /en/play when finish is clicked', () => {
      renderWithProviders('en');

      fireEvent.click(screen.getByText('finish'));

      expect(mockPush).toHaveBeenCalledWith('/en/play');
    });

    it('navigates to /ja/play when finish is clicked (ja locale)', () => {
      renderWithProviders('ja');

      fireEvent.click(screen.getByText('finish'));

      expect(mockPush).toHaveBeenCalledWith('/ja/play');
    });

    it('saves the selected modes to preferences on finish', async () => {
      renderWithProviders();

      // Select additional "text" mode (button is already selected)
      const textOption = screen.getByText('step1.modes.text.label').closest('button')!;
      fireEvent.click(textOption);

      // Click finish
      fireEvent.click(screen.getByText('finish'));

      // Wait for the preference save effect to run
      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.enabledMoveInputModes).toEqual(['button', 'text']);
        // moveInputMode should be the first selected mode
        expect(parsed.moveInputMode).toBe('button');
      });
    });

    it('saves only button mode on finish without changes (default)', async () => {
      renderWithProviders();

      // Don't change selection, just click finish
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.enabledMoveInputModes).toEqual(['button']);
        expect(parsed.moveInputMode).toBe('button');
      });
    });
  });

  describe('preferences persistence', () => {
    it('does not overwrite other preferences when saving enabledMoveInputModes', async () => {
      // Pre-populate with some existing preferences
      localStorage.setItem(
        'blindfold-chess-game-preferences',
        JSON.stringify({
          showCoordinates: false,
          moveInputMode: 'button',
          enabledMoveInputModes: ['text', 'select', 'button'],
          peekMode: 'inline',
        })
      );

      renderWithProviders();

      // Wait for initial load
      await vi.waitFor(() => {
        // Verify it loaded
        expect(localStorage.getItem('blindfold-chess-game-preferences')).toBeTruthy();
      });

      // Select additional "select" mode (button is default)
      const selectOption = screen.getByText('step1.modes.select.label').closest('button')!;
      fireEvent.click(selectOption);

      // Click finish
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        const parsed = JSON.parse(stored!);
        expect(parsed.enabledMoveInputModes).toEqual(['button', 'select']);
        // Other preferences should be preserved
        expect(parsed.showCoordinates).toBe(false);
        expect(parsed.peekMode).toBe('inline');
      });
    });
  });

  describe('locale handling', () => {
    it('passes locale correctly to navigation on finish', () => {
      renderWithProviders('fr');

      fireEvent.click(screen.getByText('finish'));

      expect(mockPush).toHaveBeenCalledWith('/fr/play');
    });

    it('passes locale correctly to navigation on skip', () => {
      renderWithProviders('de');

      fireEvent.click(screen.getByText('skip'));

      expect(mockPush).toHaveBeenCalledWith('/de/play');
    });
  });
});
