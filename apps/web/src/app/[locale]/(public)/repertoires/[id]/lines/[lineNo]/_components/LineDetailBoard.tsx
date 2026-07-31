'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ChessBoard } from '@/app/_components/chess/ChessBoard';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import type { Side } from '@blindfold-chess/types';
import { FaCodeBranch } from 'react-icons/fa';

import { EMPTY_BOARD_ANNOTATIONS } from '@/lib/board-annotations/types';

import { HorizontalMoveList } from '@/app/[locale]/(public)/games/play/_components/HorizontalMoveList';
import {
  MOVE_NAV_SIDE_BUTTON_CLASS,
  MoveNavigationRow,
} from '@/app/[locale]/(public)/games/play/_components/MoveNavigationRow';
import { INLINE_BOARD_CARD_CHROME } from '@/app/[locale]/(public)/games/play/_lib/skeleton-layout-classes';
import type { MoveNotationLine } from '@/app/[locale]/(public)/topics/_lib/move-notation';
import { useBoardDisplay } from '@/app/[locale]/_hooks/use-board-display';

import type { ContinuationLink } from '../_lib/line-continuations';
import type { LineMove } from '../_lib/line-moves';
import { AnnotationPanel } from './AnnotationPanel';
import { LineAnnotationIndex } from './LineAnnotationIndex';
import type { LineNavItem } from './LineNavList';
import { LineNavList } from './LineNavList';

type Props = {
  side: Side;
  formatted: FormattedPgnMove[];
  /** Board position at each ply; index 0 is the start, index k is after move k. */
  positions: { fen: string; lastMove: { from: string; to: string } | null }[];
  /** Per-ply move data, indexed by ply-1 (moves[0] = ply 1). */
  moves: LineMove[];
  isOwner: boolean;
  repertoireId: string;
  lineNo: number;
  locale: string;
  /** 1-based ply to focus initially (deep-link / default). */
  initialPly: number;
  /** The line's moves + root, for move references written inside a note. */
  moveNotation: MoveNotationLine;
  /** Sibling lines of the repertoire, for the line-switching list. */
  navItems: LineNavItem[];
  /** Heading + owner-only add-line label for that list, resolved server-side. */
  navHeading: string;
  navAddLineLabel?: string;
  navManageLabel?: string;
  /**
   * Owner-only: per-ply prefix PGNs (`branchPgns[ply - 1]` = this line through
   * ply). Seeds the "branch from this position" link so a new line reuses the
   * shared prefix and diverges after it. Empty for non-owners.
   */
  branchPgns: string[];
  /** Where this line's final position continues in a sibling line (transposition). */
  continuations: ContinuationLink[];
};

/** How many continuation links to show before the list gets noisy. */
const MAX_CONTINUATION_LINKS = 3;

/**
 * A single line rendered with the in-game board layout: on desktop the board
 * sits in a 2/3 column with the repertoire's line list in a 1/3 column on the
 * right (stacking on mobile) — the same grid the game / replay screens use.
 * The game's collapsible "Moves" panel is deliberately absent: the strip above
 * the board already navigates this line's moves, so a second move list only
 * competes with the line switcher for that column.
 * The board is always visible (first/prev/next/last controls + ←/→ keys). The
 * owner-authored annotation for the move in focus sits under the board; the
 * focused ply drives which move's note is shown and navigating swaps it.
 */
