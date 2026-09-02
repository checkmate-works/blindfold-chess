'use client';

import { useState } from 'react';

import type { PracticeCompleteLabels, ProblemResult } from '../_lib/practice-complete-types';
import { ProblemResultItem } from './ProblemResultItem';

type Props = {
  problemResults: ProblemResult[];
  labels: PracticeCompleteLabels;
};

export function ProblemResultList({ problemResults, labels }: Props) {
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

  if (problemResults.length === 0 || !labels.problemDetails) return null;

  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-muted-foreground mb-2 text-left">
        {labels.problemDetails}
      </p>
      <div className="space-y-2">
        {problemResults.map((result) => (
          <ProblemResultItem
            key={result.originalIndex}
            result={result}
            isExpanded={expandedProblems.has(result.originalIndex)}
            labels={labels}
            onToggle={() => toggleProblem(result.originalIndex)}
          />
        ))}
      </div>
    </div>
  );
}
