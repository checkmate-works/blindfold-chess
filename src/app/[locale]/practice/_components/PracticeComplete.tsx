'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaChevronDown, FaChevronRight, FaExternalLinkAlt, FaTrash } from 'react-icons/fa';

import { fenToLichessUrl } from '@/lib/lichess';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { AnimatedChessBoard } from '@/app/[locale]/practice/_components/AnimatedChessBoard';
import { DeleteFenConfirmModal } from '@/app/[locale]/practice/_components/DeleteFenConfirmModal';

type ProblemResult = {
  fen: string;
  recreatedFen: string;
  isBlackToMove: boolean;
  accuracy: number;
  correctPieces: number;
  totalPieces: number;
  incorrectPieces: number;
  missingPieces: number;
  extraPieces: number;
  originalIndex: number;
  skipped?: boolean;
};

type Props = {
  score: number;
  total: number;
  onTryAgain: () => void;
  locale: Locale;
  labels: {
    practiceComplete: string;
    score: string;
    tryAgain: string;
    morePractice: string;
    recreationProgress?: string;
    correct?: string;
    incorrect?: string;
    missing?: string;
    extra?: string;
    extraDescription?: string;
    problemDetails?: string;
    problem?: string;
    original?: string;
    yourRecreation?: string;
    deleteFenTitle?: string;
    deleteFenMessage?: string;
    deleteFenConfirm?: string;
    deleteFenCancel?: string;
    skipped?: string;
    analyzeOnLichess?: string;
  };
  relatedModule?: {
    href: string;
    icon: string;
    title: string;
    description: string;
    sectionTitle?: string;
  };
  // Optional detailed breakdown (for position memory practice)
  detailedStats?: {
    correctPieces: number;
    totalPieces: number;
    incorrectPieces: number;
    missingPieces: number;
    extraPieces: number;
  };
  // Individual problem results (for position memory practice)
  problemResults?: ProblemResult[];
  // Whether custom FEN is being used (enables delete functionality)
  isCustomFen?: boolean;
  // Callback when a FEN is deleted
  onDeleteFen?: (fen: string) => void;
};

