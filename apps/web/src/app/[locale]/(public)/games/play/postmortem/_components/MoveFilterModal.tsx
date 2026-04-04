'use client';

import { Button, InfoModal } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaCheck, FaStar } from 'react-icons/fa';

import type { EvaluationFilters } from '../_lib';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  filters: EvaluationFilters;
  onFiltersChange: React.Dispatch<React.SetStateAction<EvaluationFilters>>;
  onReset: () => void;
  hasAnyEvaluation: boolean;
};

export function MoveFilterModal({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onReset,
  hasAnyEvaluation,
}: Props) {
  const t = useTranslations('postmortem');

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} title={t('filterMoves')}>
      <div className="space-y-6">
        {/* Player Filter */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">{t('filterPlayer')}</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.player.own}
                onChange={(e) =>
                  onFiltersChange((prev) => ({
                    ...prev,
                    player: { ...prev.player, own: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm">{t('filterOwnMoves')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.player.opponent}
                onChange={(e) =>
                  onFiltersChange((prev) => ({
                    ...prev,
                    player: { ...prev.player, opponent: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm">{t('filterOpponentMoves')}</span>
            </label>
          </div>
        </div>

        {/* Evaluation Filter - only show if any move has evaluation */}
        {hasAnyEvaluation && (
          <div>
            <h3 className="font-semibold mb-3 text-sm">{t('filterEvaluation')}</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.evaluation.best}
                  onChange={(e) =>
                    onFiltersChange((prev) => ({
                      ...prev,
                      evaluation: { ...prev.evaluation, best: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
                    <FaStar className="w-2 h-2 text-white" />
                  </span>
                  {t('evalBest')}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.evaluation.good}
                  onChange={(e) =>
                    onFiltersChange((prev) => ({
                      ...prev,
                      evaluation: { ...prev.evaluation, good: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
                    <FaCheck className="w-2 h-2 text-white" />
                  </span>
                  {t('evalGood')}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.evaluation.inaccuracy}
                  onChange={(e) =>
                    onFiltersChange((prev) => ({
                      ...prev,
                      evaluation: { ...prev.evaluation, inaccuracy: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500 text-white text-[10px] font-bold">
                    ?!
                  </span>
                  {t('evalInaccuracy')}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.evaluation.mistake}
                  onChange={(e) =>
                    onFiltersChange((prev) => ({
                      ...prev,
                      evaluation: { ...prev.evaluation, mistake: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                    ?
                  </span>
                  {t('evalMistake')}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.evaluation.blunder}
                  onChange={(e) =>
                    onFiltersChange((prev) => ({
                      ...prev,
                      evaluation: { ...prev.evaluation, blunder: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    ??
                  </span>
                  {t('evalBlunder')}
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={onReset} className="flex-1">
            {t('resetFilters')}
          </Button>
          <Button variant="primary" onClick={onClose} className="flex-1">
            {t('applyFilters')}
          </Button>
        </div>
      </div>
    </InfoModal>
  );
}
