'use client';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaListOl, FaRedo } from 'react-icons/fa';

import type { GamePlaySettings, PlaySettingsChangeEntry } from '@/lib/games/saved-game-types';

import { PlaySettingsChangeLog } from '@/app/[locale]/(public)/games/play/result/_components/PlaySettingsChangeLog';
import { ScoreRateHeading } from '@/app/[locale]/(public)/practice/_components/ScoreRateHeading';
import { SegmentedProgressBar } from '@/app/[locale]/(public)/practice/_components/SegmentedProgressBar';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';

import type { MoveLogEntry, RecallStats } from '../_lib';
import { RecallMoveStrip } from './RecallMoveStrip';

type Props = {
  stats: RecallStats;
  /** Full move log — RecallMoveStrip derives its per-move markers from this. */
  entries: MoveLogEntry[];
  /** Jump the board to a move's position. */
  onEntryClick: (entry: MoveLogEntry) => void;
  /** Restart the review from the beginning. */
  onRestart: () => void;
  /** Saved game id, for the "back to result" link. */
  gameId?: string;
  /**
   * Start-of-session snapshot of the display-relevant settings, and the
   * mid-session edits on top of it — feeds the Change Log, matching
   * games/play/result's. Null until useRecallPreferences has seeded (always
   * non-null by the time this renders, since completion implies the session
   * — and therefore the seed — has already happened).
   */
  initialPlaySettings: GamePlaySettings | null;
  preferenceChangeLog: PlaySettingsChangeEntry[];
  /** The position the game started from — feeds the Change Log's move-number badges. */
  startingFen?: string;
  /** Jump the board to a Change Log entry's position (moves[] index, or -2 for the initial board). */
  onSelectMove: (movesIndex: number) => void;
};

/**
 * The recall completion screen: a recall report (score + breakdown), a
 * clickable review of the moves the user stumbled on, and next-step actions.
 * Replaces the old "Game Review Completed!" message + hidden log link.
 */
export function RecallSummary({
  stats,
  entries,
  onEntryClick,
  onRestart,
  gameId,
  initialPlaySettings,
  preferenceChangeLog,
  startingFen,
  onSelectMove,
}: Props) {
  const t = useTranslations('recall');

  const hasStats = stats.total > 0;
  const ratePercent = (stats.recallRate * 100).toFixed(1);

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>{t('summary.title')}</SectionTitle>

      {/* Recall report */}
      <div className="flex flex-col items-center gap-3 text-center">
        {!hasStats && <h3 className="text-xl font-bold">{t('completed')}</h3>}

        {hasStats && (
          <>
            <ScoreRateHeading>
              {t('summary.rateLabel')}: {ratePercent}% ({stats.recalled}/{stats.total})
            </ScoreRateHeading>

            <SegmentedProgressBar
              segments={[
                {
                  key: 'nailed',
                  value: stats.nailed,
                  color: 'bg-success',
                  label: t('summary.nailed'),
                },
                {
                  key: 'struggled',
                  value: stats.struggled,
                  color: 'bg-warning',
                  label: t('summary.struggled'),
                },
                {
                  key: 'missed',
                  value: stats.missed,
                  color: 'bg-destructive',
                  label: t('summary.missed'),
                },
              ]}
              total={stats.total}
            />

            {stats.mistakes > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('summary.mistakes', { count: stats.mistakes })}
              </p>
            )}
          </>
        )}
      </div>

      {/* Per-move review — includes clean moves too, not just stumbles. */}
      {hasStats && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <FaListOl className="w-4 h-4 text-muted-foreground" />
              {t('summary.reviewTitle')}
            </h4>
            <span className="text-xs text-muted-foreground">{t('summary.reviewHint')}</span>
          </div>
          <RecallMoveStrip entries={entries} onEntryClick={onEntryClick} />
        </div>
      )}

      {/* Change Log — mid-session board/piece-display setting edits, same
          component and "Label: from → to" formatting as games/play/result.
          Renders nothing itself when there were no edits. */}
      {initialPlaySettings && (
        <PlaySettingsChangeLog
          playSettings={initialPlaySettings}
          playSettingsLog={preferenceChangeLog}
          startingFen={startingFen}
          onSelectMove={onSelectMove}
        />
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
