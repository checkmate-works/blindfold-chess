// @vitest-environment jsdom
import React from 'react';

import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Step2Page from './page';

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
  FaChevronDown: () => React.createElement('span', { 'data-testid': 'icon-chevron-down' }),
  FaEye: () => React.createElement('span', { 'data-testid': 'icon-eye' }),
  FaWindowMaximize: () => React.createElement('span', { 'data-testid': 'icon-window-maximize' }),
}));

// Mock @blindfold-chess/icons (used by MoveInputStep via barrel import)
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

describe('Step2Page', () => {
  it('renders PeekModeStep content (title, mode options)', () => {
    render(<Step2Page />);

    expect(screen.getByText('step2.title')).toBeInTheDocument();
    expect(screen.getByText('step2.description')).toBeInTheDocument();
    expect(screen.getByText('step2.modes.modal.label')).toBeInTheDocument();
    expect(screen.getByText('step2.modes.inline.label')).toBeInTheDocument();
  });

  it('shows step indicator with step 2 active', () => {
    render(<Step2Page />);

    // Step 1 should have completed styling
    const step1 = screen.getByText('1');
    expect(step1.className).toContain('bg-primary/20');
    expect(step1.className).toContain('text-primary');

    // Step 2 should have active styling
    const step2 = screen.getByText('2');
    expect(step2.className).toContain('bg-primary');
    expect(step2.className).toContain('text-primary-foreground');

    // Step 3 should have muted styling
    const step3 = screen.getByText('3');
    expect(step3.className).toContain('bg-muted');
  });

  it('shows Skip, Back, and Next buttons', () => {
    render(<Step2Page />);

    expect(screen.getByText('skip')).toBeInTheDocument();
    expect(screen.getByText('back')).toBeInTheDocument();
    expect(screen.getByText('next')).toBeInTheDocument();
  });

  it('can select different peek mode', () => {
    render(<Step2Page />);

    // Default: 'modal' is selected
    const modalOption = screen.getByText('step2.modes.modal.label').closest('button')!;
    const inlineOption = screen.getByText('step2.modes.inline.label').closest('button')!;

    expect(modalOption.className).toContain('border-primary');
    expect(inlineOption.className).not.toContain('border-primary');

    // Click inline to select it
    fireEvent.click(inlineOption);

    // Now inline should be selected, modal should not
    expect(inlineOption.className).toContain('border-primary');
    expect(modalOption.className).not.toContain('border-primary');
  });

  it('clicking Next saves peekMode and navigates to step3', () => {
    render(<Step2Page />);

    fireEvent.click(screen.getByText('next'));

    expect(mockUpdatePreferences).toHaveBeenCalledWith({ peekMode: 'modal' });
    expect(mockPush).toHaveBeenCalledWith('/en/onboarding/step3');
  });

  it('clicking Back navigates to step1', () => {
    render(<Step2Page />);

    fireEvent.click(screen.getByText('back'));

    expect(mockPush).toHaveBeenCalledWith('/en/onboarding/step1');
  });

  it('clicking Skip navigates to /play', () => {
    render(<Step2Page />);

    fireEvent.click(screen.getByText('skip'));

    expect(mockPush).toHaveBeenCalledWith('/en/play');
  });
});
