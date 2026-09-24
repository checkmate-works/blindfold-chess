import { useState } from 'react';

import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DIFFICULTY_PRESETS } from '@/app/[locale]/(public)/preferences/_lib/difficulty-presets';
import {
  GamePreferencesProvider,
  type PerGamePreferences,
} from '@/app/[locale]/_contexts/GamePreferencesContext';

import { CollapsibleGameSettings } from './CollapsibleGameSettings';

expect.extend(matchers);

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations:
    () =>
    (key: string, values?: { level?: number }): string =>
      key === 'game.difficulty.level' ? `Level ${values?.level}` : key,
}));

// The real button drives driver.js against the DOM; the stub only has to show
// that starting the tour runs the caller's reveal hook.
vi.mock('@/app/[locale]/_components/HelpTourButton', () => ({
  HelpTourButton: ({ onBeforeStart }: { onBeforeStart?: () => void }) => (
    <button type="button" onClick={onBeforeStart}>
      start-tour
    </button>
  ),
}));

vi.mock('./BoardPreview', () => ({
  BoardPreview: () => <div data-testid="board-preview" />,
}));

const BASE: PerGamePreferences = {
  ...DIFFICULTY_PRESETS[2],
  highlightLastMove: true,
  showPieceDestinations: true,
  moveInputMode: 'text',
  aiReplyDuration: 0,
};

let latest: PerGamePreferences = BASE;

function Harness({ initial }: { initial: PerGamePreferences }) {
  const [settings, setSettings] = useState(initial);
  latest = settings;
  return (
    <CollapsibleGameSettings
      settings={settings}
      onSettingsChange={(updates) => setSettings((prev) => ({ ...prev, ...updates }))}
    />
  );
}

function renderSettings(initial: PerGamePreferences = BASE) {
  return render(
    <GamePreferencesProvider>
      <Harness initial={initial} />
    </GamePreferencesProvider>
  );
}

const ladder = () => within(screen.getByRole('radiogroup', { name: 'game.difficulty.title' }));
const levelRadio = (level: number) =>
  ladder().getByRole('radio', { name: new RegExp(`Level ${level}`) });
const customRadio = () => ladder().queryByRole('radio', { name: /^game\.difficulty\.custom/ });
const customizeToggle = () => screen.getByRole('button', { name: 'game.difficulty.customize' });

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('CollapsibleGameSettings difficulty ladder', () => {
  it('shows the matching level and keeps the detailed controls collapsed', () => {
    renderSettings();

    expect(levelRadio(2)).toBeChecked();
    expect(customRadio()).toBeNull();
    expect(customizeToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('switch', { name: 'game.hideBoard' })).toBeNull();
  });

  it('fills the settings from a level when one is picked', () => {
    renderSettings();

    fireEvent.click(levelRadio(4));

    expect(levelRadio(4)).toBeChecked();
    expect(latest).toMatchObject(DIFFICULTY_PRESETS[4]);
  });

  it('hides the preview only for the board-less level', () => {
    renderSettings();
    expect(screen.getByTestId('board-preview')).toBeInTheDocument();

    fireEvent.click(levelRadio(5));

    expect(screen.queryByTestId('board-preview')).toBeNull();
  });

  it('shows Custom and opens the detailed controls when no level matches', () => {
    renderSettings({ ...BASE, pieceShapeMode: 'circles-all' });

    expect(customRadio()).toBeChecked();
    expect(customizeToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('checkbox', { name: 'game.showAsStones' })).toBeChecked();
  });

  it('keeps the controls open after a Custom player picks a level', () => {
    renderSettings({ ...BASE, pieceColors: 'white-only' });

    fireEvent.click(levelRadio(1));

    expect(levelRadio(1)).toBeChecked();
    expect(customRadio()).toBeNull();
    expect(customizeToggle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('moves up the ladder when a detailed control lands on the next level', () => {
    renderSettings({ ...BASE, ...DIFFICULTY_PRESETS[3] });
    fireEvent.click(customizeToggle());

    fireEvent.click(screen.getByRole('checkbox', { name: 'game.hidePawns' }));

    expect(levelRadio(4)).toBeChecked();
  });

  it('opens the detailed controls when the guide tour starts', () => {
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'start-tour' }));

    expect(customizeToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('switch', { name: 'game.hideBoard' })).toBeInTheDocument();
  });
});
