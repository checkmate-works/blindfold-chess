'use client';

import { useState } from 'react';

import type { PracticeCompleteLabels, ProblemResult } from '../_lib/practice-complete-types';
import { DeleteFenConfirmModal } from './DeleteFenConfirmModal';
import { ProblemResultItem } from './ProblemResultItem';

type Props = {
  problemResults: ProblemResult[];
  labels: PracticeCompleteLabels;
  isCustomFen?: boolean;
  onDeleteFen?: (fen: string) => void;
};

export function ProblemResultList({ problemResults, labels, isCustomFen, onDeleteFen }: Props) {
  const [expandedProblems, setExpandedProblems] = useState<Set<number>>(new Set());
  const [deleteModalFen, setDeleteModalFen] = useState<string | null>(null);
  const [deletedFens, setDeletedFens] = useState<Set<string>>(new Set());

  const visibleResults = problemResults.filter((result) => !deletedFens.has(result.fen));

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

  if (visibleResults.length === 0 || !labels.problemDetails) return null;

  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-muted-foreground mb-2 text-left">
        {labels.problemDetails}
      </p>
      <div className="space-y-2">
        {visibleResults.map((result) => (
          <ProblemResultItem
            key={result.originalIndex}
            result={result}
            isExpanded={expandedProblems.has(result.originalIndex)}
            labels={labels}
            isCustomFen={isCustomFen}
            onToggle={() => toggleProblem(result.originalIndex)}
            onDeleteClick={isCustomFen && onDeleteFen ? handleDeleteClick : undefined}
          />
        ))}
      </div>

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
            onCancel={() => setDeleteModalFen(null)}
            labels={{
              title: labels.deleteFenTitle,
              message: labels.deleteFenMessage,
              confirm: labels.deleteFenConfirm,
              cancel: labels.deleteFenCancel,
            }}
          />
        )}
    </div>
  );
}
