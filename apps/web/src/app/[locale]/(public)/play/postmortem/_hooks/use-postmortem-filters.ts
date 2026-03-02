import { useCallback, useMemo, useState } from 'react';

import type { EvaluationFilters, MoveLogEntry } from '../_lib';

type Props = {
  moveLog: MoveLogEntry[];
  playerColor: 'white' | 'black';
};

export function usePostmortemFilters({ moveLog, playerColor }: Props) {
  const [filters, setFilters] = useState<EvaluationFilters>({
    player: { own: true, opponent: true },
    evaluation: {
      best: true,
      good: true,
      inaccuracy: true,
      mistake: true,
      blunder: true,
    },
  });

  const filteredEntries = useMemo(() => {
    return moveLog.filter((entry) => {
      const isOwnMove =
        (playerColor === 'white' && entry.isWhiteMove) ||
        (playerColor === 'black' && !entry.isWhiteMove);
      if (isOwnMove && !filters.player.own) return false;
      if (!isOwnMove && !filters.player.opponent) return false;

      const hasAnyEvaluationFilterDisabled = !Object.values(filters.evaluation).every((v) => v);

      if (entry.status !== 'incorrect') {
        if (entry.evaluation) {
          const loss = entry.evaluation.loss;
          if (loss <= 20 && !filters.evaluation.best) return false;
          if (loss > 20 && loss <= 50 && !filters.evaluation.good) return false;
          if (loss > 50 && loss <= 100 && !filters.evaluation.inaccuracy) return false;
          if (loss > 100 && loss <= 300 && !filters.evaluation.mistake) return false;
          if (loss > 300 && !filters.evaluation.blunder) return false;
        } else if (hasAnyEvaluationFilterDisabled) {
          return false;
        }
      }

      return true;
    });
  }, [moveLog, filters, playerColor]);

  const handleResetFilters = useCallback(() => {
    setFilters({
      player: { own: true, opponent: true },
      evaluation: {
        best: true,
        good: true,
        inaccuracy: true,
        mistake: true,
        blunder: true,
      },
    });
  }, []);

  return {
    filters,
    setFilters,
    filteredEntries,
    handleResetFilters,
  };
}
