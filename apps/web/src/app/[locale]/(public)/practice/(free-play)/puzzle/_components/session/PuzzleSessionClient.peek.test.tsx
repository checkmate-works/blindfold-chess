/**
 * Pieces-reveal coverage for `PuzzleSessionClient`'s peek board.
 *
 * The puzzle uses a single peek style — the inline "show board" accordion —
 * and that peek always reveals the FULL position, independent of the user's
 * general blindfold preferences (`showOwnPieces` / `showOpponentPieces`). This
 * file verifies the spread-override `{ ...preferences, showOwnPieces: true,
 * showOpponentPieces: true }` the component applies to the board.
 *
 * Lives apart from `PuzzleSessionClient.test.tsx` because it needs a per-test
 * mutable `useGamePreferences` mock + a prop-capturing `InlineBoardView` mock.
 */
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PuzzleSessionClient } from './PuzzleSessionClient';

const mockPush = vi.fn();
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

type Preferences = {
  showCoordinates: boolean;
  highlightLastMove: boolean;
  boardTheme: string;
  showOwnPieces: boolean;
  showOpponentPieces: boolean;
  pieceShapeMode: string;
  pieceColors: string;
  moveInputMode: string;
  enabledMoveInputModes: string[];
  buttonInputPieceLabel: string;
  enableAutoComplete: boolean;
  boardVisibility: 'always' | 'peek' | 'never';
};

const DEFAULT_PREFS: Preferences = {
  showCoordinates: true,
  highlightLastMove: true,
  boardTheme: 'monotone',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  moveInputMode: 'button',
  enabledMoveInputModes: ['button'],
  buttonInputPieceLabel: 'icon',
  enableAutoComplete: true,
  boardVisibility: 'peek',
};

let currentPreferences: Preferences = { ...DEFAULT_PREFS };

vi.mock('../../_actions/savePuzzleResult', () => ({
  savePuzzleResult: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/app/[locale]/_contexts/GamePreferencesContext', () => ({
  useGamePreferences: () => ({
    preferences: currentPreferences,
    isLoaded: true,
    isHydrated: true,
    updatePreferences: () => {},
    resetPreferences: () => {},
  }),
}));

// Capture the props InlineBoardView is invoked with so assertions can inspect
// the spread-override pieces flags.
const capturedInline: Array<Record<string, unknown>> = [];

vi.mock('@/app/[locale]/(public)/games/play/_components/InlineBoardView', () => ({
  InlineBoardView: (props: Record<string, unknown>) => {
    capturedInline.push(props);
    return <div data-testid="inline-board-view" />;
  },
}));

vi.mock('@/app/[locale]/_components/MoveInputPanel', () => ({
  MoveInputPanel: ({
    onSubmit,
  }: {
    onSubmit: (move: AlgebraicNotation) => boolean | void | Promise<void>;
  }) => (
    <div data-testid="move-input-panel">
      <button
        type="button"
        data-testid="stub-submit"
        onClick={() => onSubmit('Nf3' as AlgebraicNotation)}
      />
    </div>
  ),
}));

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function toSolutionMoves(line: string) {
  return line
    .split(/\s+/)
    .filter(Boolean)
    .map((san) => ({ san, note: null }));
}

function renderSession() {
  return render(
    <PuzzleSessionClient
      solutions={[toSolutionMoves('Nf3')]}
      positionId="puzzle-456"
      fen={STARTING_FEN}
      positionTitle="Sample Puzzle"
      piecesInfo={<div data-testid="stub-pieces-info" />}
      breadcrumb={<nav data-testid="stub-breadcrumb" />}
    />
  );
}

beforeEach(() => {
  mockPush.mockReset();
  sessionStorage.clear();
  capturedInline.length = 0;
  currentPreferences = { ...DEFAULT_PREFS };
});

afterEach(() => {
  cleanup();
});

describe('PuzzleSessionClient peek board — pieces reveal', () => {
  function lastInlinePrefs() {
    const props = capturedInline.at(-1);
    return props?.preferences as { showOwnPieces?: boolean; showOpponentPieces?: boolean };
  }

  it('forwards showOwnPieces=true / showOpponentPieces=true even when the user prefs say false', () => {
    currentPreferences.showOwnPieces = false;
    currentPreferences.showOpponentPieces = false;
    renderSession();
    expect(lastInlinePrefs().showOwnPieces).toBe(true);
    expect(lastInlinePrefs().showOpponentPieces).toBe(true);
  });

  it('keeps the reveal when the user prefs already say true (idempotent override)', () => {
    currentPreferences.showOwnPieces = true;
    currentPreferences.showOpponentPieces = true;
    renderSession();
    expect(lastInlinePrefs().showOwnPieces).toBe(true);
    expect(lastInlinePrefs().showOpponentPieces).toBe(true);
  });

  it('always renders the inline peek board (single peek style — no modal/never branch)', () => {
    currentPreferences.boardVisibility = 'always';
    renderSession();
    expect(capturedInline.length).toBeGreaterThan(0);
  });
});
