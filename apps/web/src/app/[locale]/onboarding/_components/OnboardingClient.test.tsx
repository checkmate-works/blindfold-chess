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

// Mock ChessBoard used by BoardPreview (in PieceSettingsStep)
vi.mock('@/app/_components', () => ({
  ChessBoard: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'chess-board-preview', 'data-fen': props.fen }),
}));

function renderWithProviders(locale = 'en') {
  return render(
    <GamePreferencesProvider>
      <OnboardingClient locale={locale} />
    </GamePreferencesProvider>
  );
}

/** Navigate to STEP2 */
function goToStep2() {
  fireEvent.click(screen.getByText('next'));
}

/** Navigate to STEP3 */
function goToStep3() {
  goToStep2();
  fireEvent.click(screen.getByText('next'));
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

      // Step indicator should show step numbers "1", "2", "3"
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
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

      // With three steps, first step should show "next" not "finish"
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

      goToStep2();

      // STEP2 content should appear
      expect(screen.getByText('step2.title')).toBeInTheDocument();
      expect(screen.getByText('step2.description')).toBeInTheDocument();
      // STEP1 content should be gone
      expect(screen.queryByText('step1.title')).not.toBeInTheDocument();
    });

    it('shows back button on STEP2', () => {
      renderWithProviders();

      goToStep2();

      expect(screen.getByText('back')).toBeInTheDocument();
    });

    it('shows next button on STEP2 (not last step)', () => {
      renderWithProviders();

      goToStep2();

      // STEP2 is now the middle step, should show "next" not "finish"
      expect(screen.getByText('next')).toBeInTheDocument();
      expect(screen.queryByText('finish')).not.toBeInTheDocument();
    });

    it('clicking back on STEP2 returns to STEP1', () => {
      renderWithProviders();

      // Go to STEP2
      goToStep2();
      expect(screen.getByText('step2.title')).toBeInTheDocument();

      // Go back to STEP1
      fireEvent.click(screen.getByText('back'));
      expect(screen.getByText('step1.title')).toBeInTheDocument();
      expect(screen.queryByText('step2.title')).not.toBeInTheDocument();
    });

    it('does not show back button after returning to STEP1', () => {
      renderWithProviders();

      // Go to STEP2 and back
      goToStep2();
      fireEvent.click(screen.getByText('back'));

      expect(screen.queryByText('back')).not.toBeInTheDocument();
    });
  });

  describe('STEP2 peek mode selection', () => {
    it('displays modal and inline peek mode options on STEP2', () => {
      renderWithProviders();

      goToStep2();

      expect(screen.getByText('step2.modes.modal.label')).toBeInTheDocument();
      expect(screen.getByText('step2.modes.inline.label')).toBeInTheDocument();
    });

    it('defaults to modal mode selected on STEP2', () => {
      renderWithProviders();

      goToStep2();

      const modalOption = screen.getByText('step2.modes.modal.label').closest('button')!;
      const inlineOption = screen.getByText('step2.modes.inline.label').closest('button')!;

      expect(modalOption.className).toContain('border-primary');
      expect(inlineOption.className).not.toContain('border-primary');
    });

    it('allows switching to inline mode on STEP2', () => {
      renderWithProviders();

      goToStep2();

      const inlineOption = screen.getByText('step2.modes.inline.label').closest('button')!;
      fireEvent.click(inlineOption);

      expect(inlineOption.className).toContain('border-primary');

      // Modal should no longer be selected (radio behavior, not toggle)
      const modalOption = screen.getByText('step2.modes.modal.label').closest('button')!;
      expect(modalOption.className).not.toContain('border-primary');
    });
  });

  describe('step navigation (STEP2 -> STEP3)', () => {
    it('clicking next on STEP2 advances to STEP3', () => {
      renderWithProviders();

      goToStep3();

      // STEP3 content should appear
      expect(screen.getByText('step3.title')).toBeInTheDocument();
      expect(screen.getByText('step3.description')).toBeInTheDocument();
      // STEP2 content should be gone
      expect(screen.queryByText('step2.title')).not.toBeInTheDocument();
    });

    it('shows back button on STEP3', () => {
      renderWithProviders();

      goToStep3();

      expect(screen.getByText('back')).toBeInTheDocument();
    });

    it('shows finish button on STEP3 (last step)', () => {
      renderWithProviders();

      goToStep3();

      expect(screen.getByText('finish')).toBeInTheDocument();
      expect(screen.queryByText('next')).not.toBeInTheDocument();
    });

    it('clicking back on STEP3 returns to STEP2', () => {
      renderWithProviders();

      goToStep3();
      expect(screen.getByText('step3.title')).toBeInTheDocument();

      fireEvent.click(screen.getByText('back'));
      expect(screen.getByText('step2.title')).toBeInTheDocument();
      expect(screen.queryByText('step3.title')).not.toBeInTheDocument();
    });

    it('can navigate back from STEP3 to STEP2 to STEP1', () => {
      renderWithProviders();

      // Navigate forward to STEP3
      goToStep3();
      expect(screen.getByText('step3.title')).toBeInTheDocument();

      // Back to STEP2
      fireEvent.click(screen.getByText('back'));
      expect(screen.getByText('step2.title')).toBeInTheDocument();

      // Back to STEP1
      fireEvent.click(screen.getByText('back'));
      expect(screen.getByText('step1.title')).toBeInTheDocument();
      expect(screen.queryByText('back')).not.toBeInTheDocument();
    });
  });

  describe('STEP3 piece settings', () => {
    it('displays all setting sections on STEP3', () => {
      renderWithProviders();

      goToStep3();

      expect(screen.getByText('step3.visibility.title')).toBeInTheDocument();
      expect(screen.getByText('step3.appearance.title')).toBeInTheDocument();
      expect(screen.getByText('step3.shape.title')).toBeInTheDocument();
      expect(screen.getByText('step3.color.title')).toBeInTheDocument();
    });

    it('displays visibility checkboxes', () => {
      renderWithProviders();

      goToStep3();

      expect(screen.getByText('step3.visibility.showOwnPieces')).toBeInTheDocument();
      expect(screen.getByText('step3.visibility.showOpponentPieces')).toBeInTheDocument();
    });

    it('displays all shape options', () => {
      renderWithProviders();

      goToStep3();

      expect(screen.getByText('step3.shape.normal')).toBeInTheDocument();
      expect(screen.getByText('step3.shape.circles-all')).toBeInTheDocument();
      expect(screen.getByText('step3.shape.circles-own')).toBeInTheDocument();
      expect(screen.getByText('step3.shape.circles-opponent')).toBeInTheDocument();
    });

    it('displays all color options', () => {
      renderWithProviders();

      goToStep3();

      expect(screen.getByText('step3.color.normal')).toBeInTheDocument();
      expect(screen.getByText('step3.color.white-only')).toBeInTheDocument();
      expect(screen.getByText('step3.color.black-only')).toBeInTheDocument();
    });

    it('defaults to both visibility checkboxes checked', () => {
      renderWithProviders();

      goToStep3();

      const checkboxes = screen.getAllByRole('checkbox');
      // Both showOwnPieces and showOpponentPieces should be checked
      checkboxes.forEach((cb) => {
        expect(cb).toBeChecked();
      });
    });

    it('defaults to "normal" shape and color selected', () => {
      renderWithProviders();

      goToStep3();

      // Both shape and color have "normal" as default — check by radio group name
      const shapeNormalLabel = screen.getByText('step3.shape.normal').closest('label')!;
      const shapeRadio = shapeNormalLabel.querySelector('input[type="radio"]')!;
      expect(shapeRadio).toBeChecked();

      const colorNormalLabel = screen.getByText('step3.color.normal').closest('label')!;
      const colorRadio = colorNormalLabel.querySelector('input[type="radio"]')!;
      expect(colorRadio).toBeChecked();
    });

    it('allows unchecking showOwnPieces', () => {
      renderWithProviders();

      goToStep3();

      const ownPiecesLabel = screen.getByText('step3.visibility.showOwnPieces').closest('label')!;
      const checkbox = ownPiecesLabel.querySelector('input[type="checkbox"]')!;
      fireEvent.click(checkbox);

      expect(checkbox).not.toBeChecked();
    });

    it('allows unchecking showOpponentPieces', () => {
      renderWithProviders();

      goToStep3();

      const opponentPiecesLabel = screen
        .getByText('step3.visibility.showOpponentPieces')
        .closest('label')!;
      const checkbox = opponentPiecesLabel.querySelector('input[type="checkbox"]')!;
      fireEvent.click(checkbox);

      expect(checkbox).not.toBeChecked();
    });

    it('allows switching shape to circles-all', () => {
      renderWithProviders();

      goToStep3();

      const circlesAllLabel = screen.getByText('step3.shape.circles-all').closest('label')!;
      const radio = circlesAllLabel.querySelector('input[type="radio"]')!;
      fireEvent.click(radio);

      expect(radio).toBeChecked();
    });

    it('allows switching color to white-only', () => {
      renderWithProviders();

      goToStep3();

      const whiteOnlyLabel = screen.getByText('step3.color.white-only').closest('label')!;
      const radio = whiteOnlyLabel.querySelector('input[type="radio"]')!;
      fireEvent.click(radio);

      expect(radio).toBeChecked();
    });

    it('displays board preview', () => {
      renderWithProviders();

      goToStep3();

      expect(screen.getByTestId('chess-board-preview')).toBeInTheDocument();
    });

    it('hides appearance section when both visibility checkboxes are unchecked', () => {
      renderWithProviders();

      goToStep3();

      // Uncheck both
      const ownLabel = screen.getByText('step3.visibility.showOwnPieces').closest('label')!;
      fireEvent.click(ownLabel.querySelector('input[type="checkbox"]')!);
      const opponentLabel = screen
        .getByText('step3.visibility.showOpponentPieces')
        .closest('label')!;
      fireEvent.click(opponentLabel.querySelector('input[type="checkbox"]')!);

      // Appearance section should be hidden
      expect(screen.queryByText('step3.appearance.title')).not.toBeInTheDocument();
      expect(screen.queryByText('step3.shape.title')).not.toBeInTheDocument();
      expect(screen.queryByText('step3.color.title')).not.toBeInTheDocument();

      // Preview should still be visible
      expect(screen.getByTestId('chess-board-preview')).toBeInTheDocument();
    });

    it('shows appearance section when only showOwnPieces is checked', () => {
      renderWithProviders();

      goToStep3();

      // Uncheck opponent only
      const opponentLabel = screen
        .getByText('step3.visibility.showOpponentPieces')
        .closest('label')!;
      fireEvent.click(opponentLabel.querySelector('input[type="checkbox"]')!);

      // Appearance section should still be visible
      expect(screen.getByText('step3.appearance.title')).toBeInTheDocument();
      expect(screen.getByText('step3.shape.title')).toBeInTheDocument();
      expect(screen.getByText('step3.color.title')).toBeInTheDocument();
    });

    it('shows appearance section when only showOpponentPieces is checked', () => {
      renderWithProviders();

      goToStep3();

      // Uncheck own only
      const ownLabel = screen.getByText('step3.visibility.showOwnPieces').closest('label')!;
      fireEvent.click(ownLabel.querySelector('input[type="checkbox"]')!);

      // Appearance section should still be visible
      expect(screen.getByText('step3.appearance.title')).toBeInTheDocument();
    });

    it('re-shows appearance section when a visibility checkbox is re-checked', () => {
      renderWithProviders();

      goToStep3();

      // Uncheck both
      const ownLabel = screen.getByText('step3.visibility.showOwnPieces').closest('label')!;
      const ownCheckbox = ownLabel.querySelector('input[type="checkbox"]')!;
      fireEvent.click(ownCheckbox);
      const opponentLabel = screen
        .getByText('step3.visibility.showOpponentPieces')
        .closest('label')!;
      fireEvent.click(opponentLabel.querySelector('input[type="checkbox"]')!);

      // Hidden
      expect(screen.queryByText('step3.appearance.title')).not.toBeInTheDocument();

      // Re-check own
      fireEvent.click(ownCheckbox);

      // Visible again
      expect(screen.getByText('step3.appearance.title')).toBeInTheDocument();
    });
  });

  describe('finish from STEP3', () => {
    it('navigates to /en/play when finish is clicked on STEP3', () => {
      renderWithProviders('en');

      goToStep3();
      fireEvent.click(screen.getByText('finish'));

      expect(mockPush).toHaveBeenCalledWith('/en/play');
    });

    it('navigates to /ja/play when finish is clicked on STEP3 (ja locale)', () => {
      renderWithProviders('ja');

      goToStep3();
      fireEvent.click(screen.getByText('finish'));

      expect(mockPush).toHaveBeenCalledWith('/ja/play');
    });

    it('saves move input modes when advancing from STEP1 to STEP2', async () => {
      renderWithProviders();

      // Select additional "text" mode on STEP1
      const textOption = screen.getByText('step1.modes.text.label').closest('button')!;
      fireEvent.click(textOption);

      // Click next to go to STEP2 (this saves STEP1 preferences)
      goToStep2();

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.enabledMoveInputModes).toEqual(['button', 'text']);
        expect(parsed.moveInputMode).toBe('button');
      });
    });

    it('saves peek mode preference when advancing from STEP2 to STEP3', async () => {
      renderWithProviders();

      // Go to STEP2
      goToStep2();

      // Select inline peek mode
      const inlineOption = screen.getByText('step2.modes.inline.label').closest('button')!;
      fireEvent.click(inlineOption);

      // Click next to go to STEP3 (this saves STEP2 preferences)
      fireEvent.click(screen.getByText('next'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.peekMode).toBe('inline');
      });
    });

    it('saves piece settings on finish from STEP3', async () => {
      renderWithProviders();

      goToStep3();

      // Uncheck showOpponentPieces
      const opponentLabel = screen
        .getByText('step3.visibility.showOpponentPieces')
        .closest('label')!;
      fireEvent.click(opponentLabel.querySelector('input[type="checkbox"]')!);

      // Change shape to circles-own (circles-all is not available when opponent is hidden)
      const circlesOwnLabel = screen.getByText('step3.shape.circles-own').closest('label')!;
      fireEvent.click(circlesOwnLabel.querySelector('input[type="radio"]')!);

      // Change color to black-only
      const blackOnlyLabel = screen.getByText('step3.color.black-only').closest('label')!;
      fireEvent.click(blackOnlyLabel.querySelector('input[type="radio"]')!);

      // Click finish
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.showOwnPieces).toBe(true);
        expect(parsed.showOpponentPieces).toBe(false);
        expect(parsed.pieceShapeMode).toBe('circles-own');
        expect(parsed.pieceColors).toBe('black-only');
      });
    });

    it('saves default piece settings on finish without changing selection', async () => {
      renderWithProviders();

      // Go through all steps without changing anything
      goToStep3();
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        // Default: all pieces visible, normal shape, normal colors
        expect(parsed.showOwnPieces).toBe(true);
        expect(parsed.showOpponentPieces).toBe(true);
        expect(parsed.pieceShapeMode).toBe('normal');
        expect(parsed.pieceColors).toBe('normal');
      });
    });

    it('saves all preferences through full 3-step flow', async () => {
      renderWithProviders();

      // STEP1: select text mode in addition to button
      const textOption = screen.getByText('step1.modes.text.label').closest('button')!;
      fireEvent.click(textOption);

      // Go to STEP2
      goToStep2();

      // STEP2: select inline peek mode
      const inlineOption = screen.getByText('step2.modes.inline.label').closest('button')!;
      fireEvent.click(inlineOption);

      // Go to STEP3
      fireEvent.click(screen.getByText('next'));

      // STEP3: uncheck own pieces, keep opponent pieces, circles-opponent shape, white-only color
      const ownLabel = screen.getByText('step3.visibility.showOwnPieces').closest('label')!;
      fireEvent.click(ownLabel.querySelector('input[type="checkbox"]')!);

      const circlesOpponentLabel = screen
        .getByText('step3.shape.circles-opponent')
        .closest('label')!;
      fireEvent.click(circlesOpponentLabel.querySelector('input[type="radio"]')!);

      const whiteOnlyLabel = screen.getByText('step3.color.white-only').closest('label')!;
      fireEvent.click(whiteOnlyLabel.querySelector('input[type="radio"]')!);

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
        // STEP3 preferences
        expect(parsed.showOwnPieces).toBe(false);
        expect(parsed.showOpponentPieces).toBe(true);
        expect(parsed.pieceShapeMode).toBe('circles-opponent');
        expect(parsed.pieceColors).toBe('white-only');
      });
    });

    it('saves only default preferences through full flow without changes', async () => {
      renderWithProviders();

      // Go through all three steps without changing anything
      goToStep3();
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.enabledMoveInputModes).toEqual(['button']);
        expect(parsed.moveInputMode).toBe('button');
        expect(parsed.peekMode).toBe('modal');
        expect(parsed.showOwnPieces).toBe(true);
        expect(parsed.showOpponentPieces).toBe(true);
        expect(parsed.pieceShapeMode).toBe('normal');
        expect(parsed.pieceColors).toBe('normal');
      });
    });
  });

  describe('STEP3 visibility checkbox to preferences mapping', () => {
    it('saves both true when both checkboxes remain checked (default)', async () => {
      renderWithProviders();

      goToStep3();
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        const parsed = JSON.parse(stored!);
        expect(parsed.showOwnPieces).toBe(true);
        expect(parsed.showOpponentPieces).toBe(true);
      });
    });

    it('saves showOpponentPieces=false when opponent checkbox is unchecked', async () => {
      renderWithProviders();

      goToStep3();
      const opponentLabel = screen
        .getByText('step3.visibility.showOpponentPieces')
        .closest('label')!;
      fireEvent.click(opponentLabel.querySelector('input[type="checkbox"]')!);
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        const parsed = JSON.parse(stored!);
        expect(parsed.showOwnPieces).toBe(true);
        expect(parsed.showOpponentPieces).toBe(false);
      });
    });

    it('saves showOwnPieces=false when own checkbox is unchecked', async () => {
      renderWithProviders();

      goToStep3();
      const ownLabel = screen.getByText('step3.visibility.showOwnPieces').closest('label')!;
      fireEvent.click(ownLabel.querySelector('input[type="checkbox"]')!);
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        const parsed = JSON.parse(stored!);
        expect(parsed.showOwnPieces).toBe(false);
        expect(parsed.showOpponentPieces).toBe(true);
      });
    });

    it('saves both false when both checkboxes are unchecked', async () => {
      renderWithProviders();

      goToStep3();
      const ownLabel = screen.getByText('step3.visibility.showOwnPieces').closest('label')!;
      fireEvent.click(ownLabel.querySelector('input[type="checkbox"]')!);
      const opponentLabel = screen
        .getByText('step3.visibility.showOpponentPieces')
        .closest('label')!;
      fireEvent.click(opponentLabel.querySelector('input[type="checkbox"]')!);
      fireEvent.click(screen.getByText('finish'));

      await vi.waitFor(() => {
        const stored = localStorage.getItem('blindfold-chess-game-preferences');
        const parsed = JSON.parse(stored!);
        expect(parsed.showOwnPieces).toBe(false);
        expect(parsed.showOpponentPieces).toBe(false);
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
      goToStep2();

      // Go to STEP3
      fireEvent.click(screen.getByText('next'));

      // Finish from STEP3
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

  describe('STEP3: Piece shape option filtering', () => {
    it('shows all 4 shape options when both visibility checkboxes are checked', () => {
      renderWithProviders();

      goToStep3();

      expect(screen.getByText('step3.shape.normal')).toBeInTheDocument();
      expect(screen.getByText('step3.shape.circles-all')).toBeInTheDocument();
      expect(screen.getByText('step3.shape.circles-own')).toBeInTheDocument();
      expect(screen.getByText('step3.shape.circles-opponent')).toBeInTheDocument();
    });

    it('shows only normal and circles-own when only showOwnPieces is checked', () => {
      renderWithProviders();

      goToStep3();

      // Uncheck opponent pieces
      const opponentLabel = screen
        .getByText('step3.visibility.showOpponentPieces')
        .closest('label')!;
      fireEvent.click(opponentLabel.querySelector('input[type="checkbox"]')!);

      expect(screen.getByText('step3.shape.normal')).toBeInTheDocument();
      expect(screen.getByText('step3.shape.circles-own')).toBeInTheDocument();
      expect(screen.queryByText('step3.shape.circles-all')).not.toBeInTheDocument();
      expect(screen.queryByText('step3.shape.circles-opponent')).not.toBeInTheDocument();
    });

    it('shows only normal and circles-opponent when only showOpponentPieces is checked', () => {
      renderWithProviders();

      goToStep3();

      // Uncheck own pieces
      const ownLabel = screen.getByText('step3.visibility.showOwnPieces').closest('label')!;
      fireEvent.click(ownLabel.querySelector('input[type="checkbox"]')!);

      expect(screen.getByText('step3.shape.normal')).toBeInTheDocument();
      expect(screen.getByText('step3.shape.circles-opponent')).toBeInTheDocument();
      expect(screen.queryByText('step3.shape.circles-all')).not.toBeInTheDocument();
      expect(screen.queryByText('step3.shape.circles-own')).not.toBeInTheDocument();
    });

    it('does not filter piece color options regardless of visibility state', () => {
      renderWithProviders();

      goToStep3();

      // Uncheck opponent pieces
      const opponentLabel = screen
        .getByText('step3.visibility.showOpponentPieces')
        .closest('label')!;
      fireEvent.click(opponentLabel.querySelector('input[type="checkbox"]')!);

      // All color options should still be visible
      expect(screen.getByText('step3.color.normal')).toBeInTheDocument();
      expect(screen.getByText('step3.color.white-only')).toBeInTheDocument();
      expect(screen.getByText('step3.color.black-only')).toBeInTheDocument();
    });

    it('auto-resets to normal when circles-all is selected and opponent is unchecked', () => {
      renderWithProviders();

      goToStep3();

      // Select circles-all
      const circlesAllLabel = screen.getByText('step3.shape.circles-all').closest('label')!;
      fireEvent.click(circlesAllLabel.querySelector('input[type="radio"]')!);

      // Uncheck opponent pieces
      const opponentLabel = screen
        .getByText('step3.visibility.showOpponentPieces')
        .closest('label')!;
      fireEvent.click(opponentLabel.querySelector('input[type="checkbox"]')!);

      // circles-all is gone; normal should be selected
      const normalLabel = screen.getByText('step3.shape.normal').closest('label')!;
      const normalRadio = normalLabel.querySelector('input[type="radio"]')!;
      expect(normalRadio).toBeChecked();
    });

    it('auto-resets to normal when circles-opponent is selected and opponent is unchecked', () => {
      renderWithProviders();

      goToStep3();

      // Select circles-opponent
      const circlesOpponentLabel = screen
        .getByText('step3.shape.circles-opponent')
        .closest('label')!;
      fireEvent.click(circlesOpponentLabel.querySelector('input[type="radio"]')!);

      // Uncheck opponent pieces
      const opponentLabel = screen
        .getByText('step3.visibility.showOpponentPieces')
        .closest('label')!;
      fireEvent.click(opponentLabel.querySelector('input[type="checkbox"]')!);

      // circles-opponent is gone; normal should be selected
      const normalLabel = screen.getByText('step3.shape.normal').closest('label')!;
      const normalRadio = normalLabel.querySelector('input[type="radio"]')!;
      expect(normalRadio).toBeChecked();
    });

    it('auto-resets to normal when circles-own is selected and own is unchecked', () => {
      renderWithProviders();

      goToStep3();

      // Select circles-own
      const circlesOwnLabel = screen.getByText('step3.shape.circles-own').closest('label')!;
      fireEvent.click(circlesOwnLabel.querySelector('input[type="radio"]')!);

      // Uncheck own pieces
      const ownLabel = screen.getByText('step3.visibility.showOwnPieces').closest('label')!;
      fireEvent.click(ownLabel.querySelector('input[type="checkbox"]')!);

      // circles-own is gone; normal should be selected
      const normalLabel = screen.getByText('step3.shape.normal').closest('label')!;
      const normalRadio = normalLabel.querySelector('input[type="radio"]')!;
      expect(normalRadio).toBeChecked();
    });
  });

  describe('locale handling', () => {
    it('passes locale correctly to navigation on finish from STEP3', () => {
      renderWithProviders('fr');

      goToStep3();
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

      goToStep2();
      fireEvent.click(screen.getByText('skip'));

      expect(mockPush).toHaveBeenCalledWith('/ja/play');
    });

    it('passes locale correctly on skip from STEP3', () => {
      renderWithProviders('ja');

      goToStep3();
      fireEvent.click(screen.getByText('skip'));

      expect(mockPush).toHaveBeenCalledWith('/ja/play');
    });
  });
});
