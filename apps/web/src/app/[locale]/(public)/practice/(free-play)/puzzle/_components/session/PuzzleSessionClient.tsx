'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link, useRouter } from '@/i18n/routing';
import { executeMove } from '@blindfold-chess/features/chess-core';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';
import type { PeekPreferenceHint } from '@/lib/games/peek-cookie';

import { BoardViewModal } from '@/app/[locale]/(public)/games/play/_components/BoardViewModal';
import { InlineBoardView } from '@/app/[locale]/(public)/games/play/_components/InlineBoardView';
import { ShowBoardButton } from '@/app/[locale]/(public)/games/play/_components/ShowBoardButton';
import {
  shouldShowInlinePeekHeader,
  shouldShowModalPeekButton,
} from '@/app/[locale]/(public)/games/play/_lib';
import { Divider } from '@/app/[locale]/_components/Divider';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { CircleMarker } from '../CircleMarker';

type Attempt = { move: string; isCorrect: boolean };

type Props = {
  solutions: PuzzleSolutionMove[][];
  positionId: string;
  fen: string;
  positionTitle: string;
  /**
   * Pieces-info card (white/black to move + piece lists). Passed in as a
   * server-rendered node so the same `PuzzlePiecesInfo` component used on
   * the puzzle detail page can be reused as-is here without duplicating its
   * locale-aware translations.
   */
  piecesInfo: ReactNode;
  /**
   * Breadcrumb rendered at the bottom of the page panel. Passed as a prop
   * from the server page so locale-aware `<Breadcrumb>` (a server component)
   * doesn't have to cross the client boundary. Mirrors the `games/play`
   * `PlayPageClient` shape where `breadcrumb` is injected the same way.
   */
  breadcrumb: ReactNode;
  /**
   * Server-resolved board-peek hint from the `bfc_peek_pref` cookie. Used
   * to pick the correct peek-mode rendering path on first paint, mirroring
   * the `initialPeekHint` flow in `games/play/_components/PlayPageClient`.
   */
  initialPeekHint: PeekPreferenceHint;
};

const AUTO_NAVIGATE_DELAY_MS = 1000;

type SessionState = {
  currentFen: string;
  playerMoves: string[];
  lockedSolutionIndex: number | null;
  attempts: Attempt[];
  /**
   * SAN of the opponent's most recent auto-played reply, or `null` before the
   * first player move. Surfaced in the UI as a `"White plays Nh2"` status
   * line so the user isn't left wondering how the position advanced between
   * their own moves. Mirrors the `aiPlayed` status pattern in `games/play`.
   */
  lastOpponentMove: string | null;
};

