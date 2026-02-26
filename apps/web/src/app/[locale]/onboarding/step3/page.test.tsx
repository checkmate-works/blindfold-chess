// @vitest-environment jsdom
import React from 'react';

import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Step3Page from './page';

expect.extend(matchers);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockPreferences = {
    showOwnPieces: true,
    showOpponentPieces: true,
    pieceShapeMode: 'normal',
    pieceColors: 'normal',
  };
});

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ locale: 'en' }),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock GamePreferencesContext
const mockUpdatePreferences = vi.fn();
let mockPreferences: Record<string, unknown> = {
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
};
vi.mock('@/app/[locale]/_contexts/GamePreferencesContext', () => ({
  useGamePreferences: () => ({
    preferences: mockPreferences,
    updatePreferences: mockUpdatePreferences,
  }),
}));

// Mock ChessBoard (used by BoardPreview)
vi.mock('@/app/_components', () => ({
  ChessBoard: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'chess-board-preview', 'data-fen': props.fen }),
}));

describe('Step3Page', () => {
  it('renders PieceSettingsStep content', () => {
    render(<Step3Page />);

    expect(screen.getByText('step3.title')).toBeInTheDocument();
    expect(screen.getByText('step3.description')).toBeInTheDocument();
    expect(screen.getByText('step3.visibility.title')).toBeInTheDocument();
  });

  it('shows step indicator with step 3 active', () => {
    render(<Step3Page />);

    // Steps 1 and 2 should have completed styling
    const step1 = screen.getByText('1');
    expect(step1.className).toContain('bg-primary/20');
    const step2 = screen.getByText('2');
    expect(step2.className).toContain('bg-primary/20');

    // Step 3 should have active styling
    const step3 = screen.getByText('3');
    expect(step3.className).toContain('bg-primary');
    expect(step3.className).toContain('text-primary-foreground');
  });

  it('shows Skip, Back, and Finish buttons (isLastStep)', () => {
    render(<Step3Page />);

    expect(screen.getByText('skip')).toBeInTheDocument();
    expect(screen.getByText('back')).toBeInTheDocument();
    expect(screen.getByText('finish')).toBeInTheDocument();
    // Should not show "next" since it's the last step
    expect(screen.queryByText('next')).not.toBeInTheDocument();
  });

  it('checkbox toggles call updatePreferences for visibility', () => {
    render(<Step3Page />);

    // Both checkboxes should be checked by default
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toBeChecked(); // showOwnPieces
    expect(checkboxes[1]).toBeChecked(); // showOpponentPieces

    // Uncheck own pieces — should immediately call updatePreferences
    fireEvent.click(checkboxes[0]);
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ showOwnPieces: false });
  });

  it('shape filtering: only normal + circles-own when only own visible', () => {
    mockPreferences = {
      showOwnPieces: true,
      showOpponentPieces: false,
      pieceShapeMode: 'normal',
      pieceColors: 'normal',
    };
    render(<Step3Page />);

    // Available shape options should be: normal, circles-own
    const shapeRadios = screen
      .getAllByRole('radio')
      .filter((r) => r.getAttribute('name') === 'pieceShapeMode');
    expect(shapeRadios).toHaveLength(2);
    expect(screen.getByText('step3.shape.normal')).toBeInTheDocument();
    expect(screen.getByText('step3.shape.circles-own')).toBeInTheDocument();
    expect(screen.queryByText('step3.shape.circles-all')).not.toBeInTheDocument();
    expect(screen.queryByText('step3.shape.circles-opponent')).not.toBeInTheDocument();
  });

  it('shape filtering: only normal + circles-opponent when only opponent visible', () => {
    mockPreferences = {
      showOwnPieces: false,
      showOpponentPieces: true,
      pieceShapeMode: 'normal',
      pieceColors: 'normal',
    };
    render(<Step3Page />);

    // Available shape options should be: normal, circles-opponent
    const shapeRadios = screen
      .getAllByRole('radio')
      .filter((r) => r.getAttribute('name') === 'pieceShapeMode');
    expect(shapeRadios).toHaveLength(2);
    expect(screen.getByText('step3.shape.normal')).toBeInTheDocument();
    expect(screen.getByText('step3.shape.circles-opponent')).toBeInTheDocument();
    expect(screen.queryByText('step3.shape.circles-all')).not.toBeInTheDocument();
    expect(screen.queryByText('step3.shape.circles-own')).not.toBeInTheDocument();
  });

  it('auto-resets shape to normal when selected becomes unavailable', () => {
    mockPreferences = {
      showOwnPieces: true,
      showOpponentPieces: true,
      pieceShapeMode: 'circles-all',
      pieceColors: 'normal',
    };
    render(<Step3Page />);

    // circles-all should be selected
    const circlesAllRadio = screen.getByLabelText('step3.shape.circles-all');
    expect(circlesAllRadio).toBeChecked();

    // Uncheck opponent pieces — should call updatePreferences
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // uncheck showOpponentPieces
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ showOpponentPieces: false });
  });

  it('hides appearance section when both unchecked', () => {
    mockPreferences = {
      showOwnPieces: false,
      showOpponentPieces: false,
      pieceShapeMode: 'normal',
      pieceColors: 'normal',
    };
    render(<Step3Page />);

    // Appearance section should be hidden when both are unchecked
    expect(screen.queryByText('step3.appearance.title')).not.toBeInTheDocument();
  });

  it('clicking Finish navigates to /play', () => {
    render(<Step3Page />);

    fireEvent.click(screen.getByText('finish'));

    expect(mockUpdatePreferences).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/en/play');
  });

  it('clicking Back navigates to step2', () => {
    render(<Step3Page />);

    fireEvent.click(screen.getByText('back'));

    expect(mockPush).toHaveBeenCalledWith('/en/onboarding/step2');
  });

  it('initializes with saved preferences from context', () => {
    mockPreferences = {
      showOwnPieces: false,
      showOpponentPieces: true,
      pieceShapeMode: 'circles-opponent',
      pieceColors: 'normal',
    };
    render(<Step3Page />);

    // showOwnPieces should be unchecked, showOpponentPieces should be checked
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).not.toBeChecked(); // showOwnPieces
    expect(checkboxes[1]).toBeChecked(); // showOpponentPieces

    // circles-opponent shape should be selected
    const circlesOpponentRadio = screen.getByLabelText('step3.shape.circles-opponent');
    expect(circlesOpponentRadio).toBeChecked();
  });
});
