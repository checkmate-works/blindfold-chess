// @vitest-environment jsdom
import React from 'react';

import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import GettingStartedPage from './page';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock next-intl/server
vi.mock('next-intl/server', () => ({
  getTranslations: () => (key: string) => key,
}));

// Mock next-intl (client-side, pulled in transitively by barrel imports)
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next-intl/navigation (pulled in transitively by barrel imports)
vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
      React.createElement('a', { href }, children),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => '/',
    redirect: vi.fn(),
  }),
}));

// Mock next-intl/routing
vi.mock('next-intl/routing', () => ({
  defineRouting: () => ({}),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({ locale: 'en' }),
}));

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => React.createElement('img', props),
}));

// Mock react-icons/fa
vi.mock('react-icons/fa', () => ({
  FaBrain: () => React.createElement('span', { 'data-testid': 'icon-brain' }),
  FaChess: () => React.createElement('span', { 'data-testid': 'icon-chess' }),
  FaChessBoard: () => React.createElement('span', { 'data-testid': 'icon-chessboard' }),
  FaChessKnight: () => React.createElement('span', { 'data-testid': 'icon-knight' }),
  FaCrosshairs: () => React.createElement('span', { 'data-testid': 'icon-crosshairs' }),
  FaLightbulb: () => React.createElement('span', { 'data-testid': 'icon-lightbulb' }),
  FaRoute: () => React.createElement('span', { 'data-testid': 'icon-route' }),
  FaSignal: () => React.createElement('span', { 'data-testid': 'icon-signal' }),
  FaSlidersH: () => React.createElement('span', { 'data-testid': 'icon-sliders' }),
  FaUndo: () => React.createElement('span', { 'data-testid': 'icon-undo' }),
}));

// Mock ChessBoard and Button components
vi.mock('@/app/_components', () => ({
  ChessBoard: () => React.createElement('div', { 'data-testid': 'chess-board' }),
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('button', props, children),
}));

// Mock jsonld
vi.mock('@/lib/jsonld', () => ({
  JsonLd: () => null,
  generateBreadcrumbListSchema: () => ({}),
}));

describe('GettingStartedPage', () => {
  const renderPage = async (locale: string = 'en') => {
    const jsx = await GettingStartedPage({
      params: Promise.resolve({ locale: locale as 'en' | 'ja' }),
    });
    return render(jsx);
  };

  describe('onboarding banner', () => {
    it('renders the onboarding banner with title, description, and CTA', async () => {
      await renderPage();

      expect(screen.getByText('onboardingBanner.title')).toBeInTheDocument();
      expect(screen.getByText('onboardingBanner.description')).toBeInTheDocument();
      expect(screen.getByText(/onboardingBanner\.cta/)).toBeInTheDocument();
    });

    it('has a link pointing to the onboarding page', async () => {
      await renderPage();

      const bannerLink = screen.getByText('onboardingBanner.title').closest('a');
      expect(bannerLink).toBeInTheDocument();
      expect(bannerLink).toHaveAttribute('href', '/en/onboarding');
    });

    it('uses the correct locale in the onboarding link', async () => {
      await renderPage('ja');

      const bannerLink = screen.getByText('onboardingBanner.title').closest('a');
      expect(bannerLink).toHaveAttribute('href', '/ja/onboarding');
    });
  });

  describe('page content', () => {
    it('renders the page title', async () => {
      await renderPage();

      expect(screen.getByRole('heading', { level: 1, name: 'title' })).toBeInTheDocument();
    });

    it('renders the why blindfold chess section', async () => {
      await renderPage();

      expect(screen.getByText('whyBlindfoldChess.title')).toBeInTheDocument();
    });

    it('renders the what you can do section', async () => {
      await renderPage();

      expect(screen.getByText('whatYouCanDo.title')).toBeInTheDocument();
    });
  });
});
