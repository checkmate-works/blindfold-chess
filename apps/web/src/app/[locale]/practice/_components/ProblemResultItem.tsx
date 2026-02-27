'use client';

import { Button } from '@/app/_components';
import { FaChevronDown, FaChevronRight, FaExternalLinkAlt, FaTrash } from 'react-icons/fa';

import { fenToLichessUrl } from '@/lib/lichess';

import { AnimatedChessBoard } from './AnimatedChessBoard';
import type { PracticeCompleteLabels, ProblemResult } from './practice-complete-types';

const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

type Props = {
  result: ProblemResult;
  isExpanded: boolean;
  labels: PracticeCompleteLabels;
  isCustomFen?: boolean;
  onToggle: () => void;
  onDeleteClick?: (e: React.MouseEvent, fen: string) => void;
};

export function ProblemResultItem({
  result,
  isExpanded,
  labels,
  isCustomFen,
  onToggle,
  onDeleteClick,
}: Props) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isExpanded ? (
            <FaChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          ) : (
            <FaChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )}
          <span className="font-medium whitespace-nowrap">No.{result.originalIndex + 1}</span>
          <span className="text-xs text-muted-foreground truncate">{result.fen}</span>
        </div>
        {result.skipped ? (
          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{labels.skipped}</span>
        ) : (
          <span className="font-semibold text-sm flex-shrink-0 ml-2">
            {result.accuracy.toFixed(1)}%
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-4 border-t border-border bg-muted/30">
          {/* Chess boards: Original and Recreation */}
          {labels.original && labels.yourRecreation && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 text-center">
                  {labels.original}
                </p>
                <AnimatedChessBoard
                  initialFen={result.fen}
                  showCoordinates={false}
                  flipped={result.isBlackToMove}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 text-center">
                  {labels.yourRecreation}
                </p>
                <AnimatedChessBoard
                  initialFen={result.skipped ? EMPTY_FEN : result.recreatedFen}
                  showCoordinates={false}
                  flipped={result.isBlackToMove}
                />
              </div>
            </div>
          )}

          {/* Progress bar (only for non-skipped) */}
          {!result.skipped && (
            <>
              <div className="w-full h-6 bg-muted rounded overflow-hidden flex mb-2">
                <div
                  className="bg-success flex items-center justify-center text-success-foreground text-xs font-semibold"
                  style={{
                    width: `${(result.correctPieces / result.totalPieces) * 100}%`,
                  }}
                >
                  {result.correctPieces > 0 && result.correctPieces}
                </div>
                <div
                  className="bg-destructive flex items-center justify-center text-destructive-foreground text-xs font-semibold"
                  style={{
                    width: `${(result.incorrectPieces / result.totalPieces) * 100}%`,
                  }}
                >
                  {result.incorrectPieces > 0 && result.incorrectPieces}
                </div>
                <div
                  className="bg-muted-foreground/40 flex items-center justify-center text-white text-xs font-semibold"
                  style={{
                    width: `${(result.missingPieces / result.totalPieces) * 100}%`,
                  }}
                >
                  {result.missingPieces > 0 && result.missingPieces}
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-success rounded"></div>
                  <span>
                    {labels.correct}: {result.correctPieces}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-destructive rounded"></div>
                  <span>
                    {labels.incorrect}: {result.incorrectPieces}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded"></div>
                  <span>
                    {labels.missing}: {result.missingPieces}
                  </span>
                </div>
              </div>
              {result.extraPieces > 0 && labels.extra && (
                <p className="text-xs text-muted-foreground mt-2">
                  {labels.extra}: +{result.extraPieces}
                </p>
              )}
            </>
          )}

          {/* Analyze on Lichess button */}
          {labels.analyzeOnLichess && (
            <div className={`flex justify-center ${result.skipped ? '' : 'mt-3'}`}>
              <Button
                onClick={() => {
                  const lichessUrl = fenToLichessUrl(result.fen);
                  window.open(lichessUrl, '_blank');
                }}
                variant="secondary"
                size="sm"
                icon={<FaExternalLinkAlt className="w-3 h-3" />}
                className="rounded-lg"
              >
                {labels.analyzeOnLichess}
              </Button>
            </div>
          )}

          {/* Delete button (only for custom FEN) */}
          {isCustomFen && onDeleteClick && (
            <div className="flex justify-end mt-3">
              <button
                onClick={(e) => onDeleteClick(e, result.fen)}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                title="Delete FEN"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
