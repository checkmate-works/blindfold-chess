'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaCheck, FaTimes } from 'react-icons/fa';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

import { InlineBoardView } from '@/app/[locale]/(public)/games/play/_components/InlineBoardView';
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
};

/**
 * How long the transient submit-feedback chip stays mounted. Matches the
 * total length of the `feedback-pop` CSS keyframe in `globals.css` —
 * after this window the chip has fully faded out, so unmounting it
 * leaves no visual residue while resetting the React state for the next
 * submit (which gives a fresh `key` and a fresh animation cycle).
 */
const FEEDBACK_DURATION_MS = 1200;

/**
 * Delay before the opponent's auto-reply is revealed on the board after a
 * correct move. The player's move lands immediately; the reply follows a beat
 * later, highlighted — so the two read as distinct moves instead of the reply
 * appearing simultaneously (which made it unclear which piece the opponent
 * moved). Mirrors the pace of the preview replay (`PuzzleSolutionReplay`), and
 * kept under `AUTO_NAVIGATE_DELAY_MS` so a solving line that ends on an
 * opponent reply still shows that reply before the result-page navigation.
 */
const OPPONENT_REPLY_REVEAL_MS = 700;

/**
 * Transient submit-feedback chip. `incorrect` is a red chip with an × icon;
 * `correct` (an accepted non-final move) is a green chip with a ✓ icon;
 * `solved` is a green chip whose label already carries the celebratory 🎉 (so
 * no separate icon). The `board` variant is larger and solid-filled for
 * legibility centered over the board; the `input` variant is the compact chip
 * pinned to the input panel. Re-mount via a changing `key` at the call site is
 * what replays the one-shot `feedback-pop` animation.
 */
