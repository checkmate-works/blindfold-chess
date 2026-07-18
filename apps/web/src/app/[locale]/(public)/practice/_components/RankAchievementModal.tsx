'use client';

import { useEffect, useId, useState } from 'react';

import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BELT_COLOR_HEX } from '@/lib/db/data/ranks';
import type { GrantedRank } from '@/lib/db/data/ranks';

import { Modal } from '@/app/[locale]/_components/Modal';

import { takeGrantedRanks } from '../_lib/granted-ranks-stash';

type Props = {
  locale: string;
};

export function RankAchievementModal({ locale }: Props) {
  const [grantedRanks, setGrantedRanks] = useState<GrantedRank[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('rankAchievement');
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const stashed = takeGrantedRanks();
    if (stashed.length > 0) {
      setGrantedRanks(stashed);
      setIsOpen(true);
    }
  }, []);

  if (!isOpen || grantedRanks.length === 0) return null;

  // `grantedRanks` arrives in the level-ascending order checkAndGrantRanks
  // pushed them in — a single trigger can clear several ranks at once (e.g.
  // a game published long ago already met a higher rank's bar, so reaching
  // a lower rank in the same pass cascades straight through it). Headline
  // the highest one; the rest get a small "also cleared" mention below
  // rather than vanishing silently.
  const rank = grantedRanks.reduce((highest, r) => (r.level > highest.level ? r : highest));
  const otherRanks = grantedRanks.filter((r) => r.slug !== rank.slug);
  const beltColor = BELT_COLOR_HEX[rank.color ?? ''] ?? '#6b7280';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      maxWidth="max-w-sm"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className="p-6 text-center">
        {/* Celebration emoji/icon */}
        <div className="text-4xl">🎉</div>

        {/* Title */}
        <h2 id={titleId} className="mt-3 text-xl font-bold text-foreground">
          {t('title')}
        </h2>

        {/* Belt color bar */}
        <div
          className="mx-auto mt-4 h-3 w-32 rounded-full"
          style={{ backgroundColor: beltColor }}
        />

        {/* Rank name */}
        <p className="mt-3 text-2xl font-bold text-foreground">{t(`rankNames.${rank.slug}`)}</p>

        {/* Description */}
        <p id={descId} className="mt-2 text-sm text-muted-foreground">
          {t('description')}
        </p>

        {/* Lower ranks cleared in the same pass — small and muted, secondary to the headline rank */}
        {otherRanks.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground/70">
            {t('alsoCleared', {
              ranks: otherRanks
                .map((r) => t(`rankNames.${r.slug}`))
                .join(locale === 'ja' ? '・' : ', '),
            })}
          </p>
        )}

        {/* CTA: Link to ranks page */}
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={`/${locale}/ranks`}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('viewRanks')}
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
