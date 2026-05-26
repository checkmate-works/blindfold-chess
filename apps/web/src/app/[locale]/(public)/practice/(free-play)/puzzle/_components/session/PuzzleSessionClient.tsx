'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaTimes } from 'react-icons/fa';

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

import { usePuzzleCompletion } from '../../_hooks/use-puzzle-completion';
import { usePuzzleScroll } from '../../_hooks/use-puzzle-scroll';
import type { SessionState } from '../../_lib/puzzle-match';
import { evaluatePuzzleSubmit, parseSolutionLines } from '../../_lib/puzzle-match';
import { writePuzzleResult } from '../../_lib/puzzle-result-storage';
import { CircleMarker } from '../CircleMarker';

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

/**
 * How long the transient submit-feedback chip stays mounted. Matches the
 * total length of the `feedback-pop` CSS keyframe in `globals.css` —
 * after this window the chip has fully faded out, so unmounting it
 * leaves no visual residue while resetting the React state for the next
 * submit (which gives a fresh `key` and a fresh animation cycle).
 */
const FEEDBACK_DURATION_MS = 1200;

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

  // Pre-parse the solution lines once so per-submit matching does not re-split
  // SAN tokens on every keystroke. See `parseSolutionLines` for why a puzzle's
  // player moves are always the even SAN indices.
  const parsedSolutions = useMemo(() => parseSolutionLines(solutions), [solutions]);

  const [session, setSession] = useState<SessionState>({
    currentFen: fen,
    playerMoves: [],
    lockedSolutionIndex: null,
    attempts: [],
    lastOpponentMove: null,
  });
  const [moveInput, setMoveInput] = useState('');
  /**
   * Transient red chip shown when a submit is rejected. The success path
   * has no chip on purpose — the PageTitle's "Black plays Nh2 (1/3)"
   * highlight + progress update already signals "your move was correct
   * and the puzzle has advanced", and a third green chip on top of that
   * was visually overpowering the title channel. Incorrect submits, on
   * the other hand, leave the PageTitle and input untouched, so the chip
   * is the *only* signal that anything happened — keep it.
   *
   * The chip auto-clears via `FEEDBACK_DURATION_MS`. Successful submits
   * also clear it (rather than leaving a stale red chip from the prior
   * wrong attempt sitting next to a now-correct state).
   *
   * `count` is incremented on every reject so the chip's React `key`
   * changes — that re-mounts the element and replays the CSS animation
   * when two wrong attempts fire back-to-back. Without the counter the
   * second submit would silently keep the existing element and skip the
   * animation.
   */
  const [incorrectFlash, setIncorrectFlash] = useState<{ count: number } | null>(null);
  const incorrectCountRef = useRef(0);
  const [peekCount, setPeekCount] = useState(0);
  const [isBoardVisible, setIsBoardVisible] = useState(false);

  // Owns isSolved + isNavigatingToResult + the post-solve handshake
  // (sessionStorage write, EXP grant Server Action, router.push to /result).
  const { isSolved, isNavigatingToResult, finishSolve } = usePuzzleCompletion({
    positionId,
    fen,
  });

  // Scroll the PageTitle into view whenever the opponent auto-plays a
  // new reply. See `usePuzzleScroll` for the full rationale on the
  // rAF + blur + dual-call shape this needs to land reliably on
  // mobile Safari / Chrome with a virtual keyboard open.
  const playerMoveCount = session.playerMoves.length;
  const titleAnchorRef = usePuzzleScroll({
    playerMoveCount,
    lastOpponentMove: session.lastOpponentMove,
  });

  // Unmount the incorrect-feedback chip once its CSS animation has
  // completed. Keying off `incorrectFlash.count` (rather than the whole
  // object) ensures the timer resets on every new wrong attempt, so
  // back-to-back rejects each get the full duration on screen instead of
  // the latest one being cut short by the previous timer.
  useEffect(() => {
    if (incorrectFlash === null) return;
    const timer = setTimeout(() => setIncorrectFlash(null), FEEDBACK_DURATION_MS);
    return () => clearTimeout(timer);
  }, [incorrectFlash]);

  const hasErrors = session.attempts.some((a) => !a.isCorrect);

  function flashIncorrect() {
    incorrectCountRef.current += 1;
    setIncorrectFlash({ count: incorrectCountRef.current });
  }

  function handleSubmit(move: AlgebraicNotation): boolean {
    const trimmed = move.trim();
    if (!trimmed || isSolved) return false;

    // All the move-matching logic lives in the pure `evaluatePuzzleSubmit`
    // engine; this handler only applies the resulting state + feedback.
    const outcome = evaluatePuzzleSubmit(session, trimmed, parsedSolutions, solutions);

    if (outcome.kind === 'rejected') {
      setSession(outcome.nextSession);
      flashIncorrect();
      return false;
    }

    setSession(outcome.nextSession);
    setMoveInput('');
    // Clear any leftover red chip from a prior wrong attempt — there is
    // no green chip on success (the PageTitle update is the success
    // signal), but a stale red chip would lie about the just-accepted
    // move if we did not reset here.
    setIncorrectFlash(null);

    if (outcome.solve) {
      finishSolve({ ...outcome.solve, peekCount });
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

          {/*
            Wrap the panel in a `relative` container so the transient
            incorrect-feedback chip can absolutely-position itself over
            the panel's top-right corner without affecting layout. The
            chip is the *only* acknowledgement the user gets for a wrong
            submit — the inline "Incorrect" string inside the panel was
            retired because it stayed on screen until the next submit and
            felt noisy. There is intentionally no chip on success: the
            PageTitle's highlight pulse + (N/total) progress update is
            already the success signal, and a green chip on top of that
            was visually overpowering the title channel.
            `error={null}` + `showInlineError={false}` prevent the panel
            from surfacing its own error string, so the chip is the sole
            negative-feedback channel. `aria-live` on the chip wrapper
            announces the rejection to screen-reader users.
          */}
          <div className="relative">
            <MoveInputPanel
              preferences={preferences}
              updatePreferences={updatePreferences}
              currentFen={session.currentFen}
              moveInput={moveInput}
              onMoveInputChange={setMoveInput}
              error={null}
              onErrorClear={() => {}}
              onSubmit={handleSubmit}
              disabled={isSolved}
              inputPlaceholder={tPlay('inputMove')}
              selectPlaceholder={tPlay('selectMove')}
              toggleTitle={tPlay('switchInputMode')}
              playerColor={playerColor}
              showLegalMovesHint={false}
              showInlineError={false}
            />
            <div aria-live="polite" className="pointer-events-none absolute -top-2 right-2 z-10">
              {incorrectFlash && (
                <span
                  key={`incorrect-${incorrectFlash.count}`}
                  data-testid="submit-feedback-incorrect"
                  className="motion-safe:animate-feedback-pop inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-700 shadow-sm dark:text-red-300"
                >
                  <FaTimes className="h-3 w-3" />
                  <span>{t('incorrect')}</span>
                </span>
              )}
            </div>
          </div>

          {hasErrors && !isSolved && (
            <Link
              href={`/practice/puzzle/${positionId}/result`}
              onClick={() => {
                // Save current attempts to sessionStorage even if not yet solved.
                // First solution line is a safe default here because the user has
                // not locked onto any specific line yet (or has only guessed wrong).
                writePuzzleResult(positionId, {
                  attempts: session.attempts,
                  solutionLine: (solutions[0] ?? []).map((m) => m.san).join(' '),
                  fen,
                  peekCount,
                });
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

        {/* Mirror `PageLayout`'s trailing block — see PageLayout.tsx. */}
        <div className="!mt-4 space-y-4">
          <Divider />
          {breadcrumb}
        </div>
      </PagePanel>
    </div>
  );
}
