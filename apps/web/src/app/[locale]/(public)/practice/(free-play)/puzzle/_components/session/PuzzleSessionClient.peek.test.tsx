/**
 * Peek-mode + pieces-reveal coverage for `PuzzleSessionClient`.
 *
 * Lives in a separate file from `PuzzleSessionClient.test.tsx` because we
 * need to vary the `useGamePreferences` mock per-test (peekMode toggle,
 * blindfold-flag overrides). Co-locating those mocks with the existing
 * file's static `peekMode: 'modal'` mock would either force every existing
 * test to opt into a more flexible mock helper or risk silent cross-test
 * leakage via `vi.mock` hoisting. Independent file = clean isolation.
 *
 * What this file covers:
 *   1. Reviewer follow-up B — `<BoardViewModal>` is gated behind
 *      `showModalPeekButton` and does NOT mount in inline-peek mode.
 *   2. Inline-peek path — `<InlineBoardView>` renders in inline mode and
 *      `<ShowBoardButton>` is hidden.
 *   3. Reviewer follow-up A — even when the user's blindfold preferences
 *      have `showOwnPieces: false` / `showOpponentPieces: false`, the
 *      puzzle's peek surfaces (modal AND inline) receive the spread-override
 *      `{ ...preferences, showOwnPieces: true, showOpponentPieces: true }`.
 *      The puzzle is meant to reveal the full position when the user opts
 *      to peek — independent of their general blindfold settings.
 */
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PuzzleSessionClient } from './PuzzleSessionClient';

const mockPush = vi.fn();
vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    onClick,
    children,
  }: {
    href: string;
    onClick?: () => void;
    children: React.ReactNode;
  }) => (
    <a data-testid="view-result-link" href={href} onClick={onClick}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Per-test preference fixture. Tests mutate `currentPreferences` before
// rendering; the mocked `useGamePreferences` reads it lazily so each render
// sees the up-to-date snapshot.
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
  peekMode: 'modal' | 'inline';
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
  peekMode: 'modal',
};

let currentPreferences: Preferences = { ...DEFAULT_PREFS };

// Mock the EXP-grant Server Action so the session component does not attempt
// to call into server-only modules (auth, db) from a jsdom test. Default to
// `{ success: true }` (no expEventId) — these peek tests do not assert on the
// post-solve grant URL, so the simplest stub is fine.
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

// Capture the props the child mocks were invoked with so assertions can
// inspect the spread-override pieces flags. We intentionally mount each
// component as a real React node (not a noop) so render order is correct,
// and we attach the props snapshot to a global ref reset between tests.
type CapturedProps = {
  modal: Array<Record<string, unknown>>;
  inline: Array<Record<string, unknown>>;
};
const captured: CapturedProps = { modal: [], inline: [] };

vi.mock('@/app/[locale]/(public)/games/play/_components/BoardViewModal', () => ({
  BoardViewModal: (props: Record<string, unknown> & { isOpen: boolean }) => {
    captured.modal.push(props);
    return props.isOpen ? <div data-testid="peek-modal" /> : null;
  },
}));

vi.mock('@/app/[locale]/(public)/games/play/_components/InlineBoardView', () => ({
  InlineBoardView: (props: Record<string, unknown>) => {
    captured.inline.push(props);
    return <div data-testid="inline-board-view" />;
  },
}));

vi.mock('@/app/[locale]/(public)/games/play/_components/ShowBoardButton', () => ({
  ShowBoardButton: ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
    <button
      type="button"
      aria-label="showBoard"
      onClick={onClick}
      disabled={disabled}
      data-testid="show-board-button"
    >
      showBoard
    </button>
  ),
}));

