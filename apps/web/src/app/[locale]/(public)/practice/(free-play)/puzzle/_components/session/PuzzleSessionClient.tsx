'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link, useRouter } from '@/i18n/routing';
import { executeMove } from '@blindfold-chess/features/chess-core';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import * as Sentry from '@sentry/nextjs';

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

import { savePuzzleResult } from '../../_actions/savePuzzleResult';
import { CircleMarker } from '../CircleMarker';

type Attempt = { move: string; isCorrect: boolean };

type Props = {
  solutions: PuzzleSolutionMove[][];
  positionId: string;
  fen: string;
  positionTitle: string;
  /**
   * Pieces-info card (white/black to move + piece lists). Passed in as a
   * pre-rendered node from the server page so the shared `PiecesInfo`
   * component is reused as-is here.
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
   * Guards against double-invocation of `finishSolve` (e.g. StrictMode
   * re-mount, fast rerenders). Mirrors the `savedRef` pattern used in
   * position-memory's `SinglePositionSession` and `useChallengeResultSave`,
   * so the EXP-grant Server Action is invoked at most once per solved run.
   */
  const savedRef = useRef(false);
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

  function finishSolve(solutionLine: string, attempts: Attempt[], playerMoveCount: number) {
    if (savedRef.current) return;
    savedRef.current = true;

    try {
      sessionStorage.setItem(
        `puzzle_result_${positionId}`,
        JSON.stringify({ attempts, solutionLine, fen, peekCount })
      );
    } catch {
      // sessionStorage may be unavailable
    }
    setIsNavigatingToResult(true);

    const baseUrl = `/practice/puzzle/${positionId}/result`;
    const incorrectAttempts = attempts.filter((a) => !a.isCorrect).length;

    // Fire the EXP grant in parallel with the auto-navigate timer. We capture
    // the resulting `expEventId` in a closure variable so the eventual
    // `router.push` can append `?grant=<id>` if the save resolves before the
    // 1s feedback delay elapses. If it doesn't (slow network, error), the
    // grant is still persisted DB-side — only the result page's EXP display
    // misses out on this navigation, and it is acceptable degradation.
    let expEventId: string | undefined;
    void savePuzzleResult({
      playerMoveCount,
      incorrectAttempts,
      peekCount,
    })
      .then((result) => {
        if (result.success && result.expEventId) {
          expEventId = result.expEventId;
        }
      })
      .catch((err) => {
        Sentry.captureException(err);
      });

    setTimeout(() => {
      const finalUrl = expEventId ? `${baseUrl}?grant=${encodeURIComponent(expEventId)}` : baseUrl;
      router.push(finalUrl);
    }, AUTO_NAVIGATE_DELAY_MS);
  }

  function handleSubmit(move: AlgebraicNotation): boolean {
    const trimmed = move.trim();
    if (!trimmed || isSolved) return false;

    const nextPlayerIndex = session.playerMoves.length;

    // Run the user's input through chess.js FIRST. We rely on this for two
    // things at once:
    //   (a) legality check — illegal SAN against the current position is
    //       rejected outright (afterPlayer === null), and
    //   (b) SAN normalization — chess.js fills in missing capture marks
    //       (`x`), check marks (`+`), and checkmate marks (`#`) and returns
    //       the canonical SAN via `moveResult.san`. Matching against that
    //       canonical form means a user typing `Qe6` for a stored solution
    //       of `Qxe6+` no longer gets bounced as "incorrect" — the report
    //       a user filed about being stuck on a puzzle for 10 minutes
    //       trying to type the exact decorations was caused by the previous
    //       string-equality check on the raw input.
    //
    // The user's original typed input is still preserved in `attempt.move`
    // so the result page shows what they actually typed; correctness is
    // judged on the canonical SAN.
    const afterPlayer = executeMove(session.currentFen, trimmed);
    if (!afterPlayer) {
      const attempt: Attempt = { move: trimmed, isCorrect: false };
      setSession({ ...session, attempts: [...session.attempts, attempt] });
      setError(t('incorrect'));
      return false;
    }

    const canonicalSan = afterPlayer.moveResult.san;

    // Which solution lines accept this move at the current player slot? If we
    // have already locked to a line, restrict to it; otherwise scan all.
    const candidates =
      session.lockedSolutionIndex !== null
        ? [session.lockedSolutionIndex]
        : parsedSolutions.map((_, i) => i);

    // Both sides need to be canonical for the comparison to be sound.
    // The user's input is canonicalized above; the stored solution SAN is
    // canonicalized here by feeding it through chess.js against the same
    // pre-move FEN. Without this, a solution stored without check decoration
    // (e.g. `Rxd8`, when chess.js's canonical form for the same move is
    // `Rxd8+`) would never match — even when the user types the *exact*
    // string from the DB. Reproduced 2026-05-02 on puzzle
    // `d4f46cc3-dfbd-4c1b-bb8c-ed7a952f8a46` whose stored solution `Rxd8`
    // could not be solved by any input. `executeMove` is null only if the
    // server-stored SAN is itself illegal at this point in the line, which
    // would indicate corrupted puzzle data — we fail closed (no match) in
    // that case rather than crashing.
    const matchIdx = candidates.find((i) => {
      const expected = parsedSolutions[i]!.playerSlots[nextPlayerIndex];
      if (expected === undefined) return false;
      const expectedExec = executeMove(session.currentFen, expected);
      return expectedExec !== null && expectedExec.moveResult.san === canonicalSan;
    });

    const attempt: Attempt = { move: trimmed, isCorrect: matchIdx !== undefined };
    const updatedAttempts = [...session.attempts, attempt];

    if (matchIdx === undefined) {
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
      finishSolve(
        solutions[locked]!.map((m) => m.san).join(' '),
        updatedAttempts,
        solution.playerSlots.length
      );
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
  // Once the user lands a first correct move, `lockedSolutionIndex` pins the
  // active line and we know exactly how many player moves the puzzle has,
  // which lets us label progress as "(2/3)". Before locking — i.e. while the
  // user is still on their first move — there is no canonical total, but the
  // opponent-status branch only fires after a correct move so locking has
  // already happened by the time the badge is rendered. The conditional is
  // defensive in case this contract ever changes.
  const totalPlayerSlots =
    session.lockedSolutionIndex !== null
      ? parsedSolutions[session.lockedSolutionIndex]!.playerSlots.length
      : null;
  let titleContent: ReactNode;
  if (isNavigatingToResult) {
    titleContent = (
      <span data-testid="loading-title" className="text-muted-foreground">
        {tPlay('loading')}
      </span>
    );
  } else if (showOpponentStatus) {
    titleContent = (
      <span data-testid="opponent-status" className="inline-flex items-baseline gap-1.5">
        <CircleMarker color={opponentColor} />
        {/* Re-mounting via `key` is what retriggers the one-shot CSS
         *  animation: each new opponent reply gives a fresh element and so a
         *  fresh animation cycle, even when the SAN happens to repeat from
         *  the previous reply. `motion-safe:` makes the animation a no-op
         *  for users with `prefers-reduced-motion: reduce`. */}
        <span
          key={`opp-${playerMoveCount}`}
          data-testid="opponent-status-text"
          className="motion-safe:animate-title-highlight rounded px-1"
        >
          {t(opponentStatusKey, { move: session.lastOpponentMove! })}
        </span>
        {totalPlayerSlots !== null && (
          <span
            data-testid="opponent-progress"
            className="text-sm font-normal text-muted-foreground"
          >
            ({playerMoveCount}/{totalPlayerSlots})
          </span>
        )}
      </span>
    );
  } else {
    titleContent = positionTitle;
  }

  // Persistent reserved-height status slot below the input panel.
  // Showing the success message only on the final solve felt inconsistent
  // (intermediate correct moves got no acknowledgement) and the conditional
  // also caused layout shift the moment the puzzle was solved. Reserving
  // the slot height eliminates the CLS, and surfacing the message after
  // every accepted player move makes the feedback consistent across the
  // whole solve. `error === null` excludes the post-wrong-attempt window
  // (the MoveInputPanel itself surfaces the "Incorrect" message there);
  // `!isNavigatingToResult` avoids holding a stale "Correct" line on
  // screen during the auto-redirect to /result.
  const showCorrectFeedback =
    session.playerMoves.length > 0 && error === null && !isNavigatingToResult;

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
            //
            // The inline-peek board is constrained to the same width as
            // `games/play`'s `lg:col-span-2` of `lg:grid-cols-3 lg:gap-8`,
            // i.e. `(2W - 32px) / 3` where W is the PagePanel's inner
            // width — so the ChessBoard renders at the same size on both
            // pages on desktop. Only the board itself is constrained:
            // the surrounding pieces info, move input, status messages,
            // and peek button keep the original full-width layout. The
            // `mx-auto` centers the constrained board within the panel
            // (since there is no analog of the games/play moves panel to
            // fill the right side, left-aligning would leave a visually
            // unbalanced empty band).
            <div className="lg:mx-auto lg:max-w-[calc((200%_-_2rem)/3)]">
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
            </div>
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

          <p
            data-testid="correct-feedback"
            aria-live="polite"
            className="min-h-[1.25rem] text-sm font-medium"
          >
            {showCorrectFeedback && (
              <span className="text-green-600 dark:text-green-400">&#x2713; {t('correct')}</span>
            )}
          </p>

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