export function LineDetailBoard({
  side,
  formatted,
  positions,
  moves,
  isOwner,
  repertoireId,
  lineNo,
  locale,
  initialPly,
  moveNotation,
  navItems,
  navHeading,
  navAddLineLabel,
  navManageLabel,
  branchPgns,
  continuations,
}: Props) {
  const tLine = useTranslations('Repertoires.line');
  const tCommon = useTranslations('Common');
  const tTransposition = useTranslations('Repertoires.line.transposition');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const moveParam = searchParams.get('move');

  const maxPly = positions.length - 1;
  const [ply, setPly] = useState(Math.min(Math.max(initialPly, 0), maxPly));
  // Opens from the repertoire author's side — the perspective the line is
  // written for — but a reader studying the opposing side can flip it.
  const [flipped, setFlipped] = useState(side === 'black');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        setPly((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        setPly((p) => Math.min(maxPly, p + 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [maxPly]);

  const clampedPly = Math.min(ply, maxPly);

  // Mirror the focused move into ?move= (debounced) so the server-rendered
  // comment thread below follows the board. The board itself stays client-
  // instant; only the URL / comments catch up. `move` is clamped to >= 1 (the
  // first real move) since the start position has no move to discuss.
  const syncPly = Math.max(clampedPly, 1);
  useEffect(() => {
    if (String(syncPly) === moveParam) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      params.set('move', String(syncPly));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(timer);
  }, [syncPly, moveParam, pathname, router, searchParams]);
  const current = positions[clampedPly];
  const lastMove = clampedPly > 0 ? current.lastMove : null;
  const display = useBoardDisplay(lastMove);
  const focusedMove = clampedPly > 0 ? moves[clampedPly - 1] : null;

  // Markup is keyed by the position a move reaches, so the start position (ply
  // 0) has none. Read-only here — drawing belongs to the line editor, which
  // already owns every other edit to this line.
  const focusedShapes = focusedMove?.shapes ?? EMPTY_BOARD_ANNOTATIONS;

  // Owner-only: the moves this line plays up to the position in focus, seeding
  // a new line that shares them and then diverges — the per-line replacement
  // for adding a variation in the (removed) whole-kata board editor. It rides
  // in the board's control strip because "here" IS the position on the board,
  // and it steps with it; nothing at the start position (ply 0), where "add a
  // line" already covers a blank line from the root.
  const branchPgn = isOwner && clampedPly >= 1 ? branchPgns[clampedPly - 1] : undefined;

  return (
    // One grid holds all three blocks so their order can differ per breakpoint.
    // DOM order is the phone's — board, then the note, then the line list —
    // because on a single column the note belongs directly under the board it
    // explains; a line switcher wedged between them separates a move from its
    // own commentary. From `lg` the `order-*` classes restore the two-column
    // reading: board (2/3) beside the line list (1/3), with the note spanning
    // the full width below both, so its SectionTitle underline runs the width
    // of the page and lines up with the "Comments" heading that follows.
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:order-1 lg:col-span-2">
        <div className={INLINE_BOARD_CARD_CHROME}>
          <div className="relative">
            <HorizontalMoveList
              formattedPgn={formatted}
              currentPosition={clampedPly - 1}
              onNavigateToPosition={(position) => setPly(position + 1)}
            />

            <ChessBoard
              fen={current.fen}
              flipped={flipped}
              playerSide={side}
              showOwnPieces
              showOpponentPieces
              {...display}
              rounded={false}
              annotations={focusedShapes}
            />

            <MoveNavigationRow
              onNavigateToStart={() => setPly(0)}
              onNavigatePrevious={() => setPly(Math.max(0, clampedPly - 1))}
              onNavigateNext={() => setPly(Math.min(maxPly, clampedPly + 1))}
              onNavigateToEnd={() => setPly(maxPly)}
              isPreviousDisabled={clampedPly === 0}
              isNextDisabled={clampedPly === maxPly}
              flip={{ onClick: () => setFlipped((f) => !f), label: tCommon('flipBoard') }}
              trailingAction={
                branchPgn ? (
                  <Link
                    href={`/${locale}/repertoires/${repertoireId}/lines/new?pgn=${encodeURIComponent(branchPgn)}`}
                    title={tLine('branchFromHere')}
                    aria-label={tLine('branchFromHere')}
                    className={MOVE_NAV_SIDE_BUTTON_CLASS}
                  >
                    <FaCodeBranch size={14} aria-hidden />
                  </Link>
                ) : undefined
              }
            />
          </div>
        </div>

        {/* Only meaningful at the line's final position — a mid-line shared
            run is Phase 2's indicator, not this one. Plain text links, since
            this is a note about the position rather than an action on it. */}
        {clampedPly === maxPly && maxPly >= 1 && continuations.length > 0 && (
          <div className="space-y-1 text-sm text-muted-foreground">
            {continuations.slice(0, MAX_CONTINUATION_LINKS).map((c) => (
              <p key={`${c.lineNo}-${c.ply}`}>
                {tTransposition.rich('continuesIn', {
                  count: c.remainingPlies,
                  lineLabel: c.label,
                  link: (chunks) => (
                    <Link
                      href={`/${locale}/repertoires/${repertoireId}/lines/${c.lineNo}?move=${c.ply}`}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="lg:order-3 lg:col-span-3">
        {focusedMove ? (
          <AnnotationPanel
            key={focusedMove.positionKey}
            repertoireId={repertoireId}
            locale={locale}
            positionKey={focusedMove.positionKey}
            moveLabel={focusedMove.label}
            initialText={focusedMove.annotation}
            moveNotation={moveNotation}
            isOwner={isOwner}
          />
        ) : (
          // At the start position (ply 0) no single move is in focus, so instead
          // of the per-move note we surface a Discussion-style index of every move
          // in this line that carries a note — each jumps the board there.
          <LineAnnotationIndex
            moves={moves}
            onJumpToPly={(nextPly) => setPly(nextPly)}
            moveNotation={moveNotation}
            locale={locale}
          />
        )}
      </div>

      <div className="space-y-4 lg:order-2 lg:col-span-1">
        <LineNavList
          items={navItems}
          currentLineNo={lineNo}
          repertoireId={repertoireId}
          locale={locale}
          heading={navHeading}
          addLineLabel={navAddLineLabel}
          manageLabel={navManageLabel}
        />
      </div>
    </div>
  );
}
