'use client';

import { useEffect, useId, useState } from 'react';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BELT_COLOR_HEX } from '@/lib/db/data/ranks';
import type { GrantedRank } from '@/lib/db/data/ranks';

import { Modal } from '@/app/[locale]/_components/Modal';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

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
  // a 1dan-grade game satisfies 1kyu's looser bar too, so both are granted
  // together). Headline the highest one; skip-grants make multi-rank passes
  // routine enough that calling out the rest is no longer worth the noise —
  // /ranks shows the full achieved set.
  const rank = grantedRanks.reduce((highest, r) => (r.level > highest.level ? r : highest));
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

        {/* Rank name — also the modal's accessible description: the name
            achieved IS the description, so no separate "you earned a new
            rank" line is needed. */}
        <p id={descId} className="mt-3 text-2xl font-bold text-foreground">
          {t(`rankNames.${rank.slug}`)}
        </p>

        {/* CTA: Link to ranks page */}
        <div className="mt-6 flex flex-col gap-3">
          <Link href={`/${locale}/dojo/ranks`} className="block w-full">
            <Button asChild variant="primary" size="lg" fullWidth>
              {t('viewRanks')}
            </Button>
          </Link>
          <button onClick={() => setIsOpen(false)} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
            {t('close')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
