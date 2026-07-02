'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaMinus, FaTimes, FaTrophy } from 'react-icons/fa';

type Props = {
  result: 'win' | 'loss' | 'draw';
};

/**
 * Compact win / loss / draw label for the result screen, shown at the top of
 * the Game Stats block (not above the board — that read as too prominent and
 * had no counterpart on the shared game review). A small left-aligned icon +
 * label that sits consistently within the stats section. First-person wording,
 * so it is only used on the player's own result screen, never on shared/[id].
 */
export function CompactResultHeader({ result }: Props) {
  const t = useTranslations('play');

  return (
    <div className="flex items-center gap-2">
      {result === 'win' && <FaTrophy className="h-5 w-5 text-primary" />}
      {result === 'loss' && <FaTimes className="h-5 w-5 text-destructive" />}
      {result === 'draw' && <FaMinus className="h-5 w-5 text-warning" />}
      <span className="text-lg font-bold">
        {result === 'win' ? t('youWin') : result === 'loss' ? t('youLose') : t('draw')}
      </span>
    </div>
  );
}
