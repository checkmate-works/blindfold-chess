/**
 * Focused coverage for `OperationLogModal` — the two audit sections it
 * carries (Initial Settings, Change Log) and the i18n key routing across
 * them.
 *
 * Per-move operation counts moved into MovesPanel's inline popovers in
 * Phase 5b; the modal no longer renders that table, so the related tests
 * live alongside MovesPanel now.
 *
 * The translation mocks pass the key path through verbatim so assertions
 * can match on the literal key (e.g. `labelBoardVisibility`,
 * `boardVisibilities.always`). That is enough to verify the routing logic
 * without coupling tests to copy that may change.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PreferenceChangeLogEntry } from '@/lib/games/saved-game-types';

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
}) {
  return render(
    <OperationLogModal
      isOpen
      onClose={() => {}}
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

  it('renders all 8 setting rows when expanded with a complete snapshot', () => {
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
      'labelMoveInputMode',
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

  it('routes peekMode + moveInputMode through the Preferences.controls.* namespace', () => {
    renderModal({
      gamePreferences: { ...DEFAULT_PREFS, peekMode: 'inline', moveInputMode: 'button' },
    });

    fireEvent.click(screen.getByText('play.operationLog.initialSettings.title'));

    expect(screen.getByText('Preferences.controls.peekModes.inline')).toBeInTheDocument();
    expect(screen.getByText('Preferences.controls.moveInputModes.button')).toBeInTheDocument();
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

  it('renders an em-dash when a late-added field has undefined `from` (legacy snapshot)', () => {
    // `peekMode` / `moveInputMode` were promoted to per-game later than the
    // other fields, so the first mid-game edit on a legacy save records
    // `from: undefined`. Without the fallback this would render as the raw
    // i18n key `moveInputModes.undefined`. The writer in use-game-session
    // produces this shape via an `as PreferenceChangeLogEntry` cast that
    // hides the undefined from the type system, so we cast through unknown
    // here to mirror that reality.
    const log = [
      { atMoveIndex: 4, key: 'moveInputMode', from: undefined, to: 'select' },
      { atMoveIndex: 6, key: 'peekMode', from: undefined, to: 'inline' },
    ] as unknown as PreferenceChangeLogEntry[];
    renderModal({ preferenceChangeLog: log });

    fireEvent.click(screen.getByText('play.operationLog.changeLog.title'));

    const moveRow = screen.getByText('4').closest('tr')!;
    expect(moveRow.textContent).toMatch(/—/);
    expect(moveRow.textContent).toMatch(/Preferences\.controls\.moveInputModes\.select/);
    expect(moveRow.textContent).not.toMatch(/moveInputModes\.undefined/);

    const peekRow = screen.getByText('6').closest('tr')!;
    expect(peekRow.textContent).toMatch(/—/);
    expect(peekRow.textContent).toMatch(/Preferences\.controls\.peekModes\.inline/);
    expect(peekRow.textContent).not.toMatch(/peekModes\.undefined/);
  });

  it('renders enum transitions via the Preferences.* vocabulary', () => {
    const log: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 7, key: 'pieceShapeMode', from: 'normal', to: 'circles-own' },
      { atMoveIndex: 9, key: 'peekMode', from: 'modal', to: 'inline' },
      { atMoveIndex: 14, key: 'moveInputMode', from: 'text', to: 'button' },
    ];
    renderModal({ preferenceChangeLog: log });

    fireEvent.click(screen.getByText('play.operationLog.changeLog.title'));

    const shapeRow = screen.getByText('7').closest('tr')!;
    expect(shapeRow.textContent).toMatch(/Preferences\.game\.pieceShapes\.normal/);
    expect(shapeRow.textContent).toMatch(/Preferences\.game\.pieceShapes\.circles-own/);

    const peekRow = screen.getByText('9').closest('tr')!;
    expect(peekRow.textContent).toMatch(/Preferences\.controls\.peekModes\.modal/);
    expect(peekRow.textContent).toMatch(/Preferences\.controls\.peekModes\.inline/);

    const moveInputRow = screen.getByText('14').closest('tr')!;
    expect(moveInputRow.textContent).toMatch(/Preferences\.controls\.moveInputModes\.text/);
    expect(moveInputRow.textContent).toMatch(/Preferences\.controls\.moveInputModes\.button/);
  });
});
