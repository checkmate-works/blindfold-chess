import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { StandardGameForm } from './StandardGameForm';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/en',
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock next-intl/navigation (used by @/i18n/routing via barrel exports)
vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: 'a',
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderWithProvider(locale: 'en' | 'ja' = 'en') {
  return render(
    <GamePreferencesProvider>
      <StandardGameForm locale={locale} />
    </GamePreferencesProvider>
  );
}

describe('StandardGameForm', () => {
  it('renders color selector with white and black options', () => {
    renderWithProvider();

    expect(screen.getByText('playAsWhite')).toBeInTheDocument();
    expect(screen.getByText('playAsBlack')).toBeInTheDocument();
  });

  it('renders skill level selector', () => {
    renderWithProvider();

    expect(screen.getByText('selectLevel')).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('renders start game button', () => {
    renderWithProvider();

    expect(screen.getByText('startGame')).toBeInTheDocument();
  });

  it('defaults to white color and skill level 5', () => {
    renderWithProvider();

    // White should have active styling
    const whiteButton = screen.getByText('playAsWhite').closest('button')!;
    expect(whiteButton.className).toContain('border-foreground');

    // Skill level select should default to 5
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('5');
  });

  it('navigates to play page with default params on start', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('startGame'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('/en/play?');
    expect(url).toContain('color=white');
    expect(url).toContain('skillLevel=5');
  });

  it('navigates with selected black color', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('playAsBlack'));
    fireEvent.click(screen.getByText('startGame'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('color=black');
  });

  it('navigates with changed skill level', () => {
    renderWithProvider();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '10' } });
    fireEvent.click(screen.getByText('startGame'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('skillLevel=10');
  });

  it('uses locale in the navigation URL', () => {
    renderWithProvider('ja');

    fireEvent.click(screen.getByText('startGame'));

    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('/ja/play?');
  });

  it('disables start button after clicking (loading state)', () => {
    renderWithProvider();

    const startButton = screen.getByText('startGame').closest('button')!;
    fireEvent.click(startButton);

    // After click, button should be disabled (loading)
    expect(startButton).toBeDisabled();
  });

  it('renders all 20 skill level options', () => {
    renderWithProvider();

    const select = screen.getByRole('combobox');
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(20);
  });
});
