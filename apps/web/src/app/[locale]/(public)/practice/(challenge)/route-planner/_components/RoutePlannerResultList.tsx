'use client';

import { useState } from 'react';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import type { Square } from '@blindfold-chess/types';
import { FaArrowRight, FaChevronDown, FaChevronRight } from 'react-icons/fa';

import type { BoardTheme } from '@/lib/games/board-themes';

import type { PieceType } from '../_lib/pieces';
import { RoutePlannerProblemFeedback } from './RoutePlannerProblemFeedback';

export type RoutePlannerResult = {
  piece: PieceType;
  start: Square;
  end: Square;
  success: boolean;
  userPath: Square[];
  shortestPath: Square[];
  skipped?: boolean;
};

type Props = {
  results: RoutePlannerResult[];
  boardTheme: BoardTheme;
  labels: {
    skipped: string;
  };
};

export function RoutePlannerResultList({ results, boardTheme, labels }: Props) {
  // Each row expands independently — opening one must not collapse the others
  // the user already opened, so track the open rows as a set rather than a
  // single index.
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {results.map((result, index) => {
        const isExpanded = expandedIndices.has(index);
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
              <div className="p-4 bg-muted/30 border-t border-border">
                <RoutePlannerProblemFeedback
                  piece={result.piece}
                  start={result.start}
                  end={result.end}
                  moves={result.userPath}
                  shortestPath={result.shortestPath}
                  success={result.success}
                  skipped={result.skipped}
                  boardTheme={boardTheme}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
