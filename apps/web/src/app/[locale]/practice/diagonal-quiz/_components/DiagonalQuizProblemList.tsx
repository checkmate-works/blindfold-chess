'use client';

import { useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { ChessPiece, Square } from '@/app/_components';
import { getDiagonalSquares } from '@blindfold-chess/features';
import { FaCheck, FaChevronDown, FaChevronRight, FaTimes } from 'react-icons/fa';

import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/boardThemes';

export type QuestionResult = {
  square: string;
  isCorrect: boolean;
  isDiagonalCorrect: boolean;
  isAntiDiagonalCorrect: boolean;
  correctDiagonal: string;
  correctAntiDiagonal: string;
  userDiagonal?: string;
  userAntiDiagonal?: string;
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function DiagonalBoard({ targetSquare }: { targetSquare: string }) {
  const themeColors = getBoardThemeColors(DEFAULT_BOARD_THEME);

  const { diagonal, antiDiagonal } = useMemo(
    () => getDiagonalSquares(targetSquare),
    [targetSquare]
  );

  const diagonalSet = useMemo(() => new Set(diagonal), [diagonal]);
  const antiDiagonalSet = useMemo(() => new Set(antiDiagonal), [antiDiagonal]);

  const getOverlayClass = (square: string) => {
    if (square === targetSquare) return 'bg-primary/50';
    const onDiag = diagonalSet.has(square);
    const onAntiDiag = antiDiagonalSet.has(square);
    if (onDiag && onAntiDiag) return 'bg-primary/30';
    if (onDiag) return 'bg-emerald-500/40';
    if (onAntiDiag) return 'bg-sky-500/40';
    return '';
  };

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="relative w-full aspect-square border border-border rounded-md overflow-hidden shadow-lg">
        <div className="grid grid-cols-8 gap-0 w-full h-full">
          {RANKS.map((rank, rankIndex) =>
            FILES.map((file, fileIndex) => {
              const square = file + rank;
              const isLight = (fileIndex + rankIndex) % 2 === 0;
              const overlay = getOverlayClass(square);
              const isBishopSquare = square === targetSquare;

              return (
                <div key={square} className="relative">
                  <Square
                    file={file}
                    rank={rank}
                    isLight={isLight}
                    showCoordinates={true}
                    showRankCoordinate={fileIndex === 0}
                    showFileCoordinate={rankIndex === RANKS.length - 1}
                    layoutMode="grid"
                    themeColors={themeColors}
                  >
                    {isBishopSquare && (
                      <div className="w-[80%] h-[80%] flex items-center justify-center">
                        <ChessPiece type="b" color="w" size={45} />
                      </div>
                    )}
                  </Square>
                  {overlay && <div className={`absolute inset-0 pointer-events-none ${overlay}`} />}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-emerald-500/40 rounded border border-border" />
          <span className="text-muted-foreground">
            <DiagonalLabel type="diagonal" />
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-sky-500/40 rounded border border-border" />
          <span className="text-muted-foreground">
            <DiagonalLabel type="antiDiagonal" />
          </span>
        </div>
      </div>
    </div>
  );
}

function DiagonalLabel({ type }: { type: 'diagonal' | 'antiDiagonal' }) {
  const t = useTranslations('practice.diagonalQuiz');
  return <>{type === 'diagonal' ? t('diagonalLabel') : t('antiDiagonalLabel')}</>;
}

export function DiagonalQuizProblemList({ results }: { results: QuestionResult[] }) {
  const t = useTranslations('practice.diagonalQuiz');
  const [expandedProblems, setExpandedProblems] = useState<Set<number>>(new Set());

  const toggleProblem = (index: number) => {
    setExpandedProblems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (results.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-muted-foreground mb-2 text-left">
        {t('problemDetails')}
      </p>
      <div className="space-y-2">
        {results.map((result, index) => {
          const isExpanded = expandedProblems.has(index);
          return (
            <div key={index} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleProblem(index)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isExpanded ? (
                    <FaChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <FaChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="font-medium whitespace-nowrap">No.{index + 1}</span>
                  <span className="text-sm text-muted-foreground">{result.square}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {result.isCorrect ? (
                    <FaCheck className="w-3 h-3 text-green-600" />
                  ) : (
                    <FaTimes className="w-3 h-3 text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      result.isCorrect ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {result.isCorrect ? t('correct') : t('incorrect')}
                  </span>
                </div>
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 pt-4 border-t border-border bg-muted/30">
                  <DiagonalBoard targetSquare={result.square} />

                  <div className="mt-3 space-y-3 text-sm">
                    <div>
                      <p className="font-bold text-muted-foreground mb-1">{t('diagonalLabel')}</p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">{t('correctAnswerLabel')}:</span>{' '}
                        {result.correctDiagonal}
                      </p>
                      {result.userDiagonal && (
                        <p className={result.isDiagonalCorrect ? 'text-green-600' : 'text-red-600'}>
                          <span className="font-medium">{t('yourAnswer')}:</span>{' '}
                          {result.userDiagonal}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-muted-foreground mb-1">
                        {t('antiDiagonalLabel')}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">{t('correctAnswerLabel')}:</span>{' '}
                        {result.correctAntiDiagonal}
                      </p>
                      {result.userAntiDiagonal && (
                        <p
                          className={
                            result.isAntiDiagonalCorrect ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          <span className="font-medium">{t('yourAnswer')}:</span>{' '}
                          {result.userAntiDiagonal}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
