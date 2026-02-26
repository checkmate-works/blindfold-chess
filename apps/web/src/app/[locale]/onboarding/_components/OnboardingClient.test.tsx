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

// Mock react-icons used by MoveInputStep and PeekModeStep
vi.mock('react-icons/fa', () => ({
  FaKeyboard: () => React.createElement('span', { 'data-testid': 'icon-keyboard' }),
  FaList: () => React.createElement('span', { 'data-testid': 'icon-list' }),
  FaThLarge: () => React.createElement('span', { 'data-testid': 'icon-grid' }),
  FaChevronDown: () => React.createElement('span', { 'data-testid': 'icon-chevron-down' }),
  FaWindowMaximize: () => React.createElement('span', { 'data-testid': 'icon-window-maximize' }),
  FaEye: () => React.createElement('span', { 'data-testid': 'icon-eye' }),
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

    it('renders next button on the first step (not last step)', () => {
      renderWithProviders();

      // With two steps, first step should show "next" not "finish"
      expect(screen.getByText('next')).toBeInTheDocument();
      expect(screen.queryByText('finish')).not.toBeInTheDocument();
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

  describe('step navigation (STEP1 -> STEP2)', () => {
    it('clicking next on STEP1 advances to STEP2', () => {
      renderWithProviders();

      fireEvent.click(screen.getByText('next'));

      // STEP2 content should appear
      expect(screen.getByText('step2.title')).toBeInTheDocument();
      expect(screen.getByText('step2.description')).toBeInTheDocument();
      // STEP1 content should be gone
      expect(screen.queryByText('step1.title')).not.toBeInTheDocument();
    });

    it('shows back button on STEP2', () => {
      renderWithProviders();

      fireEvent.click(screen.getByText('next'));

      expect(screen.getByText('back')).toBeInTheDocument();
    });

    it('shows finish button on STEP2 (last step)', () => {
      renderWithProviders();

      fireEvent.click(screen.getByText('next'));

      expect(screen.getByText('finish')).toBeInTheDocument();
      expect(screen.queryByText('next')).not.toBeInTheDocument();
    });

    it('clicking back on STEP2 returns to STEP1', () => {
      renderWithProviders();

      // Go to STEP2
      fireEvent.click(screen.getByText('next'));
      expect(screen.getByText('step2.title')).toBeInTheDocument();

      // Go back to STEP1
      fireEvent.click(screen.getByText('back'));
      expect(screen.getByText('step1.title')).toBeInTheDocument();
      expect(screen.queryByText('step2.title')).not.toBeInTheDocument();
    });

    it('does not show back button after returning to STEP1', () => {
      renderWithProviders();

      // Go to STEP2 and back
      fireEvent.click(screen.getByText('next'));
      fireEvent.click(screen.getByText('back'));

      expect(screen.queryByText('back')).not.toBeInTheDocument();
    });
  });

  describe('STEP2 peek mode selection', () => {
    it('displays modal and inline peek mode options on STEP2', () => {
      renderWithProviders();

      fireEvent.click(screen.getByText('next'));

      expect(screen.getByText('step2.modes.modal.label')).toBeInTheDocument();
      expect(screen.getByText('step2.modes.inline.label')).toBeInTheDocument();
    });

    it('defaults to modal mode selected on STEP2', () => {
      renderWithProviders();

      fireEvent.click(screen.getByText('next'));

      const modalOption = screen.getByText('step2.modes.modal.label').closest('button')!;
      const inlineOption = screen.getByText('step2.modes.inline.label').closest('button')!;

      expect(modalOption.className).toContain('border-primary');
      expect(inlineOption.className).not.toContain('border-primary');
    });

    it('allows switching to inline mode on STEP2', () => {
      renderWithProviders();

      fireEvent.click(screen.getByText('next'));

      const inlineOption = screen.getByText('step2.modes.inline.label').closest('button')!;
      fireEvent.click(inlineOption);

      expect(inlineOption.className).toContain('border-primary');

      // Modal should no longer be selected (radio behavior, not toggle)
      const modalOption = screen.getByText('step2.modes.modal.label').closest('button')!;
      expect(modalOption.className).not.toContain('border-primary');
    });
  });

  describe('finish from STEP2', () => {
    it('navigates to /en/play when finish is clicked on STEP2', () => {
      renderWithProviders('en');

      fireEvent.click(screen.getByText('next'));
      fireEvent.click(screen.getByText('finish'));

      expect(mockPush).toHaveBeenCalledWith('/en/play');
    });

    it('navigates to /ja/play when finish is clicked on STEP2 (ja locale)', () => {
      renderWithProviders('ja');

      fireEvent.click(screen.getByText('next'));
      fireEvent.click(screen.getByText('finish'));

      expect(mockPush).toHaveBeenCalledWith('/ja/play');
    });

    it('saves move input modes when advancing from STEP1 to STEP2', async () => {
      renderWithProviders();

      // Select additional "text" mode on STEP1
      const textOption = screen.getByText('step1.modes.text.label').closest('button')!;
      fireEvent.click(textOption);

      // Click next to go to STEP2 (this saves STEP1 preferences)
      fireEvent.click(screen.getByText('next'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.enabledMoveInputModes).toEqual(['button', 'text']);
        expect(parsed.moveInputMode).toBe('button');
      });
    });

    it('saves peek mode preference on finish from STEP2', async () => {
      renderWithProviders();

      // Go to STEP2
      fireEvent.click(screen.getByText('next'));

      // Select inline peek mode
      const inlineOption = screen.getByText('step2.modes.inline.label').closest('button')!;
      fireEvent.click(inlineOption);

      // Click finish
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.peekMode).toBe('inline');
      });
    });

    it('saves default modal peek mode on finish without changing selection', async () => {
      renderWithProviders();

      // Go to STEP2 and finish without changing
      fireEvent.click(screen.getByText('next'));
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.peekMode).toBe('modal');
      });
    });

    it('saves both STEP1 and STEP2 preferences through full flow', async () => {
      renderWithProviders();

      // STEP1: select text mode in addition to button
      const textOption = screen.getByText('step1.modes.text.label').closest('button')!;
      fireEvent.click(textOption);

      // Go to STEP2
      fireEvent.click(screen.getByText('next'));

      // STEP2: select inline peek mode
      const inlineOption = screen.getByText('step2.modes.inline.label').closest('button')!;
      fireEvent.click(inlineOption);

      // Finish
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        // STEP1 preferences
        expect(parsed.enabledMoveInputModes).toEqual(['button', 'text']);
        expect(parsed.moveInputMode).toBe('button');
        // STEP2 preferences
        expect(parsed.peekMode).toBe('inline');
      });
    });

    it('saves only default preferences through full flow without changes', async () => {
      renderWithProviders();

      // Go through both steps without changing anything
      fireEvent.click(screen.getByText('next'));
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.enabledMoveInputModes).toEqual(['button']);
        expect(parsed.moveInputMode).toBe('button');
        expect(parsed.peekMode).toBe('modal');
      });
    });
  });

  describe('preferences persistence', () => {
    it('does not overwrite other preferences when saving through full flow', async () => {
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
        expect(localStorage.getItem('blindfold-chess-game-preferences')).toBeTruthy();
      });

      // Select additional "select" mode (button is default)
      const selectOption = screen.getByText('step1.modes.select.label').closest('button')!;
      fireEvent.click(selectOption);

      // Go to STEP2
      fireEvent.click(screen.getByText('next'));

      // Finish from STEP2
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        const parsed = JSON.parse(stored!);
        expect(parsed.enabledMoveInputModes).toEqual(['button', 'select']);
        // Other preferences should be preserved
        expect(parsed.showCoordinates).toBe(false);
      });
    });
  });

  describe('locale handling', () => {
    it('passes locale correctly to navigation on finish from STEP2', () => {
      renderWithProviders('fr');

      fireEvent.click(screen.getByText('next'));
      fireEvent.click(screen.getByText('finish'));

      expect(mockPush).toHaveBeenCalledWith('/fr/play');
    });

    it('passes locale correctly to navigation on skip', () => {
      renderWithProviders('de');

      fireEvent.click(screen.getByText('skip'));

      expect(mockPush).toHaveBeenCalledWith('/de/play');
    });

    it('passes locale correctly on skip from STEP2', () => {
      renderWithProviders('ja');

      fireEvent.click(screen.getByText('next'));
      fireEvent.click(screen.getByText('skip'));

      expect(mockPush).toHaveBeenCalledWith('/ja/play');
    });
  });
});
