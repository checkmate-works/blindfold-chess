'use client';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaListOl, FaRedo } from 'react-icons/fa';

import type { MoveLogEntry, RecallStats } from '../_lib';
import { RecallMoveLogTable } from './RecallMoveLogTable';

type Props = {
  stats: RecallStats;
  /** Full move log — the table filters it to the incorrect / skipped rows. */
  entries: MoveLogEntry[];
  /** Open the position-preview modal at a stumbled move. */
  onEntryClick: (entry: MoveLogEntry) => void;
  /** Restart the review from the beginning. */
  onRestart: () => void;
  /** Saved game id, for the "back to result" link. */
  gameId?: string;
};

/**
 * The recall completion screen: a recall report (score + breakdown), a
 * clickable review of the moves the user stumbled on, and next-step actions.
 * Replaces the old "Game Review Completed!" message + hidden log link.
 */
export function RecallSummary({ stats, entries, onEntryClick, onRestart, gameId }: Props) {
  const t = useTranslations('recall');

  const hasStats = stats.total > 0;
  const ratePercent = Math.round(stats.recallRate * 100);

  // Headline tier. Low-recall runs get no encouraging headline (the bare score
  // speaks for itself) — `null` renders no heading rather than a platitude.
  const tier =
    stats.recalled === stats.total && stats.struggled === 0 && stats.mistakes === 0
      ? 'perfect'
      : stats.missed === 0
        ? 'allRecalled'
        : stats.recallRate >= 0.8
          ? 'good'
          : null;

  const headline = hasStats ? (tier ? t(`summary.headline.${tier}`) : null) : t('completed');

  return (
    <div className="flex flex-col gap-6">
      {/* Recall report */}
      <div className="flex flex-col items-center gap-3 text-center">
        {headline && <h3 className="text-xl font-bold">{headline}</h3>}

        {hasStats && (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums">{ratePercent}%</span>
              <span className="text-sm text-muted-foreground">
                {t('summary.scoreLine', { recalled: stats.recalled, total: stats.total })}
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-sm text-success">
                {t('summary.nailed')} {stats.nailed}
              </span>
              {stats.struggled > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-sm text-warning">
                  {t('summary.struggled')} {stats.struggled}
                </span>
              )}
              {stats.missed > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-sm text-destructive">
                  {t('summary.missed')} {stats.missed}
                </span>
              )}
            </div>

            {stats.mistakes > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('summary.mistakes', { count: stats.mistakes })}
              </p>
            )}
          </>
        )}
      </div>

      {/* Stumbled-here review */}
      {stats.struggled + stats.missed > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <FaListOl className="w-4 h-4 text-muted-foreground" />
              {t('summary.reviewTitle')}
            </h4>
            <span className="text-xs text-muted-foreground">{t('summary.reviewHint')}</span>
          </div>
          <RecallMoveLogTable entries={entries} onEntryClick={onEntryClick} />
        </div>
      )}

      {/* Next actions — full-width, stacked (matches the result screen). */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <Button
          variant="primary"
          size="lg"
          onClick={onRestart}
          icon={<FaRedo className="w-5 h-5" />}
          className="w-full rounded-xl font-medium"
        >
          {t('summary.restart')}
        </Button>
        <Link
          href={gameId ? `/games/play/result?gameId=${gameId}` : '/practice/recall'}
          className="w-full"
        >
          <Button asChild variant="secondary" size="lg" className="w-full rounded-xl font-medium">
            {gameId ? t('summary.backToResult') : t('summary.startNew')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