export function PuzzleSessionClient({
  solutions,
  positionId,
  fen,
  positionTitle,
  piecesInfo,
  breadcrumb,
  initialPeekHint,
}: Props) {
  const t = useTranslations('practice.puzzle.session');
  const tPlay = useTranslations('play');
  const tResult = useTranslations('practice.puzzle.result');
  const router = useRouter();
  const { preferences, updatePreferences, isHydrated } = useGamePreferences();

  // Pre-hydration: trust the cookie hint (server-resolved). Post-hydration:
  // trust the localStorage-backed `preferences`. Mirrors `PlayClient`'s
  // `skeletonShowInlinePeekHeader` / `skeletonShowModalPeekButton` pattern.
  const showModalPeekButton = isHydrated
    ? shouldShowModalPeekButton(preferences)
    : shouldShowModalPeekButton(initialPeekHint);
  const showInlinePeek = isHydrated
    ? shouldShowInlinePeekHeader(preferences)
    : shouldShowInlinePeekHeader(initialPeekHint);

  const playerColor: 'w' | 'b' = isBlackToMoveFromFen(fen) ? 'b' : 'w';

  // Pre-extract each solution's SAN tokens and its player-move slots so per-submit
  // matching is O(solutions * 1) rather than re-parsing on every keystroke.
  //
  // A puzzle's stored solution always starts with the player's move (that's
  // the whole point of a puzzle), so the player's moves sit at indices 0, 2,
  // 4, … and the opponent's replies at 1, 3, 5, … — regardless of which side
  // (white or black) the puzzle is set up for. We can't use
  // `getPlayerMovesFromSequence(moves, playerColor)` from chess-core here:
  // that helper is a PGN utility that assumes white always plays index 0, so
  // feeding it a black-to-move puzzle ("h5 Nh2 Bg3", playerColor='b') would
  // return `['Nh2']` and reject the correct first move `h5`.
  const parsedSolutions = useMemo(
    () =>
      solutions.map((line) => {
        const moves = line.map((m) => m.san) as AlgebraicNotation[];
        const playerSlots = moves.filter((_, i) => i % 2 === 0);
        return { moves, playerSlots };
      }),
    [solutions]
  );

  const [session, setSession] = useState<SessionState>({
    currentFen: fen,
    playerMoves: [],
    lockedSolutionIndex: null,
    attempts: [],
    lastOpponentMove: null,
  });
  const [moveInput, setMoveInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [peekCount, setPeekCount] = useState(0);
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  /**
   * Flipped to `true` in the short window between the puzzle being solved
   * and the router.push to /result completing, so the PageTitle can show
   * "Loading..." instead of the stale puzzle name. Mirrors the
   * `isInitializing → t('loading')` branch in `PlayPageClient.tsx`.
   */
  const [isNavigatingToResult, setIsNavigatingToResult] = useState(false);

  // Scroll the PageTitle into view whenever the opponent auto-plays a new
  // reply. The MoveInputPanel sits below the fold on narrow viewports, so
  // without this the user never sees the PageTitle's "White plays Nh2"
  // announcement — they stay focused on the input they just submitted.
  //
  // Why this shape: earlier attempts ran `scrollIntoView` directly in the
  // effect, but on mobile / narrow viewports the post-submit DOM mutation
  // (error-message clear, legal-moves hint toggle, etc.) can happen on the
  // same commit, and Safari / Chrome-on-iOS will silently no-op a smooth
  // scroll requested mid-commit. Deferring to `requestAnimationFrame`
  // guarantees layout is flushed and paint has started before we ask the
  // browser to scroll — after that the scroll always lands.
  //
  // We also explicitly blur `document.activeElement` first: when the user
  // submits via the text input, the on-screen keyboard can keep the input
  // pinned to the visual viewport, which causes `scrollIntoView` to align
  // against the keyboard's offset instead of the real page top. Blurring
  // collapses the virtual keyboard; the subsequent rAF then scrolls the
  // fully-collapsed viewport.
  //
  // `scrollIntoView` is used with a `window.scrollTo` fallback computed from
  // `getBoundingClientRect().top + window.scrollY`, so if a future layout
  // introduces an overflow-scroll ancestor that breaks `scrollIntoView` we
  // still have a deterministic document-level scroll path.
  //
  // Dependency uses `playerMoves.length` rather than `lastOpponentMove`
  // itself: if the same opponent SAN happens to come up twice in a row
  // (transposition into the same reply), the primitive string comparison
  // would treat it as unchanged and skip the scroll; keying off the move
  // count instead refires on every accepted player move.
  const titleAnchorRef = useRef<HTMLDivElement>(null);
  const playerMoveCount = session.playerMoves.length;
  useEffect(() => {
    if (playerMoveCount === 0) return;
    if (session.lastOpponentMove === null) return;

    // Collapse the virtual keyboard / drop focus from the move input so the
    // scroll target is measured against the layout viewport, not the visual
    // viewport pinned to the focused input.
    if (typeof document !== 'undefined') {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) {
        active.blur();
      }
    }

    // Wait one animation frame so React's commit is flushed and the layout
    // engine has the up-to-date PageTitle content ("White plays Nh2") when
    // we measure / scroll.
    const raf = requestAnimationFrame(() => {
      const anchor = titleAnchorRef.current;
      if (!anchor) return;

      // Dual-call strategy: run `scrollIntoView` (works in the common case,
      // walks up the ancestor chain to find a scroll container) AND an
      // imperative `window.scrollTo` by computed Y. Running both is
      // idempotent — if the first one already landed at the right place the
      // second is a no-op; but if the first silently refuses (e.g. Safari's
      // treatment of smooth scroll under certain focus/virtual-keyboard
      // states), the second still succeeds.
      if (typeof anchor.scrollIntoView === 'function') {
        try {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          // Safari < 15.4 rejects the options object form; fall through to
          // the imperative path below.
        }
      }
      try {
        const y = anchor.getBoundingClientRect().top + window.scrollY;
        if (Math.abs(y - window.scrollY) > 1) {
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      } catch {
        // Ultimate fallback — positional `scrollTo` with no options.
        try {
          window.scrollTo(0, anchor.getBoundingClientRect().top + window.scrollY);
        } catch {
          if (document.documentElement) document.documentElement.scrollTop = 0;
        }
      }
    });
    return () => cancelAnimationFrame(raf);
    // `session.lastOpponentMove` is included so a single-move puzzle that
    // happens to have an opponent reply (player's sole move → auto reply →
    // solve) still triggers the scroll on that single transition; omitting
    // it would mean `playerMoveCount` changing from 0 to 1 without the
    // ref being populated (first render) misses the scroll on SSR hydration.
  }, [playerMoveCount, session.lastOpponentMove]);

  const hasErrors = session.attempts.some((a) => !a.isCorrect);

  function finishSolve(solutionLine: string, attempts: Attempt[]) {
    try {
      sessionStorage.setItem(
        `puzzle_result_${positionId}`,
        JSON.stringify({ attempts, solutionLine, fen, peekCount })
      );
    } catch {
      // sessionStorage may be unavailable
    }
    setIsNavigatingToResult(true);
    setTimeout(() => {
      router.push(`/practice/puzzle/${positionId}/result`);
    }, AUTO_NAVIGATE_DELAY_MS);
  }

  function handleSubmit(move: AlgebraicNotation): boolean {
    const trimmed = move.trim();
    if (!trimmed || isSolved) return false;

    const nextPlayerIndex = session.playerMoves.length;

    // Which solution lines accept this move at the current player slot? If we
    // have already locked to a line, restrict to it; otherwise scan all.
    const candidates =
      session.lockedSolutionIndex !== null
        ? [session.lockedSolutionIndex]
        : parsedSolutions.map((_, i) => i);

    const matchIdx = candidates.find(
      (i) => parsedSolutions[i]!.playerSlots[nextPlayerIndex] === trimmed
    );

    const attempt: Attempt = { move: trimmed, isCorrect: matchIdx !== undefined };
    const updatedAttempts = [...session.attempts, attempt];

    if (matchIdx === undefined) {
      setSession({ ...session, attempts: updatedAttempts });
      setError(t('incorrect'));
      return false;
    }

    // Accept the player move and advance FEN.
    const afterPlayer = executeMove(session.currentFen, trimmed);
    if (!afterPlayer) {
      // Should not happen — the solution line was pre-validated server-side.
      setSession({ ...session, attempts: updatedAttempts });
      setError(t('incorrect'));
      return false;
    }

    const locked = matchIdx;
    const solution = parsedSolutions[locked]!;
    const newPlayerMoves = [...session.playerMoves, trimmed];
    const playerMoveCount = newPlayerMoves.length;

    // Auto-play the opponent reply that follows this player move, if any.
    // Puzzle solutions always begin with the player's move, so the player's
    // N-th move (1-indexed) is at SAN index (N-1)*2 and the opponent's reply
    // at (N-1)*2 + 1. This is independent of `playerColor`.
    const justPlayedSanIndex = (playerMoveCount - 1) * 2;
    const opponentSanIndex = justPlayedSanIndex + 1;

    let fenAfter = afterPlayer.fen;
    let playedOpponentMove: string | null = null;
    if (opponentSanIndex < solution.moves.length) {
      const opponentMove = solution.moves[opponentSanIndex]!;
      const afterOpponent = executeMove(fenAfter, opponentMove);
      if (afterOpponent) {
        fenAfter = afterOpponent.fen;
        playedOpponentMove = opponentMove;
      }
    }

    const solved = playerMoveCount >= solution.playerSlots.length;
    setSession({
      currentFen: fenAfter,
      playerMoves: newPlayerMoves,
      lockedSolutionIndex: locked,
      attempts: updatedAttempts,
      lastOpponentMove: playedOpponentMove,
    });
    setMoveInput('');
    setError(null);

    if (solved) {
      setIsSolved(true);
      finishSolve(solutions[locked]!.map((m) => m.san).join(' '), updatedAttempts);
    }

    return true;
  }

  // Opponent status slot in the PageTitle — mirrors the `aiMoveDisplay`
  // pattern from `games/play/_components/PlayPageClient.tsx`, where the
  // PageTitle is a single-line status surface that switches between the
  // default page heading and transient "AI played X" announcements. Here
  // the PageTitle carries the puzzle's title by default and swaps to
  // "○ White plays Nh2" while the opponent reply is the freshest context.
  // When `isNavigatingToResult` is set (final solve + router.push pending)
  // the PageTitle shows "Loading..." to match the /result-bound transition.
  // When `isSolved` flips to true *without* navigation yet, the "Correct!"
  // confirmation below takes focus, so we revert the title to the puzzle
  // name instead of pinning the last opponent move there.
  const opponentColor: 'w' | 'b' = playerColor === 'w' ? 'b' : 'w';
  const opponentStatusKey = opponentColor === 'w' ? 'whitePlayed' : 'blackPlayed';
  const showOpponentStatus = session.lastOpponentMove !== null && !isSolved;
  let titleContent: ReactNode;
  if (isNavigatingToResult) {
    titleContent = (
      <span data-testid="loading-title" className="text-muted-foreground">
        {tPlay('loading')}
      </span>
    );
  } else if (showOpponentStatus) {
    titleContent = (
      <span data-testid="opponent-status" className="inline-flex items-center gap-1.5">
        <CircleMarker color={opponentColor} />
        <span>{t(opponentStatusKey, { move: session.lastOpponentMove! })}</span>
      </span>
    );
  } else {
    titleContent = positionTitle;
  }

  return (
    <div className="space-y-8">
      <div ref={titleAnchorRef} data-testid="title-anchor">
        <PageTitle>{titleContent}</PageTitle>
      </div>

      <PagePanel>
        <div className="space-y-4">
          {piecesInfo}

          {showInlinePeek && (
            // Puzzle peek always reveals all pieces — overrides blindfold prefs from games/play.
            <InlineBoardView
              fen={session.currentFen}
              playerSide={playerColor === 'b' ? 'black' : 'white'}
              flipped={playerColor === 'b'}
              lastMove={null}
              preferences={{ ...preferences, showOwnPieces: true, showOpponentPieces: true }}
              movesLength={0}
              currentPosition={-1}
              formattedPgn={[]}
              onPeek={() => setPeekCount((c) => c + 1)}
            />
          )}

          <MoveInputPanel
            preferences={preferences}
            updatePreferences={updatePreferences}
            currentFen={session.currentFen}
            moveInput={moveInput}
            onMoveInputChange={setMoveInput}
            error={error}
            onErrorClear={() => setError(null)}
            onSubmit={handleSubmit}
            disabled={isSolved}
            inputPlaceholder={tPlay('inputMove')}
            selectPlaceholder={tPlay('selectMove')}
            toggleTitle={tPlay('switchInputMode')}
            playerColor={playerColor}
            showLegalMovesHint={false}
          />

          {isSolved && (
            <p className="text-sm font-medium text-green-600 dark:text-green-400">{t('correct')}</p>
          )}

          {hasErrors && !isSolved && (
            <Link
              href={`/practice/puzzle/${positionId}/result`}
              onClick={() => {
                // Save current attempts to sessionStorage even if not yet solved.
                // First solution line is a safe default here because the user has
                // not locked onto any specific line yet (or has only guessed wrong).
                try {
                  const solutionLine = (solutions[0] ?? []).map((m) => m.san).join(' ');
                  sessionStorage.setItem(
                    `puzzle_result_${positionId}`,
                    JSON.stringify({
                      attempts: session.attempts,
                      solutionLine,
                      fen,
                      peekCount,
                    })
                  );
                } catch {
                  // sessionStorage may be unavailable
                }
              }}
            >
              <Button asChild variant="secondary" fullWidth>
                {tResult('viewResult')}
              </Button>
            </Link>
          )}

          {/* Action row matches the `games/play` `GameInProgressPanel`
              structure — same `ShowBoardButton` component, same flex layout —
              so the puzzle session and games/play look identical when the
              user has `peekMode='modal'`. Hidden under `peekMode='inline'`,
              where the inline accordion above already exposes the board. */}
          {showModalPeekButton && (
            <div className="flex gap-4 md:gap-2 justify-center">
              <ShowBoardButton
                onClick={() => {
                  setPeekCount((c) => c + 1);
                  setIsBoardVisible(true);
                }}
                disabled={isSolved}
              />
            </div>
          )}

          {showModalPeekButton && (
            <BoardViewModal
              isOpen={isBoardVisible}
              onClose={() => setIsBoardVisible(false)}
              fen={session.currentFen}
              playerSide={playerColor === 'b' ? 'black' : 'white'}
              flipped={playerColor === 'b'}
              lastMove={null}
              preferences={{ ...preferences, showOwnPieces: true, showOpponentPieces: true }}
              movesLength={0}
              currentPosition={-1}
              formattedPgn={[]}
            />
          )}
        </div>

        <Divider />

        {breadcrumb}
      </PagePanel>
    </div>
  );
}
