'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { StatsCard } from './StatsCard';

type DashboardStatsSectionProps = {
  bestScore: number | null;
  avgCompletionScore: number | null;
  bestScoreComparison: number | null;
  avgScoreComparison: number | null;
  comparisonLabel: string;
};

export function DashboardStatsSection({
  bestScore,
  avgCompletionScore,
  bestScoreComparison,
  avgScoreComparison,
  comparisonLabel,
}: DashboardStatsSectionProps) {
  const t = useTranslations('Mypage');

  return (
    <div className="grid grid-cols-2 gap-4">
      <StatsCard
        label={t('bestScore')}
        value={bestScore !== null ? bestScore.toString() : '-'}
        comparison={{ change: bestScoreComparison, label: comparisonLabel }}
      />
      <StatsCard
        label={t('avgScore')}
        value={avgCompletionScore !== null ? avgCompletionScore.toFixed(1) : '-'}
        comparison={{ change: avgScoreComparison, label: comparisonLabel, fractionDigits: 1 }}
      />
    </div>
  );
}
