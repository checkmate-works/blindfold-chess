// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

import KnightTour from './KnightTour';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('@/i18n/use-safe-translations');
vi.mock('@/i18n/routing');

const STORAGE_KEY = 'knightTour_settings';

function startingSquareSelect(): HTMLSelectElement {
  return screen.getByRole('combobox') as HTMLSelectElement;
}

function blindfoldCheckbox(): HTMLInputElement {
  return screen.getByRole('checkbox') as HTMLInputElement;
}

/**
 * The setup screen's persisted choices, read through the shared settings hook
 * from the same key and JSON shape the screen has always written, so a choice
 * saved by an earlier build is still what the player sees.
 */
describe('KnightTour setup settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('picks up a choice stored under the existing key', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ startingSquare: 'e4', blindfoldMode: true })
    );

    render(<KnightTour />);

    await waitFor(() => expect(startingSquareSelect().value).toBe('e4'));
    expect(blindfoldCheckbox().checked).toBe(true);
  });

  it('falls back to the defaults for stored values that are not valid options', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ startingSquare: 'z9', blindfoldMode: 'yes' })
    );

    render(<KnightTour />);

    // Let the mount-time load land before asserting it changed nothing.
    await waitFor(() => expect(startingSquareSelect()).toBeTruthy());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(startingSquareSelect().value).toBe('random');
    expect(blindfoldCheckbox().checked).toBe(false);
  });

  it('stores a change in the same shape', async () => {
    render(<KnightTour />);

    fireEvent.change(startingSquareSelect(), { target: { value: 'c3' } });
    fireEvent.click(blindfoldCheckbox());

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual({
        startingSquare: 'c3',
        blindfoldMode: true,
      })
    );
  });

  it('does not write settings from an auto-started session', async () => {
    // The session board reads the global game preferences, hence the provider.
    render(
      <GamePreferencesProvider>
        <KnightTour autoStart initialStartingSquare="a1" />
      </GamePreferencesProvider>
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
