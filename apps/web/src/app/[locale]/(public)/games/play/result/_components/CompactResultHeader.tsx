'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import {
  RESULT_LABEL_KEY,
  ResultIcon,
} from '@/app/[locale]/(public)/games/play/_lib/result-visuals';

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
      <ResultIcon result={result} className="h-5 w-5" />
      <span className="text-lg font-bold">{t(RESULT_LABEL_KEY[result])}</span>
    </div>
  );
}
