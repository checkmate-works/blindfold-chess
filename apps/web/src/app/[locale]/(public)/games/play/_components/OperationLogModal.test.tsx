/**
 * Focused coverage for `OperationLogModal` — the three audit sections
 * (Initial Settings, Change Log, per-move operations) and the i18n key
 * routing across them.
 *
 * The translation mocks pass the key path through verbatim so assertions
 * can match on the literal key (e.g. `labelBoardVisibility`,
 * `boardVisibilities.always`). That is enough to verify the routing logic
 * without coupling tests to copy that may change.
 */
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MoveOperationLog, PreferenceChangeLogEntry } from '@/lib/games/saved-game-types';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { OperationLogModal } from './OperationLogModal';

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

vi.mock('@/app/[locale]/_components/Modal', () => ({
  Modal: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid="modal" aria-label={title}>
        {children}
      </div>
    ) : null,
}));

const DEFAULT_PREFS: PerGamePreferences = {
  boardVisibility: 'peek',
  highlightLastMove: true,
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  peekMode: 'modal',
  moveInputMode: 'text',
};

function renderModal(overrides?: {
  gamePreferences?: PerGamePreferences;
  preferenceChangeLog?: PreferenceChangeLogEntry[];
  logs?: MoveOperationLog[];
  moves?: AlgebraicNotation[];
}) {
  return render(
    <OperationLogModal
      isOpen
      onClose={() => {}}
      logs={overrides?.logs ?? []}
      moves={(overrides?.moves ?? []) as AlgebraicNotation[]}
      playerSide="white"
      gamePreferences={overrides?.gamePreferences}
      preferenceChangeLog={overrides?.preferenceChangeLog}
    />
  );
}

afterEach(() => {
  cleanup();
});

describe('OperationLogModal — Initial Settings section', () => {
  it('shows the "not recorded" placeholder when gamePreferences is undefined and the section is expanded', () => {
    renderModal({ gamePreferences: undefined });

    fireEvent.click(screen.getByText('play.operationLog.initialSettings.title'));
    expect(screen.getByText('play.operationLog.initialSettings.notRecorded')).toBeInTheDocument();
  });

  it('renders all 7 setting rows when expanded with a complete snapshot', () => {
    renderModal({ gamePreferences: DEFAULT_PREFS });

    fireEvent.click(screen.getByText('play.operationLog.initialSettings.title'));

    // Each row label key resolves through the mocked translator.
    for (const labelKey of [
      'labelBoardVisibility',
      'labelHighlightLastMove',
      'labelShowOwnPieces',
      'labelShowOpponentPieces',
      'labelPieceShape',
      'labelPieceColor',
      'labelPeekMode',
    ]) {
      expect(screen.getByText(`play.operationLog.initialSettings.${labelKey}`)).toBeInTheDocument();
    }
  });

  it('routes enum values through the Preferences.game.* namespace', () => {
    renderModal({
      gamePreferences: {
        ...DEFAULT_PREFS,
        pieceShapeMode: 'circles-all',
        pieceColors: 'white-only',
      },
    });

    fireEvent.click(screen.getByText('play.operationLog.initialSettings.title'));

    expect(screen.getByText('Preferences.game.pieceShapes.circles-all')).toBeInTheDocument();
    expect(screen.getByText('Preferences.game.pieceColors.white-only')).toBeInTheDocument();
  });

  it('routes peekMode through the Preferences.controls.* namespace', () => {
    renderModal({ gamePreferences: { ...DEFAULT_PREFS, peekMode: 'inline' } });

    fireEvent.click(screen.getByText('play.operationLog.initialSettings.title'));

    expect(screen.getByText('Preferences.controls.peekModes.inline')).toBeInTheDocument();
  });

  it('renders booleans via the On/Off vocabulary', () => {
    renderModal({
      gamePreferences: { ...DEFAULT_PREFS, highlightLastMove: false, showOwnPieces: true },
    });

    fireEvent.click(screen.getByText('play.operationLog.initialSettings.title'));

    // Multiple booleans share the same on/off key; getAllByText covers both.
    expect(screen.getAllByText('play.operationLog.initialSettings.off').length).toBeGreaterThan(0);
    expect(screen.getAllByText('play.operationLog.initialSettings.on').length).toBeGreaterThan(0);
  });
});

