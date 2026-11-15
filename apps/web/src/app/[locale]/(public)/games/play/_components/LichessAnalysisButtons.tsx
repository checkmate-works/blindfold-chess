'use client';

import { useId } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaExternalLinkAlt } from 'react-icons/fa';

import type { LichessAnalysisUrls } from '../_lib/lichess-analysis-urls';

/**
 * The moves panels' "Analyze on Lichess" pair: one link opens only the shown
 * position (a snapshot to analyse in isolation), the other the moves so far,
 * opened at the shown position (to step back and forth through the game).
 *
 * The panels are a narrow sidebar column on desktop, so the shared "Analyze on
 * Lichess" caption carries the destination and the two side-by-side links say
 * only what they send; each link's title spells out the difference.
 *
 * Real links rather than `window.open` buttons, so they can be
 * middle-clicked, long-pressed, or have their URL copied.
 */
export function LichessAnalysisButtons({ urls }: { urls: LichessAnalysisUrls }) {
  const t = useTranslations('play');
  const captionId = useId();

  const links = [
    {
      key: 'position',
      href: urls.position,
      label: t('lichessAnalysis.position'),
      hint: t('lichessAnalysis.positionHint'),
    },
    {
      key: 'game',
      href: urls.game,
      label: t('lichessAnalysis.game'),
      hint: t('lichessAnalysis.gameHint'),
    },
  ];

  return (
    <div role="group" aria-labelledby={captionId} className="flex flex-col gap-2">
      <span id={captionId} className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <FaExternalLinkAlt className="w-3 h-3" aria-hidden />
        {t('analyzeOnLichess')}
      </span>
      <div className="grid grid-cols-2 gap-2">
        {links.map(({ key, href, label, hint }) => (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" title={hint}>
            <Button asChild variant="secondary" className="px-2">
              {label}
            </Button>
          </a>
        ))}
      </div>
    </div>
  );
}
