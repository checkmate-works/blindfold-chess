// @vitest-environment jsdom
import React from 'react';

import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Step4Page from './page';

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

// Mock next-intl/navigation (Link used by step4 via @/i18n/routing)
vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: ({
      href,
      children,
      ...props
    }: {
      href: string;
      children: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement('a', { href, ...props }, children),
    redirect: vi.fn(),
    usePathname: () => '/en',
    useRouter: () => ({ push: vi.fn() }),
    getPathname: vi.fn(),
  }),
}));

// Mock next-intl/routing
vi.mock('next-intl/routing', () => ({
  defineRouting: vi.fn(() => ({})),
}));

// Mock GamePreferencesContext (required by OnboardingStepLayout's dependency chain)
vi.mock('@/app/[locale]/_contexts/GamePreferencesContext', () => ({
  useGamePreferences: () => ({
    preferences: {},
    updatePreferences: vi.fn(),
  }),
}));

describe('Step4Page', () => {
  it('renders completion message (title and description)', () => {
    render(<Step4Page />);

    expect(screen.getByText('step4.title')).toBeInTheDocument();
    expect(screen.getByText('step4.description')).toBeInTheDocument();
  });

  it('renders all 3 game mode links', () => {
    render(<Step4Page />);

    expect(screen.getByText('step4.gameModes.standard')).toBeInTheDocument();
    expect(screen.getByText('step4.gameModes.standardDescription')).toBeInTheDocument();
    expect(screen.getByText('step4.gameModes.pgn')).toBeInTheDocument();
    expect(screen.getByText('step4.gameModes.pgnDescription')).toBeInTheDocument();
    expect(screen.getByText('step4.gameModes.position')).toBeInTheDocument();
    expect(screen.getByText('step4.gameModes.positionDescription')).toBeInTheDocument();
  });

  it('game mode links have correct href values', () => {
    render(<Step4Page />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);

    const hrefs = links.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/games/new/standard');
    expect(hrefs).toContain('/games/new/pgn');
    expect(hrefs).toContain('/games/new/position');
  });

  it('shows step indicator with 4 steps and step 4 active', () => {
    render(<Step4Page />);

    // Steps 1, 2, and 3 should have completed styling (bg-primary/20)
    const step1 = screen.getByText('1');
    expect(step1.className).toContain('bg-primary/20');
    expect(step1.className).toContain('text-primary');
    const step2 = screen.getByText('2');
    expect(step2.className).toContain('bg-primary/20');
    expect(step2.className).toContain('text-primary');
    const step3 = screen.getByText('3');
    expect(step3.className).toContain('bg-primary/20');
    expect(step3.className).toContain('text-primary');

    // Step 4 should have active styling
    const step4 = screen.getByText('4');
    expect(step4.className).toContain('bg-primary');
    expect(step4.className).toContain('text-primary-foreground');
  });

  it('shows Back button, no Skip or Next buttons', () => {
    render(<Step4Page />);

    expect(screen.getByText('back')).toBeInTheDocument();
    expect(screen.queryByText('skip')).not.toBeInTheDocument();
    expect(screen.queryByText('next')).not.toBeInTheDocument();
  });

  it('clicking Back navigates to step3', () => {
    render(<Step4Page />);

    fireEvent.click(screen.getByText('back'));

    expect(mockPush).toHaveBeenCalledWith('/en/onboarding/step3');
  });

  it('renders chess piece icons for each game mode', () => {
    render(<Step4Page />);

    // The page renders unicode chess pieces as icons
    // ♟ for standard, 📋 for pgn, ♜ for position
    expect(screen.getByText('\u265F')).toBeInTheDocument();
    expect(screen.getByText('\u{1F4CB}')).toBeInTheDocument();
    expect(screen.getByText('\u265C')).toBeInTheDocument();
  });
});
