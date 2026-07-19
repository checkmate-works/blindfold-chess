/**
 * Coverage for the change-log badge's move-number label and its
 * click-to-navigate behavior (jumps the review to the position the change
 * was made at, mirroring EffortStrip's per-move cells).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GamePlaySettings, PlaySettingsChangeEntry } from '@/lib/games/saved-game-types';

import { PlaySettingsChangeLog } from './PlaySettingsChangeLog';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

const baseSettings: GamePlaySettings = {
  boardVisibility: 'peek',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
};

afterEach(() => cleanup());

describe('PlaySettingsChangeLog', () => {
  it('labels the badge with the PGN-style move number, not the raw half-moves-played count', () => {
    // 52 half-moves played = black's 26th move (ply 51, 0-based).
    const log: PlaySettingsChangeEntry[] = [
      { atMoveIndex: 52, key: 'boardVisibility', to: 'always' },
    ];
    render(
      <PlaySettingsChangeLog
        playSettings={baseSettings}
        playSettingsLog={log}
        onSelectMove={vi.fn()}
      />
    );

    expect(screen.getByText('26...')).toBeInTheDocument();
    expect(screen.queryByText('52')).not.toBeInTheDocument();
  });

  it('jumps to the moves[] position right after the change point on click', () => {
    const onSelectMove = vi.fn();
    const log: PlaySettingsChangeEntry[] = [
      { atMoveIndex: 52, key: 'boardVisibility', to: 'always' },
    ];
    render(
      <PlaySettingsChangeLog
        playSettings={baseSettings}
        playSettingsLog={log}
        onSelectMove={onSelectMove}
      />
    );

    fireEvent.click(screen.getByText('26...'));

    expect(onSelectMove).toHaveBeenCalledWith(51);
  });

  it('falls back to the "Start" label and the initial board (-2) when the change predates move 1', () => {
    const onSelectMove = vi.fn();
    const log: PlaySettingsChangeEntry[] = [
      { atMoveIndex: 0, key: 'boardVisibility', to: 'always' },
    ];
    render(
      <PlaySettingsChangeLog
        playSettings={baseSettings}
        playSettingsLog={log}
        onSelectMove={onSelectMove}
      />
    );

    fireEvent.click(screen.getByText('operationLog.changeLog.atStart'));

    expect(onSelectMove).toHaveBeenCalledWith(-2);
  });
});
