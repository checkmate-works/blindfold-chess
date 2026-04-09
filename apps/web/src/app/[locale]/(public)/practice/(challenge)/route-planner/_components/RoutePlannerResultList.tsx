'use client';

import { Fragment, useState } from 'react';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { FaArrowRight, FaChevronDown, FaChevronRight } from 'react-icons/fa';

import type { BoardTheme } from '@/lib/boardThemes';

import type { PieceType } from '../_lib/utils';
import { RoutePlannerBoard } from './RoutePlannerBoard';

export type RoutePlannerResult = {
  piece: PieceType;
  start: string;
  end: string;
  success: boolean;
  userPath: string[];
  shortestPath: string[];
  skipped?: boolean;
};

type Props = {
  results: RoutePlannerResult[];
  boardTheme: BoardTheme;
  labels: {
    correct: string;
    badEnd: string;
    badMove: string;
    shortestPath: string;
    yourPath: string;
    skipped: string;
  };
};

export function RoutePlannerResultList({ results, boardTheme, labels }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);
  const [lockedStepIndex, setLockedStepIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
    setHoveredStepIndex(null);
    setLockedStepIndex(null);
  };

  const activeStepIndex = hoveredStepIndex ?? lockedStepIndex;

  return (
    <div className="space-y-3">
      {results.map((result, index) => {
        const isExpanded = expandedIndex === index;
        return (
          <div key={index} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleExpand(index)}
              className="w-full flex items-center justify-between p-3 bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-muted-foreground">
                  {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                </div>
                <div className="font-mono text-sm text-muted-foreground w-8">#{index + 1}</div>
                <ChessPiece type={result.piece} color="w" size={20} />
                <div className="flex items-center gap-2 font-mono font-bold">
                  <span>{result.start}</span>
                  <FaArrowRight size={10} className="text-muted-foreground" />
                  <span>{result.end}</span>
                </div>
              </div>
              <div
                className={`text-sm font-bold ${
                  result.success
                    ? 'text-success'
                    : result.skipped
                      ? 'text-muted-foreground'
                      : 'text-destructive'
                }`}
              >
                {result.success ? 'OK' : result.skipped ? labels.skipped : 'NG'}
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 bg-muted/30 border-t border-border space-y-4">
                <div className="flex justify-center">
                  <div className="w-64">
                    <RoutePlannerBoard
                      startSquare={result.start}
                      targetSquare={result.end}
                      piece={result.piece}
                      path={
                        activeStepIndex !== null
                          ? result.shortestPath.slice(0, activeStepIndex + 1)
                          : [result.start, ...result.userPath]
                      }
                      boardTheme={boardTheme}
                      highlightedSquare={
                        activeStepIndex !== null ? result.shortestPath[activeStepIndex] : null
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {!result.skipped && (
                    <div className="flex flex-col gap-1 p-3 rounded bg-background border border-border">
                      <span className="text-muted-foreground text-xs">{labels.yourPath}</span>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="font-mono text-sm font-bold">{result.start}</span>
                        {result.userPath.map((sq, i) => (
                          <Fragment key={i}>
                            <FaArrowRight size={10} className="text-muted-foreground/50 mx-1" />
                            <span className="font-mono text-sm font-bold">{sq}</span>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                  {!result.success && (
                    <div className="flex flex-col gap-1 p-3 rounded bg-background border border-border">
                      <span className="text-muted-foreground text-xs">{labels.shortestPath}</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {result.shortestPath.map((sq, i) => {
                          const isActive = activeStepIndex === i;
                          return (
                            <Fragment key={i}>
                              {i > 0 && (
                                <FaArrowRight
                                  size={10}
                                  className="text-muted-foreground/50 mx-0.5"
                                />
                              )}
                              {i === 0 || i === result.shortestPath.length - 1 ? (
                                <span className="font-mono text-sm font-bold px-1">{sq}</span>
                              ) : (
                                <button
                                  className={`font-mono text-xs px-2 py-1 rounded border transition-colors cursor-pointer ${
                                    isActive
                                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                      : 'bg-background hover:bg-muted border-border'
                                  }`}
                                  onMouseEnter={() => setHoveredStepIndex(i)}
                                  onMouseLeave={() => setHoveredStepIndex(null)}
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent toggling the accordion
                                    setLockedStepIndex(i);
                                  }}
                                >
                                  {sq}
                                </button>
                              )}
                            </Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