export function PracticeComplete({
  score,
  total,
  onTryAgain,
  locale,
  labels,
  relatedModule,
  detailedStats,
  problemResults,
  isCustomFen,
  onDeleteFen,
}: Props) {
  const router = useRouter();
  const [expandedProblems, setExpandedProblems] = useState<Set<number>>(new Set());
  const [deleteModalFen, setDeleteModalFen] = useState<string | null>(null);
  const [deletedFens, setDeletedFens] = useState<Set<string>>(new Set());

  // Filter out deleted problems
  const visibleProblemResults = problemResults?.filter((result) => !deletedFens.has(result.fen));

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

  const handleDeleteClick = (e: React.MouseEvent, fen: string) => {
    e.stopPropagation();
    setDeleteModalFen(fen);
  };

  const handleDeleteConfirm = () => {
    if (deleteModalFen && onDeleteFen) {
      onDeleteFen(deleteModalFen);
      setDeletedFens((prev) => new Set(prev).add(deleteModalFen));
    }
    setDeleteModalFen(null);
  };

  const handleDeleteCancel = () => {
    setDeleteModalFen(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-xl shadow-sm border border-border p-8">
        <SectionTitle className="text-2xl font-bold text-center mb-6">
          {labels.practiceComplete}
        </SectionTitle>

        {/* Score display - unified with individual problem results */}
        {detailedStats && labels.recreationProgress ? (
          // Position memory: show only accuracy with fraction
          <SectionTitle className="text-2xl font-bold text-center mb-6">
            {labels.score}
          </SectionTitle>
        ) : (
          // Other practices: show traditional score display
          <div className="mb-6 text-center">
            <p className="text-3xl font-bold text-foreground mb-2">
              {score} / {total}
            </p>
            <p className="text-muted-foreground">{labels.score}</p>
          </div>
        )}

        {/* Detailed stats with progress bar (for position memory) */}
        {detailedStats && labels.recreationProgress && (
          <div className="mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-2 text-left">
              {labels.recreationProgress}
            </p>
            <div className="w-full h-8 bg-muted rounded-lg overflow-hidden flex">
              <div
                className="bg-green-600 flex items-center justify-center text-white text-sm font-semibold"
                style={{
                  width: `${(detailedStats.correctPieces / detailedStats.totalPieces) * 100}%`,
                }}
              >
                {detailedStats.correctPieces > 0 && detailedStats.correctPieces}
              </div>
              <div
                className="bg-red-600 flex items-center justify-center text-white text-sm font-semibold"
                style={{
                  width: `${(detailedStats.incorrectPieces / detailedStats.totalPieces) * 100}%`,
                }}
              >
                {detailedStats.incorrectPieces > 0 && detailedStats.incorrectPieces}
              </div>
              <div
                className="bg-muted-foreground/40 flex items-center justify-center text-white text-sm font-semibold"
                style={{
                  width: `${(detailedStats.missingPieces / detailedStats.totalPieces) * 100}%`,
                }}
              >
                {detailedStats.missingPieces > 0 && detailedStats.missingPieces}
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span>
                  {labels.correct}: {detailedStats.correctPieces}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span>
                  {labels.incorrect}: {detailedStats.incorrectPieces}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-muted-foreground/40 rounded"></div>
                <span>
                  {labels.missing}: {detailedStats.missingPieces}
                </span>
              </div>
            </div>

            {/* Extra pieces section - 控えめに */}
            {detailedStats.extraPieces > 0 && labels.extra && labels.extraDescription && (
              <p className="text-xs text-muted-foreground mt-3">
                {labels.extra}: <span className="font-semibold">+{detailedStats.extraPieces}</span>{' '}
                ({labels.extraDescription})
              </p>
            )}
          </div>
        )}

        {/* Individual problem results (for position memory) */}
        {visibleProblemResults && visibleProblemResults.length > 0 && labels.problemDetails && (
          <div className="mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-2 text-left">
              {labels.problemDetails}
            </p>
            <div className="space-y-2">
              {visibleProblemResults.map((result) => {
                const isExpanded = expandedProblems.has(result.originalIndex);
                return (
                  <div
                    key={result.originalIndex}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleProblem(result.originalIndex)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? (
                          <FaChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <FaChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="font-medium whitespace-nowrap">
                          No.{result.originalIndex + 1}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{result.fen}</span>
                      </div>
                      {result.skipped ? (
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {labels.skipped}
                        </span>
                      ) : (
                        <span className="font-semibold text-sm flex-shrink-0 ml-2">
                          {result.accuracy.toFixed(1)}%
                        </span>
                      )}
                    </button>
                    {isExpanded && !result.skipped && (
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
                                initialFen={result.recreatedFen}
                                showCoordinates={false}
                                flipped={result.isBlackToMove}
                              />
                            </div>
                          </div>
                        )}

                        {/* Progress bar */}
                        <div className="w-full h-6 bg-muted rounded overflow-hidden flex mb-2">
                          <div
                            className="bg-green-600 flex items-center justify-center text-white text-xs font-semibold"
                            style={{
                              width: `${(result.correctPieces / result.totalPieces) * 100}%`,
                            }}
                          >
                            {result.correctPieces > 0 && result.correctPieces}
                          </div>
                          <div
                            className="bg-red-600 flex items-center justify-center text-white text-xs font-semibold"
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
                            <div className="w-2 h-2 bg-green-600 rounded"></div>
                            <span>
                              {labels.correct}: {result.correctPieces}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-red-600 rounded"></div>
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

                        {/* Analyze on Lichess button */}
                        {labels.analyzeOnLichess && (
                          <div className="flex justify-center mt-3">
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
                        {isCustomFen && onDeleteFen && (
                          <div className="flex justify-end mt-3">
                            <button
                              onClick={(e) => handleDeleteClick(e, result.fen)}
                              className="p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete FEN"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Skipped problem expanded content */}
                    {isExpanded && result.skipped && (
                      <div className="px-3 pb-3 pt-4 border-t border-border bg-muted/30">
                        {/* Analyze on Lichess button */}
                        {labels.analyzeOnLichess && (
                          <div className="flex justify-center">
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
                        {isCustomFen && onDeleteFen && (
                          <div className="flex justify-end mt-3">
                            <button
                              onClick={(e) => handleDeleteClick(e, result.fen)}
                              className="p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
              })}
            </div>
          </div>
        )}

        {/* Delete FEN confirmation modal */}
        {deleteModalFen &&
          labels.deleteFenTitle &&
          labels.deleteFenMessage &&
          labels.deleteFenConfirm &&
          labels.deleteFenCancel && (
            <DeleteFenConfirmModal
              isOpen={!!deleteModalFen}
              fen={deleteModalFen}
              onConfirm={handleDeleteConfirm}
              onCancel={handleDeleteCancel}
              labels={{
                title: labels.deleteFenTitle,
                message: labels.deleteFenMessage,
                confirm: labels.deleteFenConfirm,
                cancel: labels.deleteFenCancel,
              }}
            />
          )}

        <div className="space-y-4 mt-6">
          <Button onClick={onTryAgain} variant="primary" size="lg" fullWidth className="rounded-lg">
            {labels.tryAgain}
          </Button>

          <Button
            onClick={() => router.push(`/${locale}/practice`)}
            variant="secondary"
            size="lg"
            fullWidth
            className="rounded-lg"
          >
            {labels.morePractice}
          </Button>
        </div>
      </div>

      {/* Related learning module */}
      {relatedModule && (
        <div className="mt-12 p-6 bg-secondary/30 rounded-lg border border-border">
          <SectionTitle className="text-xl font-semibold mb-4">
            {relatedModule.sectionTitle || 'Related Learning'}
          </SectionTitle>
          <CardLink
            href={relatedModule.href}
            icon={relatedModule.icon}
            title={relatedModule.title}
            description={relatedModule.description}
            locale={locale}
          />
        </div>
      )}
    </div>
  );
}