vi.mock('@/app/[locale]/_components/MoveInputPanel', () => ({
  MoveInputPanel: ({
    disabled,
    onSubmit,
  }: {
    disabled?: boolean;
    onSubmit: (move: AlgebraicNotation) => boolean | void | Promise<void>;
  }) => (
    <div data-testid="move-input-panel" data-disabled={disabled ? 'true' : 'false'}>
      <button
        type="button"
        data-testid="stub-submit"
        onClick={() => {
          onSubmit('Nf3' as AlgebraicNotation);
        }}
      />
    </div>
  ),
}));

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const POSITION_ID = 'puzzle-456';
const POSITION_TITLE = 'Sample Puzzle';

function toSolutionMoves(line: string) {
  return line
    .split(/\s+/)
    .filter(Boolean)
    .map((san) => ({ san, note: null }));
}

function renderSession(initialPeekHint: {
  peekMode: 'modal' | 'inline';
  boardVisibility: 'always' | 'peek' | 'never';
}) {
  return render(
    <PuzzleSessionClient
      solutions={[toSolutionMoves('Nf3')]}
      positionId={POSITION_ID}
      fen={STARTING_FEN}
      positionTitle={POSITION_TITLE}
      piecesInfo={<div data-testid="stub-pieces-info" />}
      breadcrumb={<nav data-testid="stub-breadcrumb" />}
      initialPeekHint={initialPeekHint}
    />
  );
}

beforeEach(() => {
  mockPush.mockReset();
  sessionStorage.clear();
  captured.modal = [];
  captured.inline = [];
  currentPreferences = { ...DEFAULT_PREFS };
});

afterEach(() => {
  cleanup();
});

describe('peekMode switching', () => {
  describe("peekMode === 'modal'", () => {
    it('renders the ShowBoardButton and mounts BoardViewModal (closed by default)', () => {
      currentPreferences.peekMode = 'modal';
      currentPreferences.boardVisibility = 'peek';

      renderSession({ peekMode: 'modal', boardVisibility: 'peek' });

      expect(screen.getByTestId('show-board-button')).toBeInTheDocument();
      // BoardViewModal mounts (the test-mock pushes its props onto
      // `captured.modal` on mount), but its DOM node only appears when
      // `isOpen` is true — we'll exercise the open path next.
      expect(captured.modal.length).toBeGreaterThan(0);
      // No inline board view in modal mode.
      expect(screen.queryByTestId('inline-board-view')).not.toBeInTheDocument();
    });

    it('opens the BoardViewModal when ShowBoardButton is clicked', () => {
      currentPreferences.peekMode = 'modal';
      currentPreferences.boardVisibility = 'peek';

      renderSession({ peekMode: 'modal', boardVisibility: 'peek' });

      expect(screen.queryByTestId('peek-modal')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('show-board-button'));
      expect(screen.getByTestId('peek-modal')).toBeInTheDocument();
    });
  });

  describe("peekMode === 'inline'", () => {
    it('renders the InlineBoardView and does NOT render the ShowBoardButton', () => {
      currentPreferences.peekMode = 'inline';
      currentPreferences.boardVisibility = 'peek';

      renderSession({ peekMode: 'inline', boardVisibility: 'peek' });

      expect(screen.getByTestId('inline-board-view')).toBeInTheDocument();
      expect(screen.queryByTestId('show-board-button')).not.toBeInTheDocument();
    });

    it('does NOT mount BoardViewModal at all (Reviewer follow-up B mount-gating)', () => {
      // Regression guard for the Reviewer follow-up that wraps
      // `<BoardViewModal>` in `{showModalPeekButton && (...)}`. Before that
      // change, the modal mounted in inline mode (just with `isOpen=false`),
      // wasting a render cycle on an unused tree. After the gate, the
      // modal's render fn must not run at all in inline mode.
      currentPreferences.peekMode = 'inline';
      currentPreferences.boardVisibility = 'peek';

      renderSession({ peekMode: 'inline', boardVisibility: 'peek' });

      // The mock pushes props onto `captured.modal` every time the modal
      // component renders. Length === 0 proves the gate prevented mount.
      expect(captured.modal.length).toBe(0);
    });
  });

  describe('SSR initialPeekHint (pre-hydration path)', () => {
    // Note: the existing component's `useGamePreferences` mock returns
    // `isHydrated: true`, so the post-hydration branch is what we cover
    // here. The pre-hydration branch is exercised indirectly by the
    // `games/play` `_lib/preferences.test.ts` against `shouldShow*` —
    // we only verify the post-hydration end of the wiring is correct.

    it('honors the hydrated preferences over the initialPeekHint when isHydrated=true', () => {
      // initialPeekHint says modal, but the user's hydrated preference is
      // inline → inline wins (mirroring `PlayPageClient`'s skeleton swap).
      currentPreferences.peekMode = 'inline';

      renderSession({ peekMode: 'modal', boardVisibility: 'peek' });

      expect(screen.getByTestId('inline-board-view')).toBeInTheDocument();
      expect(screen.queryByTestId('show-board-button')).not.toBeInTheDocument();
    });
  });
});

