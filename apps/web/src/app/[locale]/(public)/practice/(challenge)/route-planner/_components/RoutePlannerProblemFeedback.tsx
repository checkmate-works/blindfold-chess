'use client';

import { Fragment, useMemo, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getPossibleMoves } from '@blindfold-chess/features/route-planner';
import { FaArrowRight } from 'react-icons/fa';

import type { BoardTheme } from '@/lib/games/board-themes';

import type { PieceType } from '../_lib/utils';
import { RoutePlannerBoard } from './RoutePlannerBoard';

type TabValue = 'yours' | 'shortest';

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

  const showTabs = !success && !skipped;
  const [activeTab, setActiveTab] = useState<TabValue>(showTabs ? 'yours' : 'shortest');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);
  const highlightedIndex = hoveredIndex ?? lockedIndex;

  const handleTabChange = (tab: TabValue) => {
    if (tab === activeTab) return;
    setHoveredIndex(null);
    setLockedIndex(null);
    setActiveTab(tab);
  };

  const userPath = useMemo(() => [start, ...moves], [start, moves]);

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

  const isShortest = activeTab === 'shortest';

  const boardPath = isShortest
    ? highlightedIndex !== null
      ? shortestPath.slice(0, highlightedIndex + 1)
      : shortestPath
    : userPath;

  const highlightedSquare =
    isShortest && highlightedIndex !== null ? shortestPath[highlightedIndex] : null;

  const boardWrongSquares = isShortest ? [] : wrongSquares;

  return (
    <div className="space-y-4">
      {showTabs && (
        <nav
          className="flex rounded-lg bg-secondary p-1"
          role="tablist"
          aria-label={t('shortestPath')}
        >
          <TabButton
            label={t('yourPath')}
            active={activeTab === 'yours'}
            onClick={() => handleTabChange('yours')}
          />
          <TabButton
            label={t('shortestPath')}
            active={activeTab === 'shortest'}
            onClick={() => handleTabChange('shortest')}
          />
        </nav>
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

      {!skipped && (
        <div className="text-left p-4 bg-muted/30 rounded-lg">
          {isShortest ? (
            <PathChips
              path={shortestPath}
              interactive
              highlightedIndex={highlightedIndex}
              onHover={setHoveredIndex}
              onLock={setLockedIndex}
            />
          ) : (
            <PathChips path={userPath} />
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
        active ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
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
      onLock: (index: number | null) => void;
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
            {!props.interactive || isEndpoint ? (
              <span
                className={`font-mono px-2 py-1 ${
                  isEndpoint ? 'text-sm font-bold' : 'text-xs text-muted-foreground'
                }`}
              >
                {sq}
              </span>
            ) : (
              <button
                type="button"
                className={`font-mono text-xs px-2 py-1 rounded border transition-colors cursor-pointer ${
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