function FeedbackChip({
  kind,
  variant,
  label,
}: {
  kind: 'incorrect' | 'correct' | 'solved';
  variant: 'board' | 'input';
  label: string;
}) {
  const positive = kind === 'correct' || kind === 'solved';
  const icon =
    kind === 'incorrect' ? (
      <FaTimes className={variant === 'board' ? 'h-4 w-4' : 'h-3 w-3'} />
    ) : kind === 'correct' ? (
      <FaCheck className={variant === 'board' ? 'h-4 w-4' : 'h-3 w-3'} />
    ) : null;
  const testId = `submit-feedback-${kind}${variant === 'board' ? '-board' : ''}`;

  if (variant === 'board') {
    return (
      <span
        data-testid={testId}
        className={`motion-safe:animate-feedback-pop inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold text-white shadow-md ${
          positive ? 'border-green-500/40 bg-green-600/90' : 'border-red-500/40 bg-red-500/90'
        }`}
      >
        {icon}
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span
      data-testid={testId}
      className={`motion-safe:animate-feedback-pop inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${
        positive
          ? 'border-green-500/30 bg-green-500/15 text-green-700 dark:text-green-300'
          : 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300'
      }`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

export function PuzzleSessionClient({
  solutions,
  positionId,
  fen,
  positionTitle,
  piecesInfo,
  breadcrumb,
}: Props) {
  const t = useTranslations('practice.puzzle.session');
  const tPlay = useTranslations('play');
  const { preferences, updatePreferences } = useGamePreferences();

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
  const [feedback, setFeedback] = useState<{
    count: number;
    /** Where the move was entered — the feedback surfaces next to that input:
     *  on the board for a drag/click, at the panel otherwise. */
    source: 'board' | 'input';
    /** `incorrect` for a rejected move; `correct` for an accepted non-final
     *  move (a plain positive ring while the opponent's reply is pending);
     *  `solved` for the puzzle's final correct move — the celebratory chip that
     *  fills the ~1s window before the result-page navigation. */
    kind: 'incorrect' | 'correct' | 'solved';
  } | null>(null);
  const feedbackCountRef = useRef(0);
  const [peekCount, setPeekCount] = useState(0);

  /**
   * Board display, decoupled from `session.currentFen` so the opponent's reply
   * can be revealed a beat after the player's move (highlighted), instead of
   * both landing at once. `session.currentFen` stays the logical position for
   * move-input legality; this drives only what the board paints.
   */
  const [boardView, setBoardView] = useState<{
    fen: string;
    lastMove: { from: string; to: string } | null;
  }>({ fen, lastMove: null });
  /** True while the opponent's reply reveal is pending — locks input so the
   *  player can't answer before seeing which piece moved. */
  const [isOpponentReplying, setIsOpponentReplying] = useState(false);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear a pending reply-reveal timer on unmount (e.g. the solve navigation
  // tears the page down mid-reveal) so it never fires against a gone component.
  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

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

  // Unmount the feedback chip once its CSS animation has completed. Keying off
  // `feedback.count` (rather than the whole object) ensures the timer resets on
  // every new flash, so back-to-back flashes each get the full duration on
  // screen instead of the latest one being cut short by the previous timer.
  useEffect(() => {
    if (feedback === null) return;
    const timer = setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
    return () => clearTimeout(timer);
  }, [feedback]);

  function flashFeedback(kind: 'incorrect' | 'correct' | 'solved', source: 'board' | 'input') {
    feedbackCountRef.current += 1;
    setFeedback({ count: feedbackCountRef.current, source, kind });
  }

  /**
   * `source` records where the move came from so a rejection's feedback shows
   * next to that input — a drag/click on the board flashes over the board (so
   * the eyes stay there), while the panel's text/select/button input flashes
   * at the panel. Defaults to `'input'` since `MoveInputPanel` calls this
   * bare `onSubmit(move)`.
   */
  function handleSubmit(move: AlgebraicNotation, source: 'board' | 'input' = 'input'): boolean {
    const trimmed = move.trim();
    // Ignore input while the opponent's reply is still animating in — the
    // position is mid-transition, so an answer now would race the reveal.
    if (!trimmed || isSolved || isOpponentReplying) return false;

    // All the move-matching logic lives in the pure `evaluatePuzzleSubmit`
    // engine; this handler only applies the resulting state + feedback.
    const outcome = evaluatePuzzleSubmit(session, trimmed, parsedSolutions, solutions);

    if (outcome.kind === 'rejected') {
      setSession(outcome.nextSession);
      flashFeedback('incorrect', source);
      return false;
    }

    setSession(outcome.nextSession);
    setMoveInput('');

    // Positive feedback for the accepted move, next to where it was entered:
    // the celebratory solved chip on the final move, or a plain "correct" ring
    // on an intermediate one. The intermediate ring stays up through the
    // opponent-reply delay below (so a manual-input player gets the same beat
    // of confirmation the board reveal gives), then clears as the reply lands.
    const solved = outcome.solve !== null;
    flashFeedback(solved ? 'solved' : 'correct', source);

    // Paint the player's move right away (highlighted). If the line has an
    // opponent reply, reveal it a beat later — highlighted — so the player can
    // see which piece the opponent moved instead of it landing instantly.
    setBoardView({ fen: outcome.fenAfterPlayer, lastMove: outcome.playerMove });

    if (outcome.opponentReply) {
      const reply = outcome.opponentReply;
      const fenAfterReply = outcome.nextSession.currentFen;
      setIsOpponentReplying(true);
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
      replyTimerRef.current = setTimeout(() => {
        setBoardView({ fen: fenAfterReply, lastMove: { from: reply.from, to: reply.to } });
        setIsOpponentReplying(false);
        replyTimerRef.current = null;
        // Drop the intermediate "correct" ring as the reply lands; the solved
        // feedback instead persists until the result-page navigation.
        if (!solved) setFeedback(null);
      }, OPPONENT_REPLY_REVEAL_MS);
    }

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

  // Feedback for moves entered through the panel (text / select / button) is
  // surfaced with the panel's own recall-style affordances — a red ring + inline
  // message (and its one-shot shake) on a miss, a green ring on the solving move
  // — which read far clearer than the small corner chip did. A drag/click on the
  // board still flashes its chip over the board (see `boardBadge`).
  const panelError =
    feedback?.source === 'input' && feedback.kind === 'incorrect' ? t('incorrect') : null;
  const panelSuccess =
    feedback?.source === 'input' && (feedback.kind === 'correct' || feedback.kind === 'solved');

  return (
    <div className="space-y-8">
      <div ref={titleAnchorRef} data-testid="title-anchor">
        <PageTitle>{titleContent}</PageTitle>
      </div>

      <PagePanel>
        <div className="space-y-4">
          {piecesInfo}

          {/* Puzzle board uses a single peek style: a collapsible "show board"
              accordion that always reveals all pieces (it overrides the
              blindfold piece prefs from games/play). Each expand counts as one
              peek. There is no modal / always / never variant here.

              The board is constrained to the same width as `games/play`'s
              `lg:col-span-2` of `lg:grid-cols-3 lg:gap-8`, i.e. `(2W - 32px)/3`
              where W is the PagePanel's inner width — so the ChessBoard renders
              at the same size on both pages on desktop. Only the board itself
              is constrained; the surrounding pieces info, move input, and status
              keep the full-width layout. `mx-auto` centers it within the panel. */}
          <div className="lg:mx-auto lg:max-w-[calc((200%_-_2rem)/3)]">
            <InlineBoardView
              fen={boardView.fen}
              playerSide={playerColor === 'b' ? 'black' : 'white'}
              flipped={playerColor === 'b'}
              lastMove={boardView.lastMove}
              preferences={{ ...preferences, showOwnPieces: true, showOpponentPieces: true }}
              movesLength={0}
              currentPosition={-1}
              formattedPgn={[]}
              onPeek={() => setPeekCount((c) => c + 1)}
              // Once the board is peeked open, let the player answer directly on
              // it: a click/drag of an own piece submits that move just like the
              // text/select/button input. ChessBoard only emits legal moves, so
              // this runs the same correct/incorrect evaluation as handleSubmit.
              // Disabled while the opponent's reply is revealing so a move can't
              // be dropped onto a mid-transition position. `'board'` routes a
              // rejection's feedback onto the board instead of the input panel.
              onMove={
                isSolved || isOpponentReplying
                  ? undefined
                  : (san) => handleSubmit(san as AlgebraicNotation, 'board')
              }
              // A drag/click move flashes its feedback centered over the board
              // — where the player's attention is — rather than at the input
              // panel below: red "Incorrect" on a miss, the celebratory
              // "Correct! 🎉" on the solving move.
              boardBadge={
                feedback?.source === 'board' ? (
                  <FeedbackChip
                    key={`fb-board-${feedback.count}`}
                    kind={feedback.kind}
                    variant="board"
                    label={
                      feedback.kind === 'incorrect'
                        ? t('incorrect')
                        : feedback.kind === 'correct'
                          ? t('correctMove')
                          : t('correct')
                    }
                  />
                ) : undefined
              }
              badgeActive={feedback?.source === 'board'}
            />
          </div>

          {/*
            Wrap the panel in a `relative` container so the transient
            feedback chip can absolutely-position itself over the panel's
            top-right corner without affecting layout. `flex flex-col gap-3`
            spaces the panel's input area from its input-mode toggle button
            (which `MoveInputPanel` returns as a sibling), mirroring the
            `flex flex-col gap-6` wrapper the play surface uses.
            The input-source feedback chip carries both outcomes: a red
            "Incorrect" on a miss and the celebratory "Correct! 🎉" on the
            solving move (a wrong/right board move flashes over the board
            instead — see `boardBadge`). `error={null}` + `showInlineError=
            {false}` keep the panel from surfacing its own error string, so
            the chip is the sole in-panel feedback channel. `aria-live` on
            the chip wrapper announces the outcome to screen-reader users.
          */}
          <div className="relative flex flex-col gap-3">
            <MoveInputPanel
              preferences={preferences}
              updatePreferences={updatePreferences}
              currentFen={session.currentFen}
              moveInput={moveInput}
              onMoveInputChange={setMoveInput}
              error={panelError}
              // Editing the move clears the feedback (recall behaviour) so the
              // red ring / message doesn't linger over a fresh attempt.
              onErrorClear={() => setFeedback(null)}
              onSubmit={handleSubmit}
              disabled={isSolved || isOpponentReplying}
              inputPlaceholder={tPlay('inputMove')}
              selectPlaceholder={tPlay('selectMove')}
              toggleTitle={tPlay('switchInputMode')}
              playerColor={playerColor}
              showLegalMovesHint={false}
              success={panelSuccess}
            />
            <div aria-live="polite" className="pointer-events-none absolute -top-2 right-2 z-10">
              {/* Panel input feedback rides the input's own ring/inline message;
                  only the celebratory solved chip is surfaced here on top. */}
              {feedback?.source === 'input' && feedback.kind === 'solved' && (
                <FeedbackChip
                  key={`fb-input-${feedback.count}`}
                  kind="solved"
                  variant="input"
                  label={t('correct')}
                />
              )}
            </div>
          </div>

          {!isSolved && (
            // A give-up: bail out to the result page (which reveals the
            // solution) at any point, even before a first attempt. `size="lg"`
            // matches the other full-width action buttons in the flow so its
            // height lines up with them.
            <Link
              href={`/practice/puzzle/${positionId}/result`}
              onClick={() => {
                // Save whatever attempts exist (possibly none) to sessionStorage
                // so the result page can render. First solution line is a safe
                // default here because the user has not locked onto any specific
                // line yet (or has only guessed wrong).
                writePuzzleResult(positionId, {
                  attempts: session.attempts,
                  solutionLine: (solutions[0] ?? []).map((m) => m.san).join(' '),
                  fen,
                  peekCount,
                });
              }}
            >
              <Button asChild variant="secondary" size="lg" fullWidth>
                {t('showAnswer')}
              </Button>
            </Link>
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
