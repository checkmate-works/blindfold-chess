'use client';

import { useExpandedIndexSet } from '../_hooks/use-expanded-index-set';
import type { PracticeCompleteLabels, ProblemResult } from '../_lib/practice-complete-types';
import { ProblemResultItem } from './ProblemResultItem';

type Props = {
  problemResults: ProblemResult[];
  labels: PracticeCompleteLabels;
};

export function ProblemResultList({ problemResults, labels }: Props) {
  const { expanded: expandedProblems, toggle: toggleProblem } = useExpandedIndexSet();

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
