'use client';

import { useMemo, useState } from 'react';

import { ChessBoard } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

import type { BoardTheme } from '@/lib/games/board-themes';
import { foldBoardVisibility, playSettingsAtHalfMove } from '@/lib/games/play-settings-log';
import type { GamePlaySettings, PlaySettingsChangeEntry } from '@/lib/games/saved-game-types';
import type { TerminationMark } from '@/lib/games/termination-mark';

import { HorizontalMoveList } from '@/app/[locale]/(public)/games/play/_components/HorizontalMoveList';
import {
  MOVE_NAV_SIDE_BUTTON_CLASS,
  MoveNavigationRow,
} from '@/app/[locale]/(public)/games/play/_components/MoveNavigationRow';
import { usePgnReplay } from '@/app/[locale]/_hooks/use-pgn-replay';

type Props = {
  moves: AlgebraicNotation[];
  startingFen: string;
  /** Final position, pre-computed server-side so opening at the end costs no replay. */
  finalFen: string;
  playerSide: Side;
  flipped: boolean;
  /** Cursor seed: -1 is the opening board, 0 the position after the first half-move. */
  initialIndex: number;
  boardTheme: BoardTheme;
  /** Start-of-game blindfold snapshot; null for a legacy or fully-sighted game. */
  playSettings: GamePlaySettings | null;
  playSettingsLog: PlaySettingsChangeEntry[] | null;
  /**
   * Whether to open reproducing the player's view. False either because the
   * embed asked for `?view=plain` or because this game hid nothing, in which
   * case the toggle is not rendered at all.
   */
  reproduceByDefault: boolean;
  /** Whether reproducing differs from revealing at any point in this game. */
  canReproduce: boolean;
  /** End-of-game badge for the final position; null when the game has none. */
  terminationMark: TerminationMark | null;
  terminationMarkLabel: string;
  attribution: {
    title: string;
    author: string | null;
    /** Canonical game page, campaign-tagged so embed referrals are countable. */
    href: string;
    siteName: string;
  };
};

/**
 * The embedded replay itself: a move strip, a board, a stepper, and one line
 * of attribution — nothing that mutates anything, since this runs in a frame
 * on a site we do not control.
 *
 * The board reproduces what the player could see at each position by default
 * (`foldBoardVisibility` per half-move, ghosts for hidden pieces), which is
 * the reason this widget exists rather than a link to any general chess
 * server: a reader of the article sees the blindfold, not just the moves.
 * `hidesAnyPiece` on the server decides whether the reveal toggle is even
 * offered, so a sighted game shows a plain board with no vestigial control.
 */
export function EmbedGameReplay({
  moves,
  startingFen,
  finalFen,
  playerSide,
  flipped: initialFlipped,
  initialIndex,
  boardTheme,
  playSettings,
  playSettingsLog,
  reproduceByDefault,
  canReproduce,
  terminationMark,
  terminationMarkLabel,
  attribution,
}: Props) {
  const t = useTranslations('embed');
  const [flipped, setFlipped] = useState(initialFlipped);
  const [reproducing, setReproducing] = useState(reproduceByDefault);

  const replay = usePgnReplay({ moves, startingFen, finalFen, initialIndex });

  // What the player could see at the displayed position. Undefined hands the
  // board its own defaults, which are exactly the revealed view.
  const blindfoldAxes = useMemo(() => {
    if (!reproducing || !playSettings) return undefined;
    return foldBoardVisibility(
      playSettingsAtHalfMove(playSettings, playSettingsLog, replay.index + 1)
    );
  }, [reproducing, playSettings, playSettingsLog, replay.index]);

  const hasMoves = replay.total > 0;

  return (
    // Exactly the frame's height, never more: a blogger picks the iframe's
    // height, and anything that overflows it is simply invisible with no
    // scrollbar to reveal it. The board is the only part that gives.
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <HorizontalMoveList
        formattedPgn={replay.formattedPgn}
        currentPosition={replay.index}
        onNavigateToPosition={replay.toIndex}
        className="shrink-0 border-b border-border bg-card"
      />

      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
        {/* The board takes its size from whichever axis runs out first: `h-full`
            inside the flex-1 row makes the leftover height the side of the
            square, and `max-w-full` caps that by the frame's width in a tall
            narrow embed. Deriving it from the height rather than subtracting a
            hard-coded chrome height is what keeps the stepper on screen in a
            short wide frame no matter what the strips end up measuring. */}
        {/* `min-w-0` is load-bearing: without it the flex item's automatic
            minimum size is the board's min-content width — 8 piece glyphs at
            their intrinsic 45px, i.e. 360px — which wins over the width the
            aspect ratio derives from the height, and the bottom ranks get
            clipped in any frame shorter than that. */}
        <div className="flex aspect-square h-full max-w-full min-w-0 items-center justify-center">
          <ChessBoard
            fen={replay.fen}
            flipped={flipped}
            playerSide={playerSide}
            lastMove={replay.lastMove}
            boardTheme={boardTheme}
            {...blindfoldAxes}
            // The player could not see these; draw them faint rather than
            // omitting them, so the reader sees the position AND the blindfold.
            hiddenPieceStyle="ghost"
            terminationMark={replay.isAtEnd ? terminationMark : null}
            terminationMarkLabel={terminationMarkLabel}
            rounded={false}
          />
        </div>
      </div>

      <MoveNavigationRow
        onNavigateToStart={hasMoves ? replay.toStart : undefined}
        onNavigatePrevious={hasMoves ? replay.previous : undefined}
        onNavigateNext={hasMoves ? replay.next : undefined}
        onNavigateToEnd={hasMoves ? replay.toEnd : undefined}
        isPreviousDisabled={replay.isAtStart}
        isNextDisabled={replay.isAtEnd}
        flip={{ onClick: () => setFlipped((f) => !f), label: t('flipBoard') }}
        trailingAction={
          canReproduce ? (
            <button
              type="button"
              onClick={() => setReproducing((r) => !r)}
              className={MOVE_NAV_SIDE_BUTTON_CLASS}
              title={reproducing ? t('revealBoard') : t('showAsPlayed')}
              aria-label={reproducing ? t('revealBoard') : t('showAsPlayed')}
              aria-pressed={reproducing}
            >
              {reproducing ? (
                <FaEyeSlash className="h-4 w-4" aria-hidden />
              ) : (
                <FaEye className="h-4 w-4" aria-hidden />
              )}
            </button>
          ) : undefined
        }
        className="shrink-0 border-t border-border bg-card"
      />

      {/* The only outbound link, and the only reason a host site gets this
          widget for free. `_blank` because a frame navigating its own document
          would leave a dead box in the article. */}
      <a
        href={attribution.href}
        target="_blank"
        rel="noopener"
        className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <span className="truncate">
          <span className="font-medium text-foreground">{attribution.title}</span>
          {attribution.author && <span> — {t('byAuthor', { author: attribution.author })}</span>}
        </span>
        <span className="shrink-0 whitespace-nowrap underline">{attribution.siteName}</span>
      </a>
    </div>
  );
}
