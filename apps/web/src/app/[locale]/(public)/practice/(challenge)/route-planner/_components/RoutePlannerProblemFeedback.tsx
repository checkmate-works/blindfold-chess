'use client';

import { Fragment, useMemo, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getPossibleMoves } from '@blindfold-chess/features/route-planner';
import { FaArrowRight } from 'react-icons/fa';

import type { BoardTheme } from '@/lib/games/board-themes';

import type { PieceType } from '../_lib/pieces';
import { RoutePlannerBoard } from './RoutePlannerBoard';

/** A scrub selection: which strip is driving the board, and the index within it. */
type Scrub = { source: 'yours' | 'shortest'; index: number };

type Props = {
  piece: PieceType;
  start: string;
  end: string;
  /** User's moves from start (excluding the start square). */
  moves: string[];
  /** Shortest path including both endpoints. */
  shortestPath: string[];
  success: boolean;
  skipped?: boolean;
  boardTheme: BoardTheme;
};

export function RoutePlannerProblemFeedback({
  piece,
  start,
  end,
  moves,
  shortestPath,
  success,
  skipped = false,
  boardTheme,
}: Props) {
  const t = useTranslations('practice.routePlanner');

  const userPath = useMemo(() => [start, ...moves], [start, moves]);

  // Comparing the user's path to the deterministic shortest path is only useful
  // when there is something to learn from the comparison: a wrong answer, or a
  // correct-but-longer-than-optimal answer. When the user found an equally-short
  // route — even if it goes through different squares (e.g., knight g5→f3→g1
  // vs. g5→h3→g1) — showing the BFS-derived shortest as "the answer" reads as
  // "your answer was wrong" and is confusing. Skipped problems have no user
  // path, so only the shortest is meaningful.
  const tookOptimalLength = success && userPath.length === shortestPath.length;
  const showShortest = !tookOptimalLength;

  // Both strips can scrub the board, so a selection is tracked as which strip
  // (`yours` or `shortest`) plus the index within it. Hover takes precedence
  // over a locked (tapped) selection.
  const [hovered, setHovered] = useState<Scrub | null>(null);
  const [locked, setLocked] = useState<Scrub | null>(null);
  const active = hovered ?? locked;

  // On the user's path, mark every illegal move (each square not reachable from its predecessor).
  const wrongSquares = useMemo(() => {
    if (skipped || moves.length === 0) return [];
    const bad: string[] = [];
    let prev = start;
    for (const move of moves) {
      const possible = getPossibleMoves(piece, prev);
      if (!possible.includes(move)) bad.push(move);
      prev = move;
    }
    return bad;
  }, [skipped, start, piece, moves]);

  // The board shows the user's attempt by default; hovering/tapping a square in
  // either strip scrubs the board to replay that path up to the chosen square.
  // Skipped problems have no attempt, so the board defaults to the full
  // shortest path. Wrong-square markers only apply while showing the user path.
  const activePath = active?.source === 'shortest' ? shortestPath : userPath;

  const boardPath = active
    ? activePath.slice(0, active.index + 1)
    : skipped
      ? shortestPath
      : userPath;

  const highlightedSquare = active ? activePath[active.index] : null;
  const boardWrongSquares = active
    ? active.source === 'yours'
      ? wrongSquares
      : []
    : skipped
      ? []
      : wrongSquares;

  const shortestMoveCount = Math.max(shortestPath.length - 1, 0);

  return (
    <div className="space-y-4">
      {/* The user's own attempt — colored like the challenge move strip, sitting
          directly under the problem header just as the strip does during play.
          Only the user's strip carries the success/destructive color. */}
      {!skipped && (
        <div
          className={`text-left p-4 rounded-lg border transition-colors ${
            success ? 'border-success bg-success/10' : 'border-destructive bg-destructive/10'
          }`}
        >
          <PathChips
            path={userPath}
            interactive
            highlightedIndex={active?.source === 'yours' ? active.index : null}
            onHover={(index) => setHovered(index === null ? null : { source: 'yours', index })}
            onLock={(index) =>
              setLocked((prev) =>
                prev?.source === 'yours' && prev.index === index ? null : { source: 'yours', index }
              )
            }
          />
        </div>
      )}

      <div className="flex justify-center">
        <div className="w-full max-w-sm">
          <RoutePlannerBoard
            startSquare={start}
            targetSquare={end}
            piece={piece}
            path={boardPath}
            boardTheme={boardTheme}
            highlightedSquare={highlightedSquare}
            wrongSquares={boardWrongSquares}
          />
        </div>
      </div>

      {/* Shortest-path reference — neutral (it is the answer, not the user's
          attempt). Hovering or tapping a square scrubs the board above, which
          replaces the previous tab toggle. */}
      {showShortest && (
        <div className="text-left p-4 rounded-lg border border-transparent bg-muted/30">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {t('shortestPath')} · {t('distance', { count: shortestMoveCount })}
          </div>
          <PathChips
            path={shortestPath}
            interactive
            highlightedIndex={active?.source === 'shortest' ? active.index : null}
            onHover={(index) => setHovered(index === null ? null : { source: 'shortest', index })}
            // Toggle: tapping the locked square again returns the board to the
            // user's own attempt (there is no tab to switch back with anymore).
            onLock={(index) =>
              setLocked((prev) =>
                prev?.source === 'shortest' && prev.index === index
                  ? null
                  : { source: 'shortest', index }
              )
            }
          />
        </div>
      )}
    </div>
  );
}

type PathChipsProps =
  | {
      path: string[];
      interactive?: false;
      highlightedIndex?: never;
      onHover?: never;
      onLock?: never;
    }
  | {
      path: string[];
      interactive: true;
      highlightedIndex: number | null;
      onHover: (index: number | null) => void;
      onLock: (index: number) => void;
    };

function PathChips(props: PathChipsProps) {
  const { path } = props;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {path.map((sq, i) => {
        const isEndpoint = i === 0 || i === path.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && <FaArrowRight size={10} className="text-muted-foreground/50 mx-0.5" />}
            {!props.interactive ? (
              <span
                className={`font-mono px-2 py-1 ${
                  isEndpoint ? 'text-sm font-bold' : 'text-xs text-muted-foreground'
                }`}
              >
                {sq}
              </span>
            ) : (
              // Every square is tappable, endpoints included: tapping the goal
              // jumps the board to the full route at once instead of stepping
              // through it square by square.
              <button
                type="button"
                className={`font-mono px-2 py-1 rounded border transition-colors cursor-pointer ${
                  isEndpoint ? 'text-sm font-bold' : 'text-xs'
                } ${
                  props.highlightedIndex === i
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
                onMouseEnter={() => props.onHover(i)}
                onMouseLeave={() => props.onHover(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onLock(i);
                }}
              >
                {sq}
              </button>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