describe('OperationLogModal — Change Log section', () => {
  it('shows the "no changes" placeholder when the log is undefined and the section is expanded', () => {
    renderModal({ preferenceChangeLog: undefined });

    fireEvent.click(screen.getByText('play.operationLog.changeLog.title'));
    expect(screen.getByText('play.operationLog.changeLog.noChanges')).toBeInTheDocument();
  });

  it('shows the "no changes" placeholder when the log is an empty array', () => {
    renderModal({ preferenceChangeLog: [] });

    fireEvent.click(screen.getByText('play.operationLog.changeLog.title'));
    expect(screen.getByText('play.operationLog.changeLog.noChanges')).toBeInTheDocument();
  });

  it('renders one row per entry with localized labels and from→to values', () => {
    const log: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 5, key: 'highlightLastMove', from: true, to: false },
      { atMoveIndex: 12, key: 'pieceColors', from: 'normal', to: 'white-only' },
      { atMoveIndex: 18, key: 'boardVisibility', from: 'peek', to: 'always' },
    ];
    renderModal({ preferenceChangeLog: log });

    fireEvent.click(screen.getByText('play.operationLog.changeLog.title'));

    // atMoveIndex column values
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();

    // Setting label routing
    expect(
      screen.getByText('play.operationLog.initialSettings.labelHighlightLastMove')
    ).toBeInTheDocument();
    expect(
      screen.getByText('play.operationLog.initialSettings.labelPieceColor')
    ).toBeInTheDocument();
    expect(
      screen.getByText('play.operationLog.initialSettings.labelBoardVisibility')
    ).toBeInTheDocument();
  });

  it('renders boolean transitions via the On/Off vocabulary in the change cell', () => {
    const log: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 3, key: 'showOwnPieces', from: true, to: false },
    ];
    renderModal({ preferenceChangeLog: log });

    fireEvent.click(screen.getByText('play.operationLog.changeLog.title'));

    // The change cell contains "On → Off" — assert by partial match since the
    // arrow is inline text alongside the two values.
    const row = screen.getByText('3').closest('tr');
    expect(row).toBeTruthy();
    expect(row!.textContent).toMatch(/play\.operationLog\.initialSettings\.on/);
    expect(row!.textContent).toMatch(/play\.operationLog\.initialSettings\.off/);
    expect(row!.textContent).toMatch(/→/);
  });

  it('renders enum transitions via the Preferences.* vocabulary', () => {
    const log: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 7, key: 'pieceShapeMode', from: 'normal', to: 'circles-own' },
      { atMoveIndex: 9, key: 'peekMode', from: 'modal', to: 'inline' },
    ];
    renderModal({ preferenceChangeLog: log });

    fireEvent.click(screen.getByText('play.operationLog.changeLog.title'));

    const shapeRow = screen.getByText('7').closest('tr')!;
    expect(shapeRow.textContent).toMatch(/Preferences\.game\.pieceShapes\.normal/);
    expect(shapeRow.textContent).toMatch(/Preferences\.game\.pieceShapes\.circles-own/);

    const peekRow = screen.getByText('9').closest('tr')!;
    expect(peekRow.textContent).toMatch(/Preferences\.controls\.peekModes\.modal/);
    expect(peekRow.textContent).toMatch(/Preferences\.controls\.peekModes\.inline/);
  });
});

describe('OperationLogModal — per-move operations table', () => {
  it('renders the "no logs" placeholder when the log array is empty', () => {
    renderModal({ logs: [] });

    expect(screen.getByText('play.operationLog.noLogs')).toBeInTheDocument();
  });

  it('renders one row per log entry, lining up the player move with the entry', () => {
    const logs: MoveOperationLog[] = [
      { inputMethod: 'text', peekCount: 1, undoCount: 0, movePeekCount: 0 },
      { inputMethod: 'button', peekCount: 0, undoCount: 1, movePeekCount: 2 },
    ];
    // White plays at indices 0 and 2 — log[0] aligns with move 'e4', log[1] with 'd4'.
    const moves = ['e4', 'e5', 'd4'] as AlgebraicNotation[];

    renderModal({ logs, moves });

    expect(screen.getByText('e4')).toBeInTheDocument();
    expect(screen.getByText('d4')).toBeInTheDocument();
    expect(screen.getByText('play.operationLog.inputMethodText')).toBeInTheDocument();
    expect(screen.getByText('play.operationLog.inputMethodButton')).toBeInTheDocument();
  });
});