describe('pieces-reveal override (Reviewer follow-up A)', () => {
  // The puzzle session always reveals all pieces when the user opts to peek,
  // regardless of their blindfold-mode `showOwnPieces` / `showOpponentPieces`
  // settings. This contrasts with `games/play`, which respects the user's
  // blindfold preferences in its peek view. The override is implemented as
  // `{ ...preferences, showOwnPieces: true, showOpponentPieces: true }` at
  // both the BoardViewModal and InlineBoardView call sites.

  it('forwards showOwnPieces=true / showOpponentPieces=true to BoardViewModal even when the user prefs say false', () => {
    currentPreferences.peekMode = 'modal';
    currentPreferences.showOwnPieces = false;
    currentPreferences.showOpponentPieces = false;

    renderSession({ peekMode: 'modal', boardVisibility: 'peek' });

    expect(captured.modal.length).toBeGreaterThan(0);
    const lastModalProps = captured.modal[captured.modal.length - 1]!;
    const passedPrefs = lastModalProps.preferences as Preferences | undefined;
    expect(passedPrefs).toBeDefined();
    expect(passedPrefs!.showOwnPieces).toBe(true);
    expect(passedPrefs!.showOpponentPieces).toBe(true);
    // Other prefs are still spread through, so non-blindfold settings
    // (boardTheme, etc.) reach the modal unchanged.
    expect(passedPrefs!.boardTheme).toBe('monotone');
  });

  it('forwards showOwnPieces=true / showOpponentPieces=true to InlineBoardView even when the user prefs say false', () => {
    currentPreferences.peekMode = 'inline';
    currentPreferences.showOwnPieces = false;
    currentPreferences.showOpponentPieces = false;

    renderSession({ peekMode: 'inline', boardVisibility: 'peek' });

    expect(captured.inline.length).toBeGreaterThan(0);
    const lastInlineProps = captured.inline[captured.inline.length - 1]!;
    const passedPrefs = lastInlineProps.preferences as Preferences | undefined;
    expect(passedPrefs).toBeDefined();
    expect(passedPrefs!.showOwnPieces).toBe(true);
    expect(passedPrefs!.showOpponentPieces).toBe(true);
    expect(passedPrefs!.boardTheme).toBe('monotone');
  });

  it('still forwards showOwnPieces=true / showOpponentPieces=true when the user prefs already say true (idempotent override)', () => {
    currentPreferences.peekMode = 'modal';
    currentPreferences.showOwnPieces = true;
    currentPreferences.showOpponentPieces = true;

    renderSession({ peekMode: 'modal', boardVisibility: 'peek' });

    const lastModalProps = captured.modal[captured.modal.length - 1]!;
    const passedPrefs = lastModalProps.preferences as Preferences | undefined;
    expect(passedPrefs!.showOwnPieces).toBe(true);
    expect(passedPrefs!.showOpponentPieces).toBe(true);
  });
});
