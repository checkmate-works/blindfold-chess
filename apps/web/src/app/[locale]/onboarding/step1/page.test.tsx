// @vitest-environment jsdom
import React from 'react';

import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Step1Page from './page';

expect.extend(matchers);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
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

// Mock react-icons/fa (includes icons from both MoveInputStep and PeekModeStep due to barrel import)
vi.mock('react-icons/fa', () => ({
  FaKeyboard: () => React.createElement('span', { 'data-testid': 'icon-keyboard' }),
  FaList: () => React.createElement('span', { 'data-testid': 'icon-list' }),
  FaThLarge: () => React.createElement('span', { 'data-testid': 'icon-grid' }),
  FaChevronDown: () => React.createElement('span', { 'data-testid': 'icon-chevron' }),
  FaEye: () => React.createElement('span', { 'data-testid': 'icon-eye' }),
  FaWindowMaximize: () => React.createElement('span', { 'data-testid': 'icon-window' }),
}));

// Mock @blindfold-chess/icons
vi.mock('@blindfold-chess/icons', () => ({
  ChessPieceIcon: ({ type, color }: { type: string; color: string }) =>
    React.createElement('span', { 'data-testid': `piece-icon-${color}-${type}` }),
}));

// Mock GamePreferencesContext
const mockUpdatePreferences = vi.fn();
vi.mock('@/app/[locale]/_contexts/GamePreferencesContext', () => ({
  useGamePreferences: () => ({
    preferences: {},
    updatePreferences: mockUpdatePreferences,
  }),
}));

describe('Step1Page', () => {
  it('renders MoveInputStep content (title, mode options)', () => {
    render(<Step1Page />);

    expect(screen.getByText('step1.title')).toBeInTheDocument();
    expect(screen.getByText('step1.description')).toBeInTheDocument();
    expect(screen.getByText('step1.modes.text.label')).toBeInTheDocument();
    expect(screen.getByText('step1.modes.select.label')).toBeInTheDocument();
    expect(screen.getByText('step1.modes.button.label')).toBeInTheDocument();
  });

  it('shows step indicator with step 1 active', () => {
    render(<Step1Page />);

    // Step 1 should have active styling (bg-primary)
    const step1 = screen.getByText('1');
    expect(step1.className).toContain('bg-primary');
    expect(step1.className).toContain('text-primary-foreground');

    // Steps 2 and 3 should have muted styling
    const step2 = screen.getByText('2');
    expect(step2.className).toContain('bg-muted');
    const step3 = screen.getByText('3');
    expect(step3.className).toContain('bg-muted');
  });

  it('shows Skip and Next buttons, no Back button', () => {
    render(<Step1Page />);

    expect(screen.getByText('skip')).toBeInTheDocument();
    expect(screen.getByText('next')).toBeInTheDocument();
    expect(screen.queryByText('back')).not.toBeInTheDocument();
  });

  it('can toggle mode selection (click text -> both button + text selected)', () => {
    render(<Step1Page />);

    // Default: only 'button' is selected
    const buttonOption = screen.getByText('step1.modes.button.label').closest('button')!;
    expect(buttonOption.className).toContain('border-primary');

    const textOption = screen.getByText('step1.modes.text.label').closest('button')!;
    expect(textOption.className).not.toContain('border-primary');

    // Click text to add it
    fireEvent.click(textOption);

    // Now both should be selected
    expect(textOption.className).toContain('border-primary');
    expect(buttonOption.className).toContain('border-primary');
  });

  it('cannot deselect the last remaining mode', () => {
    render(<Step1Page />);

    // Default: only 'button' is selected
    const buttonOption = screen.getByText('step1.modes.button.label').closest('button')!;
    expect(buttonOption.className).toContain('border-primary');

    // Try to deselect button (the only selected mode)
    fireEvent.click(buttonOption);

    // Should still be selected (cannot deselect last one)
    expect(buttonOption.className).toContain('border-primary');
  });

  it('clicking Next calls updatePreferences and navigates to step2', () => {
    render(<Step1Page />);

    fireEvent.click(screen.getByText('next'));

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      enabledMoveInputModes: ['button'],
      moveInputMode: 'button',
    });
    expect(mockPush).toHaveBeenCalledWith('/en/onboarding/step2');
  });

  it('clicking Skip navigates to /play', () => {
    render(<Step1Page />);

    fireEvent.click(screen.getByText('skip'));

    expect(mockPush).toHaveBeenCalledWith('/en/play');
  });
});
